"""Focused orchestration checks; real SQL evidence comes only from the live matrix."""

import json
import os
import subprocess
import time
from pathlib import Path
from unittest.mock import Mock

import pytest
import run_disposable_security as runner


def fixture(tmp_path: Path) -> runner.AuthenticatedNativeDatabase:
    database = runner.AuthenticatedNativeDatabase(tmp_path / "tools")
    database.root = tmp_path / "owned cluster with spaces"
    database.root.mkdir()
    database.temp_parent = tmp_path.resolve()
    (database.root / "owner.json").write_text(
        json.dumps({"token": database.token}), encoding="utf-8",
    )
    database.data = database.root / "data"
    database.data.mkdir()
    database.port = 65432
    return database


@pytest.mark.skipif(os.name != "nt", reason="native Windows ACL APIs")
def test_exact_private_acl_is_read_back_for_directory_with_spaces(tmp_path: Path) -> None:
    root = tmp_path / "private owned directory with spaces"
    root.mkdir()
    # This exercises real DACL replacement and native readback, not a mocked ACL.
    runner.private_directory_acl(root)
    (root / "synthetic-password-file").write_text("synthetic fixture only", encoding="ascii")
    assert root.is_dir() and not root.is_junction()


@pytest.mark.parametrize(("field", "label"), [
    ("directory", "data directory"), ("port", "port"), ("address", "another field (address)"),
    ("started", "start time"), ("run", "another field (run marker)"),
    ("role", "another field (role)"),
])
def test_authenticated_identity_mismatch_never_confirms_or_stops(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, field: str, label: str,
) -> None:
    database = fixture(tmp_path)
    monkeypatch.setattr(database, "process_metadata", lambda: 100)
    identity = {"directory": str(database.data), "port": 65432, "address": "127.0.0.1",
                "started": 100, "run": database.token, "listen": "127.0.0.1", "sockets": "",
                "role": "postgres", "database": "postgres"}
    identity[field] = "synthetic-sensitive-marker"
    monkeypatch.setattr(database, "run", lambda *args: json.dumps(identity))
    with pytest.raises(runner.VerificationFailure, match="identity mismatch") as captured:
        database.confirm_identity()
    assert label in str(captured.value)
    assert "synthetic-sensitive-marker" not in str(captured.value)
    assert str(tmp_path) not in str(captured.value) and database.token not in str(captured.value)
    assert not database.ownership_confirmed and database.server_started is None


def test_adjacent_start_second_is_not_accepted_as_harmless(tmp_path: Path) -> None:
    database = fixture(tmp_path)
    assert database.identity_comparisons({"started": 101}, 100)["start time"] is False
    assert not database.ownership_confirmed


def test_address_query_uses_host_format_and_guard_keeps_exact_inet(tmp_path: Path) -> None:
    database = fixture(tmp_path)
    query = database.identity_query()
    assert "'address', host(inet_server_addr())" in query
    assert "inet_server_addr()::text" not in query
    database.server_started = 100
    database.ownership_confirmed = True
    assert "inet_server_addr() IS DISTINCT FROM '127.0.0.1'::inet" in database.guard()


@pytest.mark.parametrize("address", [
    "127.0.0.1", "127.0.0.1/32", "::1", "::ffff:127.0.0.1", "127.0.0.2",
    "0.0.0.0", "192.0.2.1", "127.0.0.1 ", "localhost", "", None,
])
def test_address_comparison_remains_exact_ipv4_loopback(
    tmp_path: Path, address: str | None,
) -> None:
    database = fixture(tmp_path)
    matches = database.identity_comparisons({"address": address}, 100)
    assert matches["another field (address)"] is (address == "127.0.0.1")
    assert not database.ownership_confirmed


def test_matching_authenticated_identity_confirms_and_rechecks_process(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    database = fixture(tmp_path)
    metadata = Mock(return_value=100)
    monkeypatch.setattr(database, "process_metadata", metadata)
    identity = {"directory": str(database.data), "port": 65432, "address": "127.0.0.1",
                "started": 100, "run": database.token, "listen": "127.0.0.1", "sockets": "",
                "role": "postgres", "database": "postgres"}
    monkeypatch.setattr(database, "run", lambda *args: json.dumps(identity))
    database.confirm_identity()
    assert database.ownership_confirmed and metadata.call_count == 2
    assert "pg_postmaster_start_time" in database.guard()


def test_uncertain_running_server_is_retained_without_stop(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    database = fixture(tmp_path)
    process = Mock()
    process.poll.return_value = None
    database.process = process
    failure = Mock(side_effect=runner.VerificationFailure("uncertain ownership"))
    monkeypatch.setattr(database, "confirm_identity", failure)
    run = Mock(side_effect=AssertionError("must not signal or query an unverified server"))
    monkeypatch.setattr(database, "run", run)
    with pytest.raises(runner.VerificationFailure, match="uncertain ownership"):
        database.cleanup()
    run.assert_not_called()
    process.kill.assert_not_called()
    assert database.root is not None and database.root.exists()


def test_exited_unverified_process_retains_startup_evidence(tmp_path: Path) -> None:
    database = fixture(tmp_path)
    process = Mock()
    process.poll.return_value = 1
    database.process = process
    with pytest.raises(runner.VerificationFailure, match="failed startup"):
        database.cleanup()
    assert database.root is not None and database.root.exists()
    process.kill.assert_not_called()


def test_private_startup_evidence_retained_without_cleartext_password(tmp_path: Path) -> None:
    database = fixture(tmp_path)
    assert database.root is not None
    password = database.root / "initial-password"
    password.write_text("synthetic disposable password", encoding="ascii")
    evidence = database.root / "initdb-output.txt"
    evidence.write_text("synthetic restricted-token failure", encoding="ascii")
    database.preserve_startup_evidence = True
    database.cleanup()
    assert not password.exists()
    assert database.admin_password == database.runtime_password == ""
    assert evidence.is_file() and (database.root / "owner.json").is_file()


def test_prestart_cleanup_does_not_claim_server_shutdown(
    tmp_path: Path, capsys: pytest.CaptureFixture[str],
) -> None:
    database = fixture(tmp_path)
    assert database.root is not None
    root = database.root
    database.cleanup()
    output = capsys.readouterr().out
    assert not root.exists() and "no server was launched" in output
    assert "postmaster stopped" not in output


def test_interrupted_launch_without_handle_retains_resources(tmp_path: Path) -> None:
    database = fixture(tmp_path)
    database.launch_attempted = True
    with pytest.raises(runner.VerificationFailure, match="launch interrupted"):
        database.cleanup()
    assert database.root is not None and database.root.exists()


@pytest.mark.skipif(os.name != "nt", reason="native Windows initialization")
def test_initializer_timeout_retains_evidence_and_removes_password(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    database = fixture(tmp_path)
    monkeypatch.setattr(database, "private_root", lambda: None)
    monkeypatch.setattr(database, "run", Mock(side_effect=subprocess.TimeoutExpired("fixture", 1)))
    with pytest.raises(subprocess.TimeoutExpired):
        database.start()
    assert database.preserve_startup_evidence and database.process is None
    assert database.root is not None and not (database.root / "initial-password").exists()
    database.cleanup()
    assert database.root.exists()


def test_live_process_identity_change_during_confirmation_is_rejected(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    database = fixture(tmp_path)
    metadata = Mock(side_effect=[100, 101])
    monkeypatch.setattr(database, "process_metadata", metadata)
    identity = {"directory": str(database.data), "port": 65432, "address": "127.0.0.1",
                "started": 100, "run": database.token, "listen": "127.0.0.1", "sockets": "",
                "role": "postgres", "database": "postgres"}
    monkeypatch.setattr(database, "run", lambda *args: json.dumps(identity))
    with pytest.raises(runner.VerificationFailure, match="process identity changed"):
        database.confirm_identity()
    assert not database.ownership_confirmed


def test_credentials_never_appear_in_client_arguments_and_are_per_run(tmp_path: Path) -> None:
    first = runner.AuthenticatedNativeDatabase(tmp_path)
    second = runner.AuthenticatedNativeDatabase(tmp_path)
    first.port = 65432
    arguments = first.client_command("postgres")
    assert first.admin_password not in " ".join(arguments)
    assert first.runtime_password not in " ".join(arguments)
    assert first.admin_password != second.admin_password
    assert first.runtime_password != first.admin_password
    assert "PGPASSWORD" not in first.environment
    assert first.environment["PGREQUIREAUTH"] == "scram-sha-256"


def test_runtime_password_setup_is_stdin_only(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    database = fixture(tmp_path)
    sql = Mock(return_value="")
    monkeypatch.setattr(database, "sql", sql)
    database.prepare_runtime()
    assert sql.call_args.args[0] == "postgres"
    assert database.runtime_password in sql.call_args.args[2]
    assert "ALTER ROLE fitsocial_runtime PASSWORD" in sql.call_args.args[2]


@pytest.mark.parametrize("exited", [False, True])
def test_stale_pid_time_or_exited_handle_prevents_sql(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, exited: bool,
) -> None:
    database = fixture(tmp_path)
    database.launched_at = time.time()
    process = Mock(pid=12345)
    process.poll.return_value = 0 if exited else None
    database.process = process
    assert database.data is not None
    (database.data / "postmaster.pid").write_text(
        f"12345\n{database.data}\n1\n65432\n\n127.0.0.1\n\nready\n", encoding="utf-8",
    )
    run = Mock(side_effect=AssertionError("No SQL before process identity"))
    monkeypatch.setattr(database, "run", run)
    with pytest.raises(runner.VerificationFailure, match="not running|stale"):
        database.confirm_identity()
    run.assert_not_called()


def test_successful_cleanup_requires_confirmation_and_stops_only_owned_cluster(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    database = fixture(tmp_path)
    assert database.root is not None and database.data is not None
    root, data = database.root, database.data
    process = Mock()
    process.poll.return_value = None
    database.process = process
    (data / "postmaster.pid").write_text("synthetic metadata", encoding="ascii")
    sibling = tmp_path / "unrelated"
    sibling.mkdir()
    confirm = Mock()
    monkeypatch.setattr(database, "confirm_identity", confirm)

    def stop(command: list[str], stage: str, sql: str | None = None) -> str:
        assert stage == "stop authenticated owned postmaster" and sql is None
        confirm.assert_called_once()
        assert command[command.index("-D") + 1] == str(data) and command[-1] == "stop"
        (data / "postmaster.pid").unlink()
        process.poll.return_value = 0
        return ""

    monkeypatch.setattr(database, "run", stop)
    database.cleanup()
    assert not root.exists() and sibling.exists()
    process.kill.assert_not_called()
