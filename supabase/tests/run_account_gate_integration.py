"""Real gate evidence only against a newly created, owned disposable native cluster.

No DSN/existing directory argument, environment opt-in, or retained-server adoption.
"""

import argparse
import asyncio
import sys
from pathlib import Path
from time import time
from typing import Any
from uuid import UUID

from run_disposable_security import (
    A,
    AuthenticatedNativeDatabase,
    B,
    VerificationFailure,
    verify_matrix,
)

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

from fastapi import HTTPException  # noqa: E402
from psycopg import AsyncConnection  # noqa: E402
from psycopg.conninfo import make_conninfo  # noqa: E402
from pydantic import SecretStr  # noqa: E402

from app.core.account_transaction import AccountSessionGate  # noqa: E402
from app.core.token_validation import ProviderValidatedIdentity  # noqa: E402

SESSION = "10000000-0000-4000-8000-000000000001"


def identity(subject: str = A, session: str = SESSION) -> ProviderValidatedIdentity:
    return ProviderValidatedIdentity(UUID(subject), UUID(session), time() - 1, time() + 300)


async def verify_gate(database: AuthenticatedNativeDatabase) -> None:
    database.confirm_identity()
    url = SecretStr(make_conninfo(
        host="127.0.0.1", hostaddr="127.0.0.1", port=database.port, dbname="postgres",
        user="fitsocial_runtime", password=database.runtime_password,
        sslmode="disable", gssencmode="disable", require_auth="scram-sha-256",
    ))
    gate = AccountSessionGate(url)

    async def read_actor(subject: str) -> int:
        async with gate.transaction(identity(subject)) as scope:
            settings = await scope.read(
                "SELECT current_setting('transaction_read_only'), "
                "current_setting('transaction_isolation')",
            )
            assert settings == [("on", "read committed")]
            bound = await scope.read("SELECT %s::text", ("synthetic'; SELECT 1; --",))
            assert bound == [("synthetic'; SELECT 1; --",)]
            rows = await scope.read("SELECT id FROM app_private.app_accounts")
            assert rows == [(UUID(subject),)]
            pid = await scope.read("SELECT pg_backend_pid()")
            # Instrumentation only: the production scope exposes no raw connection.
            connection = scope._connection
        assert connection.closed
        try:
            await scope.read("SELECT 1")
        except HTTPException as error:
            assert error.status_code == 503
        else:
            raise AssertionError("expired scope accepted")
        return int(pid[0][0])

    first, second = await asyncio.gather(read_actor(A), read_actor(B))
    assert first != second
    print("PASS: real Psycopg runtime gate, bound A/B isolation and closed scopes")

    denied = [identity("00000000-0000-4000-8000-00000000000" + str(n)) for n in (3, 4, 5, 6)]
    denied.extend(identity(A, "10000000-0000-4000-8000-00000000000" + str(n)) for n in (2, 3, 4))
    for actor in denied:
        try:
            async with gate.transaction(actor):
                raise AssertionError("denied actor yielded")
        except HTTPException as error:
            assert error.status_code == 401
    print("PASS: missing/inactive accounts and revoked/expired/mismatched revocations deny")

    admin_url = SecretStr(make_conninfo(
        host="127.0.0.1", hostaddr="127.0.0.1", port=database.port, dbname="postgres",
        user="postgres", password=database.admin_password,
        sslmode="disable", gssencmode="disable", require_auth="scram-sha-256",
    ))
    try:
        async with AccountSessionGate(admin_url).transaction(identity()):
            raise AssertionError("privileged login entered gate")
    except HTTPException as error:
        assert error.status_code == 503
    print("PASS: real privileged login is rejected before actor/protected queries")

    try:
        async with gate.transaction(identity()) as scope:
            connection = scope._connection
            await scope.read("SELECT 1 / 0")
    except HTTPException as error:
        assert error.status_code == 503 and connection.closed
    else:
        raise AssertionError("SQL error accepted")
    await read_actor(B)

    try:
        async with gate.transaction(identity()) as scope:
            connection = scope._connection
            await scope.read("SELECT pg_sleep(5)")
    except HTTPException as error:
        assert error.status_code == 503 and connection.closed
    else:
        raise AssertionError("statement timeout accepted")

    entered = asyncio.Event()

    async def cancel_work() -> None:
        async with gate.transaction(identity()) as scope:
            connection = scope._connection
            try:
                entered.set()
                await scope.read("SELECT pg_sleep(2)")
            finally:
                # Outer gate closes after the scope unwinds; tested below via task.
                cancelled_connections.append(connection)

    cancelled_connections: list[AsyncConnection[Any]] = []
    task = asyncio.create_task(cancel_work())
    await asyncio.wait_for(entered.wait(), timeout=5)
    await asyncio.sleep(0.05)
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    assert cancelled_connections and all(conn.closed for conn in cancelled_connections)
    await read_actor(A)
    print("PASS: real SQL failure/cancellation abort, close and next-request isolation")

    async with gate.transaction(identity()) as scope:
        await scope.read("SELECT 1")
        database.sql("postgres", "gate synthetic committed revocation", """
            INSERT INTO app_private.revoked_sessions
            (session_id, account_id, token_expires_at) VALUES
            ('10000000-0000-4000-8000-000000000001',
             '00000000-0000-4000-8000-000000000001', now() + interval '1 hour');
        """)
        try:
            await scope.read("SELECT 1")
        except HTTPException as error:
            assert error.status_code == 401
        else:
            raise AssertionError("same-transaction committed revocation accepted")
    try:
        async with gate.transaction(identity()):
            raise AssertionError("committed revocation accepted")
    except HTTPException as error:
        assert error.status_code == 401
    print("PASS: gate observes committed revocation in ongoing and fresh transactions")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pg-bin", type=Path, required=True)
    options = parser.parse_args()
    database = AuthenticatedNativeDatabase(options.pg_bin)
    try:
        database.check()
        try:
            database.start()
            verify_matrix(database, database.prepare_runtime)
            with asyncio.Runner(loop_factory=asyncio.SelectorEventLoop) as loop:
                loop.run(verify_gate(database))
        finally:
            database.cleanup()
        print("PASS: disposable account/session gate integration; hosted checks remain separate")
        return 0
    except VerificationFailure as error:
        print(str(error))  # Existing runner contracts contain sanitized stage labels.
    except (Exception, KeyboardInterrupt):
        print("FAILED: disposable gate integration; raw details withheld")
    return 2


if __name__ == "__main__":
    sys.exit(main())
