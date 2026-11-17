"""Unwired, read-only account/session gate. No shared connections or implicit login."""

import asyncio
import json
import logging
import math
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from contextvars import ContextVar
from time import time
from typing import Annotated, Any, LiteralString
from uuid import UUID

import psycopg
from fastapi import Depends, HTTPException
from psycopg.pq import TransactionStatus
from pydantic import SecretStr

from app.core.bearer_auth import _unauthorized, bearer_authentication
from app.core.config import get_settings
from app.core.token_validation import ProviderValidatedIdentity

_driver_scope: ContextVar[bool] = ContextVar("protected_database_work", default=False)


class _DriverLogFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if _driver_scope.get():
            record.msg = "Protected database driver diagnostic withheld"
            record.args = ()
            record.exc_info = None
            record.exc_text = None
            record.stack_info = None
            record.pathname = "<withheld>"
            record.filename = "psycopg"
        return True


# Psycopg logs connection targets at DEBUG and cancellation failures at WARNING.
# Redact at the emitting logger, before any handlers. Context-local activation
# preserves unrelated work in other tasks and never changes global log levels.
logging.getLogger("psycopg").addFilter(_DriverLogFilter())

BASELINE = """SELECT current_user, session_user,
    current_setting('request.jwt.claims', true), pg_is_in_recovery(),
    r.rolsuper OR r.rolbypassrls OR r.rolcreatedb OR r.rolcreaterole
      OR r.rolreplication OR r.rolinherit,
    EXISTS (SELECT 1 FROM pg_catalog.pg_roles other
            WHERE other.oid <> r.oid AND pg_catalog.pg_has_role(r.oid, other.oid, 'MEMBER'))
    FROM pg_catalog.pg_roles r WHERE r.rolname = current_user"""


def unavailable() -> HTTPException:
    return HTTPException(status_code=503, detail="Protected access unavailable")


def valid_identity(identity: ProviderValidatedIdentity) -> bool:
    return (isinstance(identity, ProviderValidatedIdentity)
            and isinstance(identity.subject, UUID) and identity.subject.int != 0
            and isinstance(identity.session_id, UUID) and identity.session_id.int != 0
            and math.isfinite(identity.issued_at) and math.isfinite(identity.expires_at)
            and identity.issued_at <= time() < identity.expires_at)


async def check_actor(
    connection: psycopg.AsyncConnection[Any], identity: ProviderValidatedIdentity,
) -> None:
    if not valid_identity(identity):
        raise _unauthorized()
    account = await (await connection.execute(
        "SELECT status FROM app_private.app_accounts WHERE id = %s", (identity.subject,),
    )).fetchone()
    denied = await (await connection.execute(
        "SELECT app_private.session_is_denied(%s::uuid)", (identity.session_id,),
    )).fetchone()
    if account is None or account in (("deactivated",), ("suspended",), ("deleted",)):
        raise _unauthorized()
    if account != ("active",):
        raise unavailable()
    if denied is not None and len(denied) == 1 and denied[0] is True:
        raise _unauthorized()
    if denied is None or len(denied) != 1 or denied[0] is not False:
        raise unavailable()


class AccountTransaction:
    """Repository-only read scope; never pass SQL from an HTTP caller.

    Valid only inside the gate's owning task and lifetime. Resource-specific
    authorization remains a repository responsibility. No raw connection escapes.
    """

    def __init__(
        self, connection: psycopg.AsyncConnection[Any], identity: ProviderValidatedIdentity,
    ) -> None:
        self._connection = connection
        self._identity = identity
        self._owner = asyncio.current_task()
        self._active = True

    async def read(
        self, query: LiteralString, parameters: tuple[Any, ...] = (),
    ) -> list[tuple[Any, ...]]:
        if not self._active or asyncio.current_task() is not self._owner:
            raise unavailable()
        try:
            await check_actor(self._connection, self._identity)
            cursor = await self._connection.execute(query, parameters)
            return list(await cursor.fetchall())
        except (psycopg.Error, OSError):
            self._active = False
            raise unavailable() from None
        except BaseException:
            self._active = False
            raise


class AccountSessionGate:
    """A fresh runtime connection per transaction; close rather than pool/reuse."""

    def __init__(self, database_url: SecretStr) -> None:
        self._url = database_url

    @asynccontextmanager
    async def transaction(
        self, identity: ProviderValidatedIdentity,
    ) -> AsyncIterator[AccountTransaction]:
        if not valid_identity(identity):
            raise _unauthorized()
        connection: psycopg.AsyncConnection[Any] | None = None
        log_scope = _driver_scope.set(True)
        try:
            if not self._url.get_secret_value():
                raise unavailable()
            async with asyncio.timeout(10):
                connection = await psycopg.AsyncConnection.connect(
                    self._url.get_secret_value(), autocommit=True, connect_timeout=3,
                    options="-c statement_timeout=3000 -c lock_timeout=1000 "
                    "-c idle_in_transaction_session_timeout=10000 -c search_path=pg_catalog",
                    prepare_threshold=None,
                )
                if connection.info.transaction_status != TransactionStatus.IDLE:
                    raise unavailable()
                baseline = await (await connection.execute(BASELINE)).fetchone()
                clean = ("fitsocial_runtime", "fitsocial_runtime", None, False, False, False)
                reset = ("fitsocial_runtime", "fitsocial_runtime", "", False, False, False)
                if baseline != clean:
                    # An empty GUC is PostgreSQL's reset baseline after SET LOCAL.
                    if baseline != reset:
                        raise unavailable()
                if not valid_identity(identity):
                    raise _unauthorized()
                await connection.execute("BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY")
                try:
                    await connection.execute(
                        "SELECT pg_catalog.set_config('request.jwt.claims', %s, true)",
                        (json.dumps({"sub": str(identity.subject)}, separators=(",", ":")),),
                    )
                    await check_actor(connection, identity)
                    scope = AccountTransaction(connection, identity)
                    try:
                        yield scope
                    finally:
                        scope._active = False
                except BaseException:
                    # Avoid transaction-context rollback logging of raw driver
                    # exceptions. Cleanup is bounded; repeated cancellation or a
                    # broken rollback still reaches synchronous connection close.
                    try:
                        async with asyncio.timeout(1):
                            await connection.rollback()
                    except BaseException:
                        pass
                    raise
                else:
                    await connection.commit()
        except (psycopg.Error, OSError, TimeoutError, ValueError):
            raise unavailable() from None
        finally:
            try:
                if connection is not None:
                    # Synchronous libpq close cannot be interrupted by repeated
                    # cancellation. Disconnect aborts uncommitted transactions;
                    # no connection is released to another borrower.
                    connection.pgconn.finish()
            finally:
                _driver_scope.reset(log_scope)


async def account_transaction(
    identity: Annotated[ProviderValidatedIdentity, Depends(bearer_authentication)],
) -> AsyncIterator[AccountTransaction]:
    """Optional FastAPI dependency; deliberately attached to no existing route."""
    try:
        url = get_settings().database_url
    except (ValueError, OSError, UnicodeError):
        raise unavailable() from None
    async with AccountSessionGate(url).transaction(identity) as transaction:
        yield transaction
