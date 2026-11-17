"""Driver mocks exercise gate orchestration; these are not RLS evidence."""

import asyncio
import json
import logging
from collections.abc import Iterator
from time import time
from typing import Annotated, Any
from unittest.mock import AsyncMock, Mock
from uuid import UUID

import psycopg
import pytest
from fastapi import Depends, FastAPI, HTTPException
from fastapi.testclient import TestClient
from psycopg.pq import TransactionStatus
from pydantic import SecretStr

import app.core.account_transaction as gate_module
from app.core.account_transaction import AccountSessionGate, AccountTransaction, account_transaction
from app.core.bearer_auth import BearerAuthentication, bearer_authentication
from app.core.token_validation import InvalidTokenError, ProviderValidatedIdentity

IDENTITY = ProviderValidatedIdentity(UUID(int=1), UUID(int=2), 1, time() + 3600)
BASELINE = ("fitsocial_runtime", "fitsocial_runtime", None, False, False, False)
SECRET = "synthetic-password private.invalid /private/evidence"


@pytest.fixture
def driver(monkeypatch: pytest.MonkeyPatch) -> Iterator[tuple[Mock, AsyncMock]]:
    connection = Mock()
    connection.info.transaction_status = TransactionStatus.IDLE
    transaction = Mock()
    transaction.__aenter__ = AsyncMock()
    transaction.__aexit__ = AsyncMock(return_value=False)
    connection.transaction.return_value = transaction
    connection.commit = AsyncMock()
    connection.rollback = AsyncMock()

    async def execute(query: str, parameters: object = None) -> AsyncMock:
        cursor = AsyncMock()
        if "pg_catalog.pg_roles r" in query:
            cursor.fetchone.return_value = BASELINE
        elif "SELECT status" in query:
            cursor.fetchone.return_value = ("active",)
        elif "session_is_denied" in query:
            cursor.fetchone.return_value = (False,)
        cursor.fetchall.return_value = [(IDENTITY.subject,)]
        return cursor

    connection.execute = AsyncMock(side_effect=execute)
    connect = AsyncMock(return_value=connection)
    monkeypatch.setattr(psycopg.AsyncConnection, "connect", connect)
    yield connection, connect


async def test_success_binds_only_validated_identity_and_closes(
    driver: tuple[Mock, AsyncMock],
) -> None:
    connection, connect = driver
    gate = AccountSessionGate(SecretStr(SECRET))
    async with gate.transaction(IDENTITY) as scope:
        assert await scope.read("SELECT id FROM app_private.app_accounts") == [(IDENTITY.subject,)]
    calls = connection.execute.call_args_list
    assert calls[1].args == ("BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY",)
    assert json.loads(calls[2].args[1][0]) == {"sub": str(IDENTITY.subject)}
    assert calls[3].args[1] == (IDENTITY.subject,)
    assert calls[4].args[1] == (IDENTITY.session_id,)
    assert str(IDENTITY.subject) not in calls[3].args[0]
    connect.assert_awaited_once()
    connection.pgconn.finish.assert_called_once()
    connection.commit.assert_awaited_once()
    with pytest.raises(HTTPException) as captured:
        await scope.read("SELECT 1")
    assert captured.value.status_code == 503


@pytest.mark.parametrize("identity", [
    None,
    ProviderValidatedIdentity(UUID(int=0), UUID(int=2), 1, time() + 3600),
    ProviderValidatedIdentity(UUID(int=1), UUID(int=0), 1, time() + 3600),
    ProviderValidatedIdentity(UUID(int=1), UUID(int=2), 1, 2),
    ProviderValidatedIdentity(UUID(int=1), UUID(int=2), 1, float("nan")),
])
async def test_missing_invalid_expired_identity_acquires_nothing(
    driver: tuple[Mock, AsyncMock], identity: Any,
) -> None:
    _, connect = driver
    with pytest.raises(HTTPException) as captured:
        async with AccountSessionGate(SecretStr(SECRET)).transaction(identity):
            pytest.fail("must not yield")
    assert captured.value.status_code == 401
    connect.assert_not_awaited()


@pytest.mark.parametrize(("field", "row", "code"), [
    ("status", None, 401), ("status", ("deleted",), 401),
    ("status", ("deactivated",), 401), ("status", ("suspended",), 401),
    ("denial", (True,), 401), ("denial", None, 503), ("denial", (None,), 503),
    ("denial", (0,), 503), ("denial", (1,), 503),
    ("baseline", ("postgres", "postgres", None, False, False, False), 503),
    ("baseline", ("fitsocial_runtime", "fitsocial_runtime", "dirty", False, False, False), 503),
    ("baseline", ("fitsocial_runtime", "fitsocial_runtime", None, True, False, False), 503),
    ("baseline", ("fitsocial_runtime", "fitsocial_runtime", None, False, True, False), 503),
    ("baseline", ("fitsocial_runtime", "fitsocial_runtime", None, False, False, True), 503),
])
async def test_gate_denials_do_not_yield_and_close(
    driver: tuple[Mock, AsyncMock], field: str, row: object, code: int,
) -> None:
    connection, _ = driver
    original = connection.execute.side_effect

    async def execute(query: str, parameters: object = None) -> AsyncMock:
        cursor = await original(query, parameters)
        if ((field == "status" and "SELECT status" in query)
            or (field == "denial" and "session_is_denied" in query)
            or (field == "baseline" and "pg_catalog.pg_roles r" in query)):
            cursor.fetchone.return_value = row
        return cursor  # type: ignore[no-any-return]

    connection.execute.side_effect = execute
    with pytest.raises(HTTPException) as captured:
        async with AccountSessionGate(SecretStr(SECRET)).transaction(IDENTITY):
            pytest.fail("must deny before protected work")
    assert captured.value.status_code == code
    connection.pgconn.finish.assert_called_once()


@pytest.mark.parametrize("error", [
    psycopg.OperationalError(SECRET), OSError(SECRET), TimeoutError(SECRET),
])
async def test_driver_failures_are_generic_and_closed(
    driver: tuple[Mock, AsyncMock], error: Exception, caplog: pytest.LogCaptureFixture,
) -> None:
    connection, _ = driver
    connection.execute.side_effect = error
    with pytest.raises(HTTPException) as captured:
        async with AccountSessionGate(SecretStr(SECRET)).transaction(IDENTITY):
            pytest.fail("must not yield")
    assert captured.value.status_code == 503
    assert captured.value.detail == "Protected access unavailable"
    assert captured.value.__suppress_context__
    assert SECRET not in caplog.text
    connection.pgconn.finish.assert_called_once()


async def test_scope_rejects_background_task_and_body_error_rolls_back(
    driver: tuple[Mock, AsyncMock],
) -> None:
    connection, _ = driver
    with pytest.raises(RuntimeError, match="consumer failure"):
        async with AccountSessionGate(SecretStr(SECRET)).transaction(IDENTITY) as scope:
            with pytest.raises(HTTPException):
                await asyncio.create_task(scope.read("SELECT 1"))
            raise RuntimeError("consumer failure")
    connection.rollback.assert_awaited_once()
    connection.pgconn.finish.assert_called_once()


async def test_cancellation_and_failed_rollback_still_close(driver: tuple[Mock, AsyncMock]) -> None:
    connection, _ = driver
    entered = asyncio.Event()

    async def work() -> None:
        async with AccountSessionGate(SecretStr(SECRET)).transaction(IDENTITY):
            entered.set()
            await asyncio.Event().wait()

    task = asyncio.create_task(work())
    await entered.wait()
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    connection.pgconn.finish.assert_called_once()
    connection.rollback.assert_awaited_once()


async def test_commit_failure_discards(driver: tuple[Mock, AsyncMock]) -> None:
    connection, _ = driver
    connection.commit.side_effect = psycopg.OperationalError(SECRET)
    with pytest.raises(HTTPException) as captured:
        async with AccountSessionGate(SecretStr(SECRET)).transaction(IDENTITY):
            pass
    assert captured.value.status_code == 503
    connection.pgconn.finish.assert_called_once()


async def test_expiry_after_acquisition_is_rechecked(driver: tuple[Mock, AsyncMock]) -> None:
    connection, _ = driver
    original = connection.execute.side_effect
    identity = ProviderValidatedIdentity(UUID(int=1), UUID(int=2), 1, time() + 0.01)

    async def delayed(query: str, parameters: object = None) -> AsyncMock:
        await asyncio.sleep(0.02)
        return await original(query, parameters)  # type: ignore[no-any-return]

    connection.execute.side_effect = delayed
    with pytest.raises(HTTPException) as captured:
        async with AccountSessionGate(SecretStr(SECRET)).transaction(identity):
            pytest.fail("expired during acquisition")
    assert captured.value.status_code == 401
    connection.transaction.assert_not_called()
    connection.pgconn.finish.assert_called_once()


async def test_rollback_failure_is_not_logged_and_connection_is_discarded(
    driver: tuple[Mock, AsyncMock], caplog: pytest.LogCaptureFixture,
) -> None:
    connection, _ = driver
    connection.rollback.side_effect = psycopg.OperationalError(SECRET)
    with pytest.raises(HTTPException):
        async with AccountSessionGate(SecretStr(SECRET)).transaction(IDENTITY) as scope:
            connection.execute.side_effect = psycopg.OperationalError(SECRET)
            await scope.read("SELECT 1")
    connection.pgconn.finish.assert_called_once()
    assert SECRET not in caplog.text


async def test_repeated_cancellation_during_rollback_cannot_prevent_close(
    driver: tuple[Mock, AsyncMock],
) -> None:
    connection, _ = driver
    entered, rolling_back = asyncio.Event(), asyncio.Event()

    async def blocked_rollback() -> None:
        rolling_back.set()
        await asyncio.Event().wait()

    connection.rollback.side_effect = blocked_rollback

    async def work() -> None:
        async with AccountSessionGate(SecretStr(SECRET)).transaction(IDENTITY):
            entered.set()
            await asyncio.Event().wait()

    task = asyncio.create_task(work())
    await entered.wait()
    task.cancel()
    await rolling_back.wait()
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    connection.pgconn.finish.assert_called_once()


@pytest.mark.parametrize("authorization", [None, "Basic forged", "Bearer a.b.c"])
def test_real_asgi_dependency_authenticates_before_connecting(
    driver: tuple[Mock, AsyncMock], monkeypatch: pytest.MonkeyPatch,
    authorization: str | None,
) -> None:
    connection, connect = driver

    class Validator:
        async def validate(self, token: str) -> ProviderValidatedIdentity:
            if token != "a.b.c":
                raise InvalidTokenError()
            return IDENTITY

    app = FastAPI()
    app.dependency_overrides[bearer_authentication] = BearerAuthentication(Validator())
    monkeypatch.setattr(gate_module, "get_settings", lambda: Mock(database_url=SecretStr(SECRET)))

    @app.get("/test-only")
    async def endpoint(
        scope: Annotated[AccountTransaction, Depends(account_transaction)],
    ) -> dict[str, bool]:
        await scope.read("SELECT id FROM app_private.app_accounts")
        return {"accepted": True}

    headers = {"x-user-id": "forged-subject", "x-session-id": "forged-session"}
    if authorization is not None:
        headers["Authorization"] = authorization
    with TestClient(app) as client:
        response = client.get(
            "/test-only?subject=forged-subject&session_id=forged", headers=headers,
        )
    assert SECRET not in response.text
    if authorization == "Bearer a.b.c":
        assert response.status_code == 200
        connect.assert_awaited_once()
        assert connection.execute.call_args_list[3].args[1] == (IDENTITY.subject,)
    else:
        assert response.status_code == 401
        connect.assert_not_awaited()


async def test_missing_configuration_acquires_nothing(driver: tuple[Mock, AsyncMock]) -> None:
    _, connect = driver
    with pytest.raises(HTTPException) as captured:
        async with AccountSessionGate(SecretStr("")).transaction(IDENTITY):
            pytest.fail("must not yield")
    assert captured.value.status_code == 503
    connect.assert_not_awaited()


async def test_connect_failure_is_generic(driver: tuple[Mock, AsyncMock]) -> None:
    _, connect = driver
    connect.side_effect = psycopg.OperationalError(SECRET)
    with pytest.raises(HTTPException) as captured:
        async with AccountSessionGate(SecretStr(SECRET)).transaction(IDENTITY):
            pytest.fail("must not yield")
    assert captured.value.status_code == 503
    assert SECRET not in str(captured.value)


async def test_nonidle_connection_is_closed_before_identity(driver: tuple[Mock, AsyncMock]) -> None:
    connection, _ = driver
    connection.info.transaction_status = TransactionStatus.INTRANS
    with pytest.raises(HTTPException):
        async with AccountSessionGate(SecretStr(SECRET)).transaction(IDENTITY):
            pytest.fail("must not yield")
    connection.execute.assert_not_awaited()
    connection.pgconn.finish.assert_called_once()


async def test_real_driver_logger_redacts_connect_and_cancel_details(
    driver: tuple[Mock, AsyncMock], caplog: pytest.LogCaptureFixture,
) -> None:
    connection, connect = driver
    caplog.set_level(logging.DEBUG, logger="psycopg")

    async def connecting(*args: object, **kwargs: object) -> Mock:
        logging.getLogger("psycopg").debug("connection attempt: %s", SECRET)
        return connection

    connect.side_effect = connecting
    async with AccountSessionGate(SecretStr(SECRET)).transaction(IDENTITY):
        try:
            raise psycopg.OperationalError(SECRET)
        except psycopg.Error:
            logging.getLogger("psycopg").warning(
                "query cancellation failed: %s", SECRET, exc_info=True,
            )
    assert SECRET not in caplog.text
    assert "diagnostic withheld" in caplog.text
    logging.getLogger("psycopg").debug("outside-scope-marker")
    assert "outside-scope-marker" in caplog.text
