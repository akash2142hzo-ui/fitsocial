"""Offline runner/Windows safety tests. These do NOT execute PostgreSQL or prove RLS."""

import ctypes
import json
import os
import socket
import sys
import tempfile
from pathlib import Path
from typing import Any
from unittest.mock import Mock

import pytest
import run_disposable_security as runner


def owned_fixture(tmp_path: Path) -> runner.NativeDatabase:
    native = runner.NativeDatabase(tmp_path / "tools")
    native.temp_parent = tmp_path.resolve()
    native.root = tmp_path / "fitsocial-045d-test"
    native.root.mkdir()
    (native.root / "owner.json").write_text(json.dumps({"token": native.token}), encoding="utf-8")
    native.data = native.root / "data"
    native.data.mkdir()
    native.port = 65432
    return native


def simulated_process(native: runner.NativeDatabase) -> Mock:
    process = Mock(pid=12345)
    process.poll.return_value = None
    native.process = process
    assert native.data is not None
    (native.data / "postmaster.pid").write_text(
        f"{process.pid}\n{native.data}\n1\n{native.port}\n", encoding="utf-8",
    )
    return process


def test_ambient_libpq_settings_are_removed(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("PGHOST", "PGPORT", "PGUSER", "PGDATABASE", "PGPASSWORD", "PGOPTIONS",
                 "PGSERVICE", "PGSERVICEFILE", "PGPASSFILE", "pgHost"):
        monkeypatch.setenv(name, "synthetic-private-setting")
    environment = runner.native_environment()
    assert "synthetic-private-setting" not in environment.values()
    assert environment["PGPASSFILE"] == os.devnull
    assert environment["PGSERVICEFILE"] == os.devnull
    assert environment["PGCONNECT_TIMEOUT"] == "3"


@pytest.mark.skipif(os.name != "nt", reason="Windows ownership API")
def test_windows_listener_inventory_reports_real_loopback_owner() -> None:
    # Real OS socket/PID evidence only, with no database or external connection.
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        listener.bind(("127.0.0.1", 0))
        listener.listen(1)
        assert runner.windows_listeners(listener.getsockname()[1]) == [("127.0.0.1", os.getpid())]


@pytest.mark.skipif(os.name != "nt", reason="Windows ctypes API")
@pytest.mark.parametrize("error", [5, 50])
def test_inventory_api_failure_preserves_exact_sanitized_status(
    monkeypatch: pytest.MonkeyPatch, error: int,
) -> None:
    api = Mock(return_value=error)
    monkeypatch.setattr(ctypes, "WinDLL", lambda name: Mock(GetExtendedTcpTable=api))
    with pytest.raises(runner.VerificationFailure, match=rf"sizing \(API={error}\)"):
        runner.windows_listeners(65432)


@pytest.mark.skipif(os.name != "nt", reason="Windows ctypes API")
@pytest.mark.parametrize(("state", "pid", "expected"), [
    (0, 12345, "API=0; state=0; owner_pid_present=True"),
    (2, 0, "owner PID is unavailable"),
    (2, 12345, "valid"),
])
def test_inventory_retries_buffer_growth_but_never_accepts_invalid_ownership(
    monkeypatch: pytest.MonkeyPatch, state: int, pid: int, expected: str,
) -> None:
    record = runner.TcpTable()
    record.count = 1
    record.rows[0].state = state
    record.rows[0].address = 16777343
    record.rows[0].port = socket.htons(65432)
    record.rows[0].pid = pid
    reads = 0

    def table(buffer: Any, size: Any, ordered: bool, family: int, kind: int, reserved: int) -> int:
        nonlocal reads
        ctypes.cast(size, ctypes.POINTER(ctypes.c_uint32))[0] = ctypes.sizeof(record)
        if buffer is None:
            return 122
        reads += 1
        if reads == 1:
            return 122  # Endpoint table grew between the size and read calls.
        ctypes.memmove(buffer, ctypes.byref(record), ctypes.sizeof(record))
        return 0

    api = Mock(side_effect=table)
    monkeypatch.setattr(ctypes, "WinDLL", lambda name: Mock(GetExtendedTcpTable=api))
    if expected == "valid":
        assert runner.windows_listeners(65432) == [("127.0.0.1", 12345)]
    else:
        with pytest.raises(runner.VerificationFailure) as captured:
            runner.windows_listeners(65432)
        assert expected in str(captured.value)
    assert reads == 2


def test_missing_tools_cli_does_not_create_resources(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(sys, "argv", ["runner", "--run", "--backend", "native", "--pg-bin",
                                    str(tmp_path / "synthetic-private-location")])
    create = Mock(side_effect=AssertionError("must not create resources"))
    monkeypatch.setattr(tempfile, "mkdtemp", create)
    assert runner.main() == 2
    assert "synthetic-private-location" not in capsys.readouterr().out
    create.assert_not_called()


@pytest.mark.skipif(os.name != "nt", reason="native version check requires Windows")
@pytest.mark.parametrize("versions", [("17.1", "17.1", "17.1", "18.1"),
                                      ("17.1", "17.1", "17.1", "17.2")])
def test_version_mismatch_rejected_without_start(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, versions: tuple[str, ...],
) -> None:
    for name in ("postgres", "initdb", "pg_ctl", "psql"):
        (tmp_path / (name + ".exe")).touch()
    native = runner.NativeDatabase(tmp_path)
    responses = iter(versions)
    monkeypatch.setattr(native, "run", lambda *args: "tool (PostgreSQL) " + next(responses))
    with pytest.raises(
        runner.VerificationFailure, match="must be PostgreSQL 17|versions do not match",
    ):
        native.check()
    assert native.root is None and native.process is None


def test_native_client_cannot_accept_arbitrary_host_or_role(tmp_path: Path) -> None:
    native = runner.NativeDatabase(tmp_path)
    native.port = 65432
    command = native.client_command("fitsocial_runtime")
    assert command[command.index("-h") + 1] == "127.0.0.1"
    assert command[command.index("-p") + 1] == "65432"
    assert command[command.index("-d") + 1] == "postgres"
    assert "-X" in command and "-w" in command
    with pytest.raises(runner.VerificationFailure, match="unexpected verification role"):
        native.client_command("arbitrary-role")


@pytest.mark.skipif(os.name != "nt", reason="native Windows preflight")
def test_unreliable_ownership_probe_blocks_before_cluster_creation(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str],
) -> None:
    for name in ("postgres", "initdb", "pg_ctl", "psql"):
        (tmp_path / (name + ".exe")).touch()
    monkeypatch.setattr(runner.NativeDatabase, "run", lambda *args: "tool (PostgreSQL) 17.1")

    def unreliable(port: int) -> list[tuple[str, int]]:
        raise runner.VerificationFailure(
            "BLOCKED: Windows listener state cannot establish ownership"
        )

    monkeypatch.setattr(runner, "windows_listeners", unreliable)
    create = Mock(side_effect=AssertionError("must not create a cluster"))
    monkeypatch.setattr(runner.NativeDatabase, "start", create)
    monkeypatch.setattr(sys, "argv", ["runner", "--run", "--backend", "native",
                                    "--pg-bin", str(tmp_path)])
    assert runner.main() == 2
    assert "cannot establish ownership" in capsys.readouterr().out
    create.assert_not_called()


def test_wrong_marker_prevents_cleanup(tmp_path: Path) -> None:
    native = owned_fixture(tmp_path)
    assert native.root is not None
    (native.root / "owner.json").write_text('{"token":"another-run"}', encoding="utf-8")
    with pytest.raises(runner.VerificationFailure, match="ownership mismatch"):
        native.cleanup()
    assert native.root.is_dir()


def test_wrong_parent_prevents_cleanup(tmp_path: Path) -> None:
    native = owned_fixture(tmp_path)
    native.temp_parent = tmp_path / "another-parent"
    with pytest.raises(runner.VerificationFailure, match="containment mismatch"):
        native.cleanup()
    assert native.root is not None and native.root.is_dir()


@pytest.mark.parametrize("mismatch", ["pid", "port", "data"])
def test_pid_file_mismatch_prevents_stopping_or_sql(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, mismatch: str,
) -> None:
    native = owned_fixture(tmp_path)
    process = simulated_process(native)
    assert native.data is not None
    pid_file = native.data / "postmaster.pid"
    lines = pid_file.read_text(encoding="utf-8").splitlines()
    lines[{"pid": 0, "data": 1, "port": 3}[mismatch]] = (
        "999" if mismatch != "data" else str(tmp_path / "another-cluster")
    )
    pid_file.write_text("\n".join(lines), encoding="utf-8")
    run = Mock(side_effect=AssertionError("must not stop/query an unowned instance"))
    monkeypatch.setattr(native, "run", run)
    with pytest.raises(runner.VerificationFailure, match="ownership mismatch"):
        native.cleanup()
    with pytest.raises(runner.VerificationFailure, match="ownership mismatch"):
        native.sql("postgres", "test", "SELECT 1;")
    run.assert_not_called()
    process.kill.assert_not_called()
    assert native.root is not None and native.root.is_dir()


def test_foreign_listener_prevents_database_connection(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    native = owned_fixture(tmp_path)
    simulated_process(native)
    monkeypatch.setattr(runner, "windows_listeners", lambda port: [("127.0.0.1", 99999)])
    run = Mock(side_effect=AssertionError("must not query a foreign listener"))
    monkeypatch.setattr(native, "run", run)
    with pytest.raises(runner.VerificationFailure, match="not exclusively test-owned"):
        native.sql("postgres", "test", "SELECT 1;")
    run.assert_not_called()


def test_successful_cleanup_stops_only_owned_process_and_preserves_sibling(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    native = owned_fixture(tmp_path)
    process = simulated_process(native)
    assert native.data is not None and native.root is not None
    root = native.root
    data = native.data
    sibling = tmp_path / "unrelated"
    sibling.mkdir()
    (sibling / "keep").write_text("preserve", encoding="ascii")
    commands: list[list[str]] = []

    def stop(command: list[str], stage: str, sql: str | None = None) -> str:
        assert stage == "stop owned native postmaster" and sql is None
        assert command[command.index("-D") + 1] == str(data)
        assert command[-1] == "stop" and "fast" in command
        commands.append(command)
        (data / "postmaster.pid").unlink()
        process.poll.return_value = 0
        return ""

    monkeypatch.setattr(native, "run", stop)
    monkeypatch.setattr(runner, "windows_listeners", lambda port: [])
    native.cleanup()
    assert len(commands) == 1 and not root.exists()
    assert (sibling / "keep").read_text(encoding="ascii") == "preserve"
    process.kill.assert_not_called()


def test_redirected_entry_prevents_recursive_cleanup(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    native = owned_fixture(tmp_path)
    assert native.root is not None
    redirected = native.root / "redirected"
    redirected.mkdir()
    real_check = Path.is_junction
    monkeypatch.setattr(Path, "is_junction", lambda path: path == redirected or real_check(path))
    monkeypatch.setattr(runner, "windows_listeners", lambda port: [])
    with pytest.raises(runner.VerificationFailure, match="redirected resources"):
        native.cleanup()
    assert redirected.exists()


def test_docker_adapter_preserves_restricted_role_command() -> None:
    docker = Mock()
    docker.run.return_value = "result"
    database = runner.DockerDatabase(docker, "synthetic-container")
    assert database.sql("fitsocial_runtime", "stage", "SELECT true;") == "result"
    docker.run.assert_called_once_with(
        runner.psql_command("synthetic-container", "fitsocial_runtime"), "stage", "SELECT true;",
    )
