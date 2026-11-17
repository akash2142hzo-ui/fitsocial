"""Verify PostgreSQL in a fresh native cluster or offline Docker container.

Never accepts an existing database/DSN/data directory; installs nothing.
Docker remains the default. Native Windows mode requires extracted version 17 tools.
"""

from __future__ import annotations

import argparse
import ctypes
import json
import os
import re
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any, Protocol
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
TESTS = ROOT / "supabase" / "tests"
MIGRATION = ROOT / "supabase" / "migrations" / "20261112000100_security_foundation.sql"
IMAGE = "postgres:17"
LABEL = "fitsocial.verification"
A = "00000000-0000-4000-8000-000000000001"
B = "00000000-0000-4000-8000-000000000002"
LIVE_SESSION = "10000000-0000-4000-8000-000000000009"


class VerificationFailure(Exception):
    """Messages contain stage labels only, never raw command output/errors."""


class Docker:
    def __init__(self) -> None:
        executable = shutil.which("docker")
        if executable is None:
            raise VerificationFailure("BLOCKED: local Docker executable is unavailable")
        self.command = [executable, "--context", "default"]
        self.environment = os.environ.copy()
        for name in ("DOCKER_HOST", "DOCKER_CONTEXT", "DOCKER_TLS_VERIFY", "DOCKER_CERT_PATH"):
            self.environment.pop(name, None)

    def run(self, args: list[str], stage: str, sql: str | None = None) -> str:
        try:
            result = subprocess.run(
                [*self.command, *args], input=sql, text=True, encoding="utf-8",
                capture_output=True, env=self.environment,
                timeout=60, check=False,
            )
        except (OSError, UnicodeError, subprocess.TimeoutExpired):
            raise VerificationFailure(
                f"FAILED: {stage}; command unavailable or timed out"
            ) from None
        if result.returncode:
            raise VerificationFailure(f"FAILED: {stage}; exit {result.returncode}")
        return result.stdout.strip()

    def local_image(self) -> str:
        try:
            context = json.loads(self.run(["context", "inspect", "default"], "local engine check"))
            endpoint = context[0]["Endpoints"]["docker"]["Host"]
            if not isinstance(endpoint, str) or not endpoint.startswith(
                ("unix:///", "npipe:////./pipe/")
            ):
                raise VerificationFailure("BLOCKED: default Docker context is not a local socket")
            image_id = self.run(["image", "inspect", "--format", "{{.Id}}", IMAGE],
                                "cached postgres:17 image check")
            if not re.fullmatch(r"sha256:[0-9a-f]{64}", image_id):
                raise VerificationFailure("BLOCKED: cached image identity is invalid")
            return image_id
        except (ValueError, KeyError, IndexError, TypeError):
            raise VerificationFailure("BLOCKED: local Docker context metadata is invalid") from None


def psql_command(container: str, role: str) -> list[str]:
    # Trust authentication is confined to a socket in this networkless container.
    # -X ignores psqlrc; -w forbids password prompts; no ambient host DB settings.
    return ["exec", "-i", "--user", "postgres", container, "psql", "-X", "-w", "-qAt",
            "-v", "ON_ERROR_STOP=1", "-h", "/var/run/postgresql", "-p", "5432",
            "-d", "postgres", "-U", role]


class Session:
    """One persistent psql process = one actual restricted physical connection."""

    def __init__(
        self, command: list[str], environment: dict[str, str],
        validate: Callable[[], None] | None = None, guard: str = "",
    ) -> None:
        self.validate = validate
        self.guard = guard
        if validate is not None:
            validate()
        self.process = subprocess.Popen(
            command,
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            text=True, encoding="utf-8", env=environment,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )

    def query(self, sql: str) -> list[str]:
        if self.validate is not None:
            self.validate()
        marker = "end_" + uuid4().hex
        timer = threading.Timer(15, self.process.kill)
        timer.start()
        try:
            if self.process.stdin is None or self.process.stdout is None:
                raise VerificationFailure("FAILED: runtime session streams are unavailable")
            self.process.stdin.write(self.guard + sql + f"\nSELECT '{marker}';\n")
            self.process.stdin.flush()
            lines: list[str] = []
            while True:
                line = self.process.stdout.readline()
                if not line:
                    raise VerificationFailure("FAILED: interleaved runtime session")
                line = line.strip()
                if line == marker:
                    return lines
                if line:
                    lines.append(line)
        except (OSError, UnicodeError):
            raise VerificationFailure("FAILED: runtime session transport") from None
        finally:
            timer.cancel()
            timer.join()

    def close(self) -> None:
        if self.process.poll() is None:
            self.process.kill()
        self.process.communicate(timeout=10)


class Database(Protocol):
    def sql(self, role: str, stage: str, sql: str) -> str: ...

    def session(self) -> Session: ...


class DockerDatabase:
    def __init__(self, docker: Docker, container: str) -> None:
        self.docker = docker
        self.container = container

    def sql(self, role: str, stage: str, sql: str) -> str:
        return self.docker.run(psql_command(self.container, role), stage, sql)

    def session(self) -> Session:
        return Session([*self.docker.command, *psql_command(self.container, "fitsocial_runtime")],
                       self.docker.environment)


class TcpRow(ctypes.Structure):
    _fields_ = [(name, ctypes.c_uint32) for name in
                ("state", "address", "port", "remote_address", "remote_port", "pid")]


class TcpTable(ctypes.Structure):
    _fields_ = [("count", ctypes.c_uint32), ("rows", TcpRow * 1)]


def windows_listeners(port: int) -> list[tuple[str, int]]:
    """Return listener addresses/PIDs from Windows, without opening a DB socket."""
    size = ctypes.c_uint32(0)
    table = ctypes.WinDLL("iphlpapi").GetExtendedTcpTable
    table.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_uint32), ctypes.c_int,
                      ctypes.c_uint32, ctypes.c_int, ctypes.c_uint32]
    table.restype = ctypes.c_uint32
    # Request the documented listener-only class. An unknown state is a
    # capability failure, never evidence that a competing listener is absent.
    # Endpoints can appear between sizing and reading. Retry only that documented
    # buffer-growth race; never reinterpret an access error or invalid state.
    for _ in range(3):
        result = table(None, ctypes.byref(size), False, socket.AF_INET, 3, 0)
        if result != 122:
            raise VerificationFailure(f"FAILED: listener inventory sizing (API={result})")
        if size.value < ctypes.sizeof(ctypes.c_uint32) or size.value > 16 * 1024 * 1024:
            raise VerificationFailure("FAILED: listener inventory size is invalid")
        buffer = ctypes.create_string_buffer(size.value)
        result = table(buffer, ctypes.byref(size), False, socket.AF_INET, 3, 0)
        if result == 122:
            continue
        if result != 0:
            raise VerificationFailure(f"FAILED: listener inventory query (API={result})")
        break
    else:
        raise VerificationFailure("FAILED: listener inventory kept growing (API=122)")
    count = ctypes.c_uint32.from_buffer_copy(buffer).value
    offset = TcpTable.rows.offset
    if offset + count * ctypes.sizeof(TcpRow) > size.value:
        raise VerificationFailure("FAILED: listener table bounds are invalid")
    listeners: list[tuple[str, int]] = []
    for index in range(count):
        row = TcpRow.from_buffer_copy(buffer, offset + index * ctypes.sizeof(TcpRow))
        if socket.ntohs(row.port & 0xFFFF) == port:
            if row.state != 2:
                raise VerificationFailure(
                    "BLOCKED: Windows listener state cannot establish ownership "
                    f"(API=0; state={row.state}; owner_pid_present={bool(row.pid)})"
                )
            if row.pid == 0:
                raise VerificationFailure("BLOCKED: listener owner PID is unavailable (API=0)")
            address = socket.inet_ntoa(int(row.address).to_bytes(4, "little"))
            listeners.append((address, int(row.pid)))
    return listeners


def native_environment() -> dict[str, str]:
    # Ignore all ambient libpq connection/options/service/password configuration.
    environment = {key: value for key, value in os.environ.items()
                   if not key.upper().startswith("PG")}
    environment["PGCLIENTENCODING"] = "UTF8"
    environment["PGCONNECT_TIMEOUT"] = "3"
    # Prevent libpq from consulting the user's default password/service files.
    environment["PGPASSFILE"] = os.devnull
    environment["PGSERVICEFILE"] = os.devnull
    environment["PGSYSCONFDIR"] = os.devnull
    return environment


class NativeDatabase:
    """Owns one fresh Windows postmaster, never an existing data directory."""

    def __init__(self, tools: Path) -> None:
        self.tools = tools.resolve()
        self.environment = native_environment()
        self.token = uuid4().hex
        self.root: Path | None = None
        self.data: Path | None = None
        self.port: int | None = None
        self.process: subprocess.Popen[bytes] | None = None
        self.temp_parent = Path(tempfile.gettempdir()).resolve()

    def command(self, name: str) -> list[str]:
        return [str(self.tools / (name + ".exe"))]

    def run(self, command: list[str], stage: str, sql: str | None = None) -> str:
        try:
            result = subprocess.run(
                command, input=sql, text=True, encoding="utf-8", capture_output=True,
                env=self.environment, timeout=60, check=False,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
        except (OSError, UnicodeError, subprocess.TimeoutExpired):
            raise VerificationFailure(f"FAILED: {stage}; command could not complete") from None
        if result.returncode:
            # SQLSTATE-only diagnostics permit investigation without echoing
            # paths, SQL text, data or upstream exception messages.
            self.command_failure(stage, result.stdout, result.stderr)
            state = re.search(r"(?:ERROR|FATAL|PANIC):\s+([0-9A-Z]{5})(?:\s|:|$)", result.stderr)
            suffix = f"; SQLSTATE {state[1]}" if state else ""
            raise VerificationFailure(f"FAILED: {stage}; exit {result.returncode}{suffix}")
        return result.stdout.strip()

    def command_failure(self, stage: str, stdout: str, stderr: str) -> None:
        """Subclasses may retain private evidence without exposing raw errors."""

    def check_versions(self) -> str:
        if os.name != "nt":
            raise VerificationFailure("BLOCKED: native mode currently requires Windows")
        versions = []
        for name in ("postgres", "initdb", "pg_ctl", "psql"):
            if not Path(self.command(name)[0]).is_file():
                raise VerificationFailure("BLOCKED: native PostgreSQL binaries are missing")
            version = self.run([*self.command(name), "--version"], "native binary version check")
            match = re.search(r"\(PostgreSQL\) (17\.\d+)(?:\s|$)", version)
            if match is None:
                raise VerificationFailure("BLOCKED: all native binaries must be PostgreSQL 17")
            versions.append(match[1])
        if len(set(versions)) != 1:
            raise VerificationFailure("BLOCKED: native binary versions do not match")
        return versions[0]

    def check(self) -> None:
        version = self.check_versions()
        # Verify the actual OS capability before allocating any database resource.
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            probe.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            probe.bind(("127.0.0.1", 0))
            probe.listen(1)
            if windows_listeners(probe.getsockname()[1]) != [("127.0.0.1", os.getpid())]:
                raise VerificationFailure("BLOCKED: Windows listener ownership probe failed")
        print("AVAILABLE: native Windows PostgreSQL " + version + " (Windows API method)")

    def start(self) -> None:
        # No caller-controlled data path. The directory is created exclusively
        # by this run under the resolved OS temporary directory.
        self.root = Path(tempfile.mkdtemp(prefix="fitsocial-045d-", dir=self.temp_parent)).resolve()
        (self.root / "owner.json").write_text(json.dumps({"token": self.token}), encoding="utf-8")
        self.data = self.root / "data"
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as reservation:
            reservation.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            reservation.bind(("127.0.0.1", 0))
            self.port = reservation.getsockname()[1]
            if self.port == 5432:
                raise VerificationFailure("FAILED: port reservation selected the default port")
            self.run([*self.command("initdb"), "-D", str(self.data), "-U", "postgres",
                      "--encoding=UTF8", "--locale=C", "--auth=trust", "--no-instructions"],
                     "initialize owned disposable cluster")
            # Trust is restricted to synthetic test roles on this loopback-only
            # instance. No password provisioning, service or firewall changes.
            (self.data / "pg_hba.conf").write_text(
                "host postgres postgres,fitsocial_runtime 127.0.0.1/32 trust\n"
                "host all all 0.0.0.0/0 reject\nhost all all ::0/0 reject\n", encoding="ascii",
            )
            command = [*self.command("postgres"), "-D", str(self.data), "-p", str(self.port),
                       "-c", "listen_addresses=127.0.0.1", "-c", "unix_socket_directories=",
                       "-c", "fsync=on", "-c", "statement_timeout=5s",
                       "-c", "fitsocial.disposable=task045c",
                       "-c", f"fitsocial.run_id={self.token}"]
            # Release only immediately before launching our explicit postmaster.
        self.process = subprocess.Popen(
            command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            env=self.environment, creationflags=subprocess.CREATE_NO_WINDOW,
        )
        for _ in range(100):
            if self.process.poll() is not None:
                raise VerificationFailure("FAILED: owned native postmaster exited during startup")
            if (self.data / "postmaster.pid").is_file():
                listeners = windows_listeners(self.port)
                if listeners:
                    self.validate()
                    try:
                        ready = self.sql(
                            "postgres", "owned native startup readiness", "SELECT true;",
                        )
                        if ready == "t":
                            print("STARTED: owned native cluster on IPv4 loopback, port "
                                  + str(self.port))
                            return
                    except VerificationFailure:
                        pass
            time.sleep(0.1)
        raise VerificationFailure("FAILED: owned native postmaster startup timeout")

    def validate(self, *, listener: bool = True) -> None:
        self.validate_directory()
        if self.process is None or self.process.poll() is not None or self.data is None:
            raise VerificationFailure("FAILED: test-owned postmaster is not running")
        lines = (self.data / "postmaster.pid").read_text(encoding="utf-8").splitlines()
        if len(lines) < 4 or lines[0] != str(self.process.pid) or lines[3] != str(self.port):
            raise VerificationFailure("FAILED: native cluster process/port ownership mismatch")
        if Path(lines[1]).resolve() != self.data.resolve():
            raise VerificationFailure("FAILED: native cluster data ownership mismatch")
        if listener and windows_listeners(self.port or 0) != [("127.0.0.1", self.process.pid)]:
            raise VerificationFailure("FAILED: loopback listener is not exclusively test-owned")

    def validate_directory(self) -> None:
        if self.root is None or self.root.parent != self.temp_parent:
            raise VerificationFailure("FAILED: disposable directory containment mismatch")
        if self.root.is_symlink() or self.root.is_junction() or self.root.resolve() != self.root:
            raise VerificationFailure("FAILED: disposable directory was redirected")
        owner = json.loads((self.root / "owner.json").read_text(encoding="utf-8"))
        if owner != {"token": self.token}:
            raise VerificationFailure("FAILED: disposable directory ownership mismatch")
        if self.data is not None and (
            self.data != self.root / "data" or self.data.is_symlink() or self.data.is_junction()
        ):
            raise VerificationFailure("FAILED: disposable data directory was redirected")

    def guard(self) -> str:
        return ("DO $$ BEGIN IF current_setting('fitsocial.run_id', true) IS DISTINCT FROM '"
                + self.token + "' OR current_database() <> 'postgres' THEN "
                "RAISE EXCEPTION 'Disposable cluster identity mismatch'; END IF; END; $$;\n")

    def client_command(self, role: str) -> list[str]:
        if role not in ("postgres", "fitsocial_runtime"):
            raise VerificationFailure("FAILED: unexpected verification role")
        return [*self.command("psql"), "-X", "-w", "-qAt", "-v", "ON_ERROR_STOP=1",
                "-v", "VERBOSITY=sqlstate", "-h", "127.0.0.1", "-p", str(self.port),
                "-d", "postgres", "-U", role]

    def sql(self, role: str, stage: str, sql: str) -> str:
        self.validate()
        return self.run(self.client_command(role), stage, self.guard() + sql)

    def session(self) -> Session:
        return Session(self.client_command("fitsocial_runtime"), self.environment,
                       validate=self.validate, guard=self.guard())

    def cleanup(self) -> None:
        if self.root is None:
            return
        self.validate_directory()
        if self.process is not None and self.process.poll() is None:
            self.validate(listener=False)
            if self.data is None:
                raise VerificationFailure("FAILED: native cleanup data path is unavailable")
            self.run([*self.command("pg_ctl"), "-D", str(self.data), "-m", "fast",
                      "-w", "-t", "10", "stop"], "stop owned native postmaster")
            self.process.wait(timeout=10)
        if self.data is not None and (self.data / "postmaster.pid").exists():
            raise VerificationFailure("FAILED: cleanup retained resources; PID file remains")
        if self.port is not None and windows_listeners(self.port):
            raise VerificationFailure("FAILED: cleanup retained resources; listener remains")
        self.validate_directory()
        # Refuse redirected entries rather than following them during recursive
        # deletion. The absolute root and marker were checked immediately above.
        for directory, folders, files in os.walk(self.root, followlinks=False):
            for name in [*folders, *files]:
                entry = Path(directory) / name
                if entry.is_symlink() or entry.is_junction():
                    raise VerificationFailure("FAILED: cleanup retained redirected resources")
        shutil.rmtree(self.root)
        if self.root.exists():
            raise VerificationFailure("FAILED: owned native resource removal was incomplete")
        self.root = None
        print("CLEANED: owned native postmaster stopped; owned temporary cluster removed")


def private_directory_acl(path: Path) -> None:
    """Exact user/SYSTEM DACL on a new owned directory, with native readback.

    Operates only on a caller's newly created test resource; no machine/user
    policy or existing-directory permissions are changed. Never prints SIDs.
    """
    adv = ctypes.WinDLL("advapi32", use_last_error=True)
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    pointer = ctypes.c_void_p
    dword = ctypes.c_uint32
    token, descriptor, sid_string = pointer(), pointer(), pointer()
    adv.OpenProcessToken.argtypes = [pointer, dword, ctypes.POINTER(pointer)]
    adv.GetTokenInformation.argtypes = [pointer, dword, pointer, dword, ctypes.POINTER(dword)]
    adv.ConvertSidToStringSidW.argtypes = [pointer, ctypes.POINTER(pointer)]
    adv.ConvertStringSecurityDescriptorToSecurityDescriptorW.argtypes = [
        ctypes.c_wchar_p, dword, ctypes.POINTER(pointer), ctypes.POINTER(dword),
    ]
    adv.SetFileSecurityW.argtypes = [ctypes.c_wchar_p, dword, pointer]
    adv.GetFileSecurityW.argtypes = [ctypes.c_wchar_p, dword, pointer, dword, ctypes.POINTER(dword)]
    adv.GetSecurityDescriptorControl.argtypes = [pointer, ctypes.POINTER(ctypes.c_uint16),
                                               ctypes.POINTER(dword)]
    adv.GetSecurityDescriptorDacl.argtypes = [pointer, ctypes.POINTER(ctypes.c_int),
                                            ctypes.POINTER(pointer), ctypes.POINTER(ctypes.c_int)]
    adv.GetAclInformation.argtypes = [pointer, pointer, dword, dword]
    adv.GetAce.argtypes = [pointer, dword, ctypes.POINTER(pointer)]
    kernel.CloseHandle.argtypes = [pointer]
    kernel.LocalFree.argtypes = [pointer]
    if not adv.OpenProcessToken(pointer(-1), 8, ctypes.byref(token)):
        raise VerificationFailure("FAILED: could not query own token for private ACL")
    try:
        size = dword()
        adv.GetTokenInformation(token, 1, None, 0, ctypes.byref(size))
        if not size.value:
            raise VerificationFailure("FAILED: own-token metadata unavailable")
        user = ctypes.create_string_buffer(size.value)
        if not adv.GetTokenInformation(token, 1, user, size, ctypes.byref(size)):
            raise VerificationFailure("FAILED: own-token SID unavailable")
        sid = pointer.from_buffer(user)
        if not adv.ConvertSidToStringSidW(sid, ctypes.byref(sid_string)):
            raise VerificationFailure("FAILED: own-token SID conversion failed")
        own_sid = ctypes.wstring_at(sid_string)
        kernel.LocalFree(sid_string)
        sid_string = pointer()
        inheritance = "OICI" if path.is_dir() else ""
        sddl = ("D:P(A;" + inheritance + ";FA;;;" + own_sid + ")(A;"
                + inheritance + ";FA;;;SY)")
        if not adv.ConvertStringSecurityDescriptorToSecurityDescriptorW(
            sddl, 1, ctypes.byref(descriptor), None,
        ) or not adv.SetFileSecurityW(str(path), 0x80000004, descriptor):
            raise VerificationFailure("FAILED: could not set exact private directory ACL")
        needed = dword()
        adv.GetFileSecurityW(str(path), 4, None, 0, ctypes.byref(needed))
        actual = ctypes.create_string_buffer(needed.value)
        if not adv.GetFileSecurityW(str(path), 4, actual, needed, ctypes.byref(needed)):
            raise VerificationFailure("FAILED: private directory ACL readback unavailable")
        control, revision = ctypes.c_uint16(), dword()
        if not adv.GetSecurityDescriptorControl(
            actual, ctypes.byref(control), ctypes.byref(revision),
        ):
            raise VerificationFailure("FAILED: directory ACL control unavailable")
        present, defaulted, dacl = ctypes.c_int(), ctypes.c_int(), pointer()
        if not adv.GetSecurityDescriptorDacl(
            actual, ctypes.byref(present), ctypes.byref(dacl), ctypes.byref(defaulted),
        ) or not present.value or not dacl:
            raise VerificationFailure("FAILED: directory DACL unavailable")
        info = (dword * 3)()
        if not adv.GetAclInformation(dacl, info, ctypes.sizeof(info), 2) or info[0] != 2:
            raise VerificationFailure("FAILED: unexpected private-directory ACE count")
        allowed = set()
        for index in range(info[0]):
            ace = pointer()
            if not adv.GetAce(dacl, index, ctypes.byref(ace)) or not ace.value:
                raise VerificationFailure("FAILED: directory ACE unavailable")
            if ctypes.c_uint8.from_address(ace.value).value != 0:
                raise VerificationFailure("FAILED: unexpected directory ACE type")
            expected_flags = 3 if path.is_dir() else 0
            if ctypes.c_uint8.from_address(ace.value + 1).value & 3 != expected_flags:
                raise VerificationFailure("FAILED: directory ACE does not protect child resources")
            if ctypes.c_uint32.from_address(ace.value + 4).value != 0x1F01FF:
                raise VerificationFailure("FAILED: unexpected directory ACE rights")
            if not adv.ConvertSidToStringSidW(pointer(ace.value + 8), ctypes.byref(sid_string)):
                raise VerificationFailure("FAILED: directory ACE principal unavailable")
            allowed.add(ctypes.wstring_at(sid_string))
            kernel.LocalFree(sid_string)
            sid_string = pointer()
        if not control.value & 0x1000 or allowed != {own_sid, "S-1-5-18"}:
            raise VerificationFailure("FAILED: exact private-directory ACL verification failed")
    finally:
        if sid_string:
            kernel.LocalFree(sid_string)
        if descriptor:
            kernel.LocalFree(descriptor)
        kernel.CloseHandle(token)


class AuthenticatedNativeDatabase(NativeDatabase):
    """Independent ownership chain: held process, private cluster and SCRAM SQL.

    Does not consult or reinterpret the broken Windows TCP-state API. A random
    credential authenticates the new endpoint before any SQL identity evidence
    is accepted; process/PID/data/start metadata must independently match too.
    """

    def __init__(self, tools: Path) -> None:
        super().__init__(tools)
        self.admin_password = secrets.token_urlsafe(48)
        self.runtime_password = secrets.token_urlsafe(48)
        # A passfile alone does not require authentication: an unrelated trust
        # server could otherwise accept the connection without knowing our secret.
        self.environment["PGREQUIREAUTH"] = "scram-sha-256"
        self.environment["PGGSSENCMODE"] = "disable"
        self.launched_at: float | None = None
        self.server_started: int | None = None
        self.ownership_confirmed = False
        self.preserve_startup_evidence = False
        self.launch_attempted = False

    def command_failure(self, stage: str, stdout: str, stderr: str) -> None:
        if stage == "initialize private SCRAM cluster" and self.root is not None:
            (self.root / "initdb-output.txt").write_text(stdout + "\n" + stderr, encoding="utf-8")
            self.preserve_startup_evidence = True

    def check(self) -> None:
        version = self.check_versions()
        if ctypes.windll.shell32.IsUserAnAdmin():
            raise VerificationFailure("BLOCKED: non-admin access required for authenticated mode")
        print("AVAILABLE: native PostgreSQL " + version + " (authenticated ownership method)")

    def private_root(self) -> None:
        self.root = Path(tempfile.mkdtemp(
            prefix="fitsocial 045e " + self.token[:12] + " ", dir=self.temp_parent,
        )).resolve()
        (self.root / "owner.json").write_text(json.dumps({"token": self.token}), encoding="utf-8")
        # Replace, then read back, the complete DACL. Adding grants alone leaves
        # pre-existing explicit ACEs; a child whoami process is not our token.
        private_directory_acl(self.root)
        self.validate_directory()

    def start(self) -> None:
        self.private_root()
        if self.root is None:
            raise VerificationFailure("FAILED: private temporary directory unavailable")
        self.data = self.root / "data"
        password_file = self.root / "initial-password"
        password_file.write_text(self.admin_password + "\n", encoding="ascii")
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as reservation:
            reservation.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            reservation.bind(("127.0.0.1", 0))
            self.port = reservation.getsockname()[1]
            if self.port == 5432:
                raise VerificationFailure("FAILED: default database port selected")
            try:
                self.run([*self.command("initdb"), "-D", str(self.data), "-U", "postgres",
                          "--encoding=UTF8", "--locale=C", "--auth=scram-sha-256",
                          "--pwfile", str(password_file), "--no-instructions"],
                         "initialize private SCRAM cluster")
            except BaseException:
                # A cancelled/timed-out initializer may have a bootstrap child.
                # Preserve its directory; do not infer "safe to delete" from the
                # absence of our later postmaster handle.
                self.preserve_startup_evidence = True
                raise
            finally:
                password_file.unlink(missing_ok=True)
            passfile = self.root / "client-passwords"
            passfile.write_text(
                f"127.0.0.1:{self.port}:postgres:postgres:{self.admin_password}\n"
                f"127.0.0.1:{self.port}:postgres:fitsocial_runtime:{self.runtime_password}\n",
                encoding="ascii",
            )
            self.environment["PGPASSFILE"] = str(passfile)
            self.environment["PGSSLMODE"] = "disable"
            (self.data / "pg_hba.conf").write_text(
                "host postgres postgres,fitsocial_runtime 127.0.0.1/32 scram-sha-256\n"
                "host all all 0.0.0.0/0 reject\nhost all all ::0/0 reject\n"
                "local all all reject\n", encoding="ascii",
            )
            command = [*self.command("postgres"), "-D", str(self.data), "-p", str(self.port),
                       "-c", "listen_addresses=127.0.0.1", "-c", "unix_socket_directories=",
                       "-c", "password_encryption=scram-sha-256", "-c", "fsync=on",
                       "-c", "statement_timeout=5s", "-c", "log_statement=none",
                       "-c", "log_min_error_statement=panic", "-c", "log_error_verbosity=terse",
                       "-c", "fitsocial.disposable=task045c",
                       "-c", f"fitsocial.run_id={self.token}"]
        self.launched_at = time.time()
        with (self.root / "server.log").open("wb") as log:
            self.launch_attempted = True
            self.process = subprocess.Popen(
                command, stdout=log, stderr=log, env=self.environment,
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
        deadline = time.monotonic() + 25
        while time.monotonic() < deadline:
            if self.process.poll() is not None:
                raise VerificationFailure("FAILED: owned postmaster exited; evidence retained")
            try:
                lines = (self.data / "postmaster.pid").read_text(encoding="utf-8").splitlines()
            except FileNotFoundError:
                lines = []
            if len(lines) >= 8:
                self.process_metadata()
                if lines[7].strip() == "ready":
                    self.confirm_identity()
                    print("OWNERSHIP VERIFIED: process, PID/data/start and SCRAM SQL match")
                    print("STARTED: authenticated loopback cluster on nondefault port "
                          + str(self.port))
                    return
            time.sleep(0.1)
        raise VerificationFailure("FAILED: native startup timeout; owned evidence retained")

    def process_metadata(self) -> int:
        NativeDatabase.validate(self, listener=False)
        if self.data is None or self.launched_at is None:
            raise VerificationFailure("FAILED: launch metadata unavailable")
        lines = (self.data / "postmaster.pid").read_text(encoding="utf-8").splitlines()
        if len(lines) < 8 or not lines[2].isdigit():
            raise VerificationFailure("FAILED: incomplete PostgreSQL PID metadata")
        started = int(lines[2])
        if not int(self.launched_at) - 2 <= started <= int(time.time()) + 1:
            raise VerificationFailure("FAILED: stale PostgreSQL PID metadata")
        return started

    def identity_query(self) -> str:
        return """SELECT json_build_object(
            'directory', current_setting('data_directory'),
            'port', inet_server_port(), 'address', host(inet_server_addr()),
            'started', floor(extract(epoch FROM pg_postmaster_start_time()))::bigint,
            'run', current_setting('fitsocial.run_id', true),
            'listen', current_setting('listen_addresses'),
            'sockets', current_setting('unix_socket_directories'),
            'role', current_user, 'database', current_database());"""

    def confirm_identity(self) -> None:
        started = self.process_metadata()
        result = self.run(self.client_command("postgres"), "authenticated server identity",
                          self.identity_query())
        identity = json.loads(result)
        if self.data is None or not isinstance(identity, dict):
            raise VerificationFailure("FAILED: invalid authenticated identity response")
        comparisons = self.identity_comparisons(identity, started)
        failed = [label for label, matches in comparisons.items() if not matches]
        if failed:
            raise VerificationFailure("FAILED: authenticated server identity mismatch ("
                                      + ", ".join(failed) + "); retained")
        # Recheck the retained live process after SQL, so exit/reuse cannot be
        # mistaken for the original launched postmaster.
        if self.process_metadata() != started:
            raise VerificationFailure("FAILED: process identity changed during SQL confirmation")
        self.server_started = started
        self.ownership_confirmed = True

    def identity_comparisons(self, identity: dict[str, Any], started: int) -> dict[str, bool]:
        """Pure diagnostic comparisons; no values exposed or ownership granted."""
        directory_matches = False
        directory = identity.get("directory")
        if isinstance(directory, str) and self.data is not None:
            try:
                directory_matches = Path(directory).resolve() == self.data.resolve()
            except (OSError, ValueError):
                pass
        return {
            "data directory": directory_matches,
            "port": identity.get("port") == self.port,
            "start time": identity.get("started") == started
            and (self.server_started is None or self.server_started == started),
            "another field (address)": identity.get("address") == "127.0.0.1",
            "another field (run marker)": identity.get("run") == self.token,
            "another field (listening configuration)": identity.get("listen") == "127.0.0.1",
            "another field (socket configuration)": identity.get("sockets") == "",
            "another field (role)": identity.get("role") == "postgres",
            "another field (database)": identity.get("database") == "postgres",
        }

    def validate(self, *, listener: bool = True) -> None:
        self.confirm_identity()

    def guard(self) -> str:
        if self.server_started is None or not self.ownership_confirmed:
            raise VerificationFailure("FAILED: authenticated ownership not initialized")
        return ("DO $$ BEGIN IF current_setting('fitsocial.run_id', true) IS DISTINCT FROM '"
                + self.token + "' OR inet_server_port() IS DISTINCT FROM " + str(self.port)
                + " OR inet_server_addr() IS DISTINCT FROM '127.0.0.1'::inet "
                "OR floor(extract(epoch FROM pg_postmaster_start_time()))::bigint <> "
                + str(self.server_started) + " OR current_database() <> 'postgres' THEN "
                "RAISE EXCEPTION 'Authenticated cluster identity mismatch'; END IF; END; $$;\n")

    def prepare_runtime(self) -> None:
        # Fresh disposable role only. Password is stdin SQL, never a command
        # argument. It is generated base64url (no SQL metacharacters).
        self.sql("postgres", "set disposable runtime SCRAM credential",
                 "ALTER ROLE fitsocial_runtime PASSWORD '" + self.runtime_password + "';")

    def cleanup(self) -> None:
        if self.root is None:
            return
        self.validate_directory()
        if self.preserve_startup_evidence and self.process is None:
            (self.root / "initial-password").unlink(missing_ok=True)
            self.admin_password = self.runtime_password = ""
            print("RETAINED: private initdb failure evidence; no server was launched")
            return
        if self.launch_attempted and self.process is None:
            raise VerificationFailure("RETAINED: launch interrupted; ownership handle unavailable")
        if self.process is not None:
            if self.process.poll() is None:
                # Even after a failed startup, require the complete independent
                # authenticated chain before signalling a still-running server.
                self.confirm_identity()
                if self.data is None:
                    raise VerificationFailure("FAILED: owned data directory unavailable")
                self.run([*self.command("pg_ctl"), "-D", str(self.data), "-m", "fast",
                          "-w", "-t", "10", "stop"], "stop authenticated owned postmaster")
                self.process.wait(timeout=10)
            elif not self.ownership_confirmed:
                raise VerificationFailure("RETAINED: failed startup; no process was stopped")
        if self.data is not None and (self.data / "postmaster.pid").exists():
            raise VerificationFailure("RETAINED: PID metadata remains; no deletion performed")
        self.validate_directory()
        for directory, folders, files in os.walk(self.root, followlinks=False):
            for name in [*folders, *files]:
                entry = Path(directory) / name
                if entry.is_symlink() or entry.is_junction():
                    raise VerificationFailure("RETAINED: redirected resource; deletion refused")
        shutil.rmtree(self.root)
        if self.root.exists():
            raise VerificationFailure("FAILED: authenticated native cleanup incomplete")
        self.root = None
        self.admin_password = self.runtime_password = ""
        if self.process is None:
            print("CLEANED: owned pre-start resources removed; no server was launched")
        else:
            print("CLEANED: verified owned postmaster stopped; private temporary cluster removed")


def identity_sql(actor: str) -> str:
    # Only fixed synthetic constants reach here; production context must use a
    # driver parameter, never interpolation of a caller's identity or raw token.
    if actor not in (A, B):
        raise VerificationFailure("FAILED: invalid synthetic fixture actor")
    return "DO $$ BEGIN PERFORM set_config('request.jwt.claims', " + (
        "'" + json.dumps({"sub": actor}) + "', true); END; $$;"
    )


def interleaved_checks(database: Database) -> None:
    sessions: list[Session] = []
    try:
        for _ in range(2):
            sessions.append(database.session())
        first, second = sessions
        pids = [session.query("SELECT pg_backend_pid();") for session in sessions]
        if len(pids[0]) != 1 or len(pids[1]) != 1 or pids[0] == pids[1]:
            raise VerificationFailure("FAILED: independent physical backends")
        for session, actor in ((first, A), (second, B)):
            session.query("BEGIN ISOLATION LEVEL READ COMMITTED;\n" + identity_sql(actor))
        # Both transactions remain open while alternating statements.
        for session, actor in ((first, A), (second, B), (first, A), (second, B)):
            rows = session.query("SELECT id::text FROM app_private.app_accounts;")
            if rows != [actor]:
                raise VerificationFailure("FAILED: concurrent A/B identity isolation")
        if first.query(f"SELECT app_private.session_is_denied('{LIVE_SESSION}');") != ["f"]:
            raise VerificationFailure("FAILED: pre-commit revocation baseline")
        # Separate administrative connection commits while A's READ COMMITTED
        # transaction remains open. No provider token or production data exists.
        database.sql("postgres", "committed synthetic revocation", (
            "INSERT INTO app_private.revoked_sessions "
            "(session_id, account_id, token_expires_at) VALUES "
            f"('{LIVE_SESSION}', '{A}', now() + interval '1 hour');"
        ))
        if first.query(f"SELECT app_private.session_is_denied('{LIVE_SESSION}');") != ["t"]:
            raise VerificationFailure("FAILED: post-commit primary visibility")
        for session, ending in ((first, "COMMIT"), (second, "ROLLBACK")):
            if session.query(ending + "; BEGIN; SELECT app_private.actor_subject() IS NULL "
                             "AND NOT EXISTS (SELECT 1 FROM app_private.app_accounts); "
                             "ROLLBACK;") != ["t"]:
                raise VerificationFailure("FAILED: concurrent connection reuse cleanup")
    finally:
        for session in sessions:
            session.close()


def read_sql(name: str) -> str:
    return (TESTS / name).read_text(encoding="utf-8")


def verify_matrix(database: Database, runtime_setup: Callable[[], None] | None = None) -> None:
    """Both transports execute this same unchanged SQL and connection matrix."""
    database.sql("postgres", "minimal local Auth fixture",
                 read_sql("security_disposable_bootstrap.sql"))
    preflight = database.sql("postgres", "original preflight", read_sql("security_preflight.sql"))
    if preflight.split("|") != ["t"] * 11:
        raise VerificationFailure("FAILED: preflight capability booleans")
    print("PASS: disposable preflight (11 true checks)")
    database.sql("postgres", "pre-migration catalog inventory",
                 read_sql("security_catalog_inspection.sql"))
    database.sql("postgres", "unchanged migration replay", MIGRATION.read_text(encoding="utf-8"))
    if runtime_setup is not None:
        runtime_setup()
    database.sql("postgres", "post-migration catalog inventory",
                 read_sql("security_catalog_inspection.sql"))
    database.sql("postgres", "catalog security assertions",
                 read_sql("security_disposable_catalog_assertions.sql"))
    print("PASS: migration replay, catalog inventory and privilege assertions")
    database.sql("postgres", "synthetic disposable fixtures",
                 read_sql("security_disposable_fixtures.sql"))
    owner_rows = database.sql("postgres", "supplementary FORCE owner check",
                              "BEGIN; SET LOCAL ROLE fitsocial_owner; "
                              "SELECT count(*) FROM app_private.app_accounts; ROLLBACK;")
    if owner_rows != "0":
        raise VerificationFailure("FAILED: forced RLS owner demonstration")
    database.sql("fitsocial_runtime", "original restricted-login smoke",
                 read_sql("security_runtime_readonly.sql"))
    database.sql("fitsocial_runtime", "restricted runtime SQL matrix",
                 read_sql("security_disposable_runtime.sql"))
    print("PASS: actual runtime login, RLS, denial helpers and same-backend reuse")
    interleaved_checks(database)
    print("PASS: interleaved physical connections and committed-revocation visibility")
    database.sql("postgres", "final catalog security assertions",
                 read_sql("security_disposable_catalog_assertions.sql"))


def verify(docker: Docker, image_id: str) -> None:
    marker = uuid4().hex
    container = docker.run([
        "create", "--pull", "never", "--name", "fitsocial-045c-" + marker,
        "--label", f"{LABEL}={marker}",
        "--network", "none", "--read-only", "--memory", "512m", "--cpus", "1",
        "--pids-limit", "128", "--tmpfs", "/var/lib/postgresql/data:rw,nosuid,size=256m",
        "--tmpfs", "/var/run/postgresql:rw,nosuid,size=16m",
        "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m",
        "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "-e", "PGDATA=/var/lib/postgresql/data",
        image_id, "postgres", "-c", "listen_addresses=", "-c", "fsync=on",
        "-c", "statement_timeout=5s", "-c", "fitsocial.disposable=task045c",
    ], "create new disposable container")
    if not re.fullmatch(r"[0-9a-f]{64}", container):
        raise VerificationFailure("FAILED: new container identity is invalid; inspect local engine")
    try:
        metadata: list[dict[str, Any]] = json.loads(docker.run(
            ["inspect", container], "disposable container isolation check"))
        config = metadata[0]
        mounts = config["Mounts"]
        if config["HostConfig"]["NetworkMode"] != "none" or any(
            mount["Type"] != "tmpfs" for mount in mounts
        ) or config["HostConfig"].get("PortBindings"):
            raise VerificationFailure("FAILED: disposable container isolation mismatch")
        docker.run(["start", container], "start disposable container")
        for attempt in range(30):
            try:
                # Avoid connecting to the entrypoint's temporary initialization
                # server: PID 1 must have exec'd the final postgres process.
                if docker.run(["exec", container, "cat", "/proc/1/comm"],
                              "final server process check") == "postgres":
                    readiness = docker.run(psql_command(container, "postgres"), "startup readiness",
                                           "SELECT current_setting('fitsocial.disposable', true);")
                    if readiness == "task045c":
                        break
            except VerificationFailure:
                pass
            if attempt == 29:
                raise VerificationFailure("FAILED: disposable PostgreSQL startup timeout")
            time.sleep(1)
        verify_matrix(DockerDatabase(docker, container))
    finally:
        # Delete only the exact newly created container, after verifying our label.
        actual = docker.run(["inspect", "--format", '{{ index .Config.Labels "' + LABEL + '" }}',
                             container], "verify cleanup ownership")
        if actual != marker:
            raise VerificationFailure("FAILED: cleanup ownership mismatch; no container removed")
        docker.run(["rm", "--force", "--volumes", container], "remove owned disposable container")
        print("CLEANED: owned disposable container; no persistent database volume")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="read-only local capability check")
    mode.add_argument(
        "--run", action="store_true", help="create/test/remove fresh disposable resources",
    )
    parser.add_argument("--backend", choices=("docker", "native"), default="docker")
    parser.add_argument("--pg-bin", type=Path, help="native PostgreSQL 17 bin directory only")
    parser.add_argument("--ownership", choices=("windows-api", "authenticated"),
                        default="windows-api", help="native ownership evidence method")
    options = parser.parse_args()
    try:
        for filename in ("security_disposable_bootstrap.sql", "security_preflight.sql",
                         "security_catalog_inspection.sql", "security_runtime_readonly.sql",
                         "security_disposable_catalog_assertions.sql",
                         "security_disposable_fixtures.sql", "security_disposable_runtime.sql"):
            read_sql(filename)
        MIGRATION.read_text(encoding="utf-8")
        if options.backend == "native":
            if options.pg_bin is None:
                raise VerificationFailure("BLOCKED: native mode requires --pg-bin")
            native = (AuthenticatedNativeDatabase(options.pg_bin)
                      if options.ownership == "authenticated" else NativeDatabase(options.pg_bin))
            native.check()
            if options.run:
                try:
                    native.start()
                    setup = (native.prepare_runtime
                             if isinstance(native, AuthenticatedNativeDatabase) else None)
                    verify_matrix(native, setup)
                finally:
                    native.cleanup()
        else:
            if options.ownership != "windows-api":
                raise VerificationFailure("BLOCKED: --ownership is native-only")
            if options.pg_bin is not None:
                raise VerificationFailure("BLOCKED: --pg-bin is valid only with native mode")
            docker = Docker()
            image_id = docker.local_image()
            print("AVAILABLE: local Docker socket and cached postgres:17 image")
            print("IMAGE: " + image_id)
            if options.run:
                verify(docker, image_id)
        if options.run:
            print("PASS: local PostgreSQL foundation checks; hosted checks remain separate")
        return 0
    except VerificationFailure as error:
        print(str(error))
    except (OSError, UnicodeError, ValueError, KeyError, IndexError, TypeError,
            subprocess.TimeoutExpired):
        print("FAILED: verification tooling or metadata error; raw details withheld")
    except KeyboardInterrupt:
        print("INTERRUPTED: verification stopped; inspect cleanup status")
    return 2


if __name__ == "__main__":
    sys.exit(main())
