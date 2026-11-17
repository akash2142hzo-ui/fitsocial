"""Read-only diagnosis of one task-created retained server; never adopts/cleans it.

Run in the original non-admin terminal context. Prints only comparison labels and
statuses, never identity values, credentials, paths, timestamps or process IDs.
"""

import argparse
import ctypes
import getpass
import json
import ntpath
import os
import re
import stat
import sys
import tempfile
import time
from datetime import datetime
from decimal import ROUND_FLOOR, Decimal, InvalidOperation
from pathlib import Path

from run_disposable_security import AuthenticatedNativeDatabase, VerificationFailure

_current_stage = "diagnostic setup"  # Single-operation CLI error context; never an evidence value.


def stage(label: str) -> None:
    global _current_stage
    _current_stage = label


class EvidenceUnavailable(Exception):
    def __init__(self, field: str, status: str = "not found") -> None:
        super().__init__(field)
        self.field = field
        self.status = status


def filesystem_error(field: str, error: OSError) -> EvidenceUnavailable:
    if isinstance(error, PermissionError) or getattr(error, "winerror", None) == 5:
        return EvidenceUnavailable(field, "access denied")
    if isinstance(error, FileNotFoundError):
        return EvidenceUnavailable(field, "not found")
    code = getattr(error, "winerror", None) or error.errno
    return EvidenceUnavailable(field, f"filesystem error (code={code})")


def api_error(field: str) -> EvidenceUnavailable:
    code = ctypes.get_last_error()
    statuses = {5: "access denied", 87: "not found", 50: "unsupported API"}
    return EvidenceUnavailable(field, statuses.get(code, f"OS query error (code={code})"))


def evidence_text(path: Path, field: str) -> str:
    stage(field)
    try:
        metadata = path.lstat()  # Do not hide permissions/missing files via is_file().
        if not stat.S_ISREG(metadata.st_mode) or path.is_symlink() or path.is_junction():
            raise EvidenceUnavailable(field, "invalid format")
        return path.read_text(encoding="utf-8")
    except UnicodeError:
        raise EvidenceUnavailable(field, "invalid format") from None
    except OSError as error:
        raise filesystem_error(field, error) from None


def validate_retained(root: Path) -> Path:
    """Validate this producer's known protocol, without adopting or connecting."""
    stage("run directory")
    try:
        if root.drive.startswith("\\\\"):
            raise EvidenceUnavailable("run directory", "network/device path not supported")
        if not root.is_absolute():
            raise EvidenceUnavailable("run directory", "absolute drive-qualified path required")
        kernel = ctypes.WinDLL("kernel32")
        kernel.GetDriveTypeW.argtypes = [ctypes.c_wchar_p]
        drive_type = kernel.GetDriveTypeW(root.anchor)
        if drive_type not in (2, 3, 6):
            reasons = {0: "drive type unavailable", 1: "drive root unavailable",
                       4: "network drive not supported", 5: "optical drive not supported"}
            raise EvidenceUnavailable("run directory", reasons.get(
                drive_type, "unrecognized drive type"))
        for component in (root, *root.parents):
            if component.is_symlink() or component.is_junction():
                raise EvidenceUnavailable("run directory", "redirected resource")
        if not stat.S_ISDIR(root.lstat().st_mode):
            raise EvidenceUnavailable("run directory", "invalid format")
        if root.is_symlink() or root.is_junction():
            raise EvidenceUnavailable("run directory", "redirected resource")
        root = root.resolve()
        data = root / "data"
        if data.is_symlink() or data.is_junction():
            raise EvidenceUnavailable("data directory", "redirected resource")
    except OSError as error:
        raise filesystem_error("run directory", error) from None
    try:
        manifest = json.loads(evidence_text(root / "owner.json", "manifest"))
    except ValueError:
        raise EvidenceUnavailable("manifest", "invalid format") from None
    if not isinstance(manifest, dict):
        raise EvidenceUnavailable("manifest", "invalid format")
    if any(key in manifest for key in ("version", "schema_version", "format_version")):
        # The current runner writes an unversioned {token: ...} manifest only.
        raise EvidenceUnavailable("manifest", "unsupported version")
    marker = manifest.get("token")
    if (set(manifest) != {"token"} or not isinstance(marker, str)
        or not re.fullmatch(r"[0-9a-f]{32}", marker)
        or not root.name.startswith("fitsocial 045e " + marker[:12] + " ")):
        raise EvidenceUnavailable("manifest/run identifier", "invalid format")
    lines = evidence_text(data / "postmaster.pid", "PID metadata").splitlines()
    if len(lines) < 8 or not all(lines[index].isdigit() for index in (0, 2, 3)):
        raise EvidenceUnavailable("PID metadata", "invalid format")
    if int(lines[0]) <= 0 or not 1024 <= int(lines[3]) <= 65535 or int(lines[3]) == 5432:
        raise EvidenceUnavailable("PID metadata", "invalid format")
    records = evidence_text(root / "client-passwords", "credentials").splitlines()
    parsed = [record.split(":", 4) for record in records if record]
    if (len(parsed) != 2 or any(len(record) != 5 or not record[4] for record in parsed)
        or {tuple(record[:4]) for record in parsed} != {
            ("127.0.0.1", lines[3], "postgres", "postgres"),
            ("127.0.0.1", lines[3], "postgres", "fitsocial_runtime"),
        }):
        raise EvidenceUnavailable("credentials", "invalid format")
    return root


def process_handle(pid: int, executable: Path, started: int) -> ctypes.c_void_p:
    """Query-only inspection handle, not the runner's original ownership handle."""
    stage("PID/process identity (ownership API)")
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    pointer = ctypes.c_void_p
    kernel.OpenProcess.argtypes = [ctypes.c_uint32, ctypes.c_int, ctypes.c_uint32]
    kernel.OpenProcess.restype = pointer
    kernel.CloseHandle.argtypes = [pointer]
    kernel.GetExitCodeProcess.argtypes = [pointer, ctypes.POINTER(ctypes.c_uint32)]
    kernel.QueryFullProcessImageNameW.argtypes = [pointer, ctypes.c_uint32, ctypes.c_wchar_p,
                                               ctypes.POINTER(ctypes.c_uint32)]
    kernel.GetProcessTimes.argtypes = [pointer, pointer, pointer, pointer, pointer]
    raw = kernel.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION only.
    if not raw:
        raise api_error("PID/process identity (open handle)")
    handle = pointer(raw)
    try:
        code = ctypes.c_uint32()
        name = ctypes.create_unicode_buffer(32768)
        size = ctypes.c_uint32(len(name))
        created, exited, cpu_kernel, cpu_user = (ctypes.c_uint64() for _ in range(4))
        if not kernel.GetExitCodeProcess(handle, ctypes.byref(code)):
            raise api_error("PID/process identity (query status)")
        if code.value != 259:
            raise EvidenceUnavailable("PID/process identity", "process exited")
        if not kernel.QueryFullProcessImageNameW(handle, 0, name, ctypes.byref(size)):
            raise api_error("PID/process identity (query executable)")
        if Path(name.value).resolve() != executable.resolve():
            raise EvidenceUnavailable("PID/process identity", "executable mismatch")
        if not kernel.GetProcessTimes(handle, ctypes.byref(created), ctypes.byref(exited),
                                      ctypes.byref(cpu_kernel), ctypes.byref(cpu_user)):
            raise api_error("PID/process identity (query start time)")
        created_epoch = (created.value - 116444736000000000) // 10000000
        if started < created_epoch - 1 or started > int(time.time()) + 1:
            raise EvidenceUnavailable("PID/process identity", "stale PID metadata")
        return handle
    except BaseException:
        kernel.CloseHandle(handle)
        raise


def retained_candidate() -> Path:
    stage("temporary directory discovery")
    candidates: list[Path] = []
    failures: list[EvidenceUnavailable] = []
    try:
        parent = Path(tempfile.gettempdir()).resolve()
        # One temporary-directory level and the exact producer prefix only.
        # scandir exposes a denied parent instead of glob suppressing the error.
        with os.scandir(parent) as entries:
            roots = [parent / entry.name for entry in entries
                     if entry.name.startswith("fitsocial 045e ")]
    except OSError as error:
        raise filesystem_error("temporary directory discovery", error) from None
    for root in roots:
        try:
            candidates.append(validate_retained(root))
        except EvidenceUnavailable as error:
            failures.append(error)
    uncertain = [error for error in failures if error.status != "not found"]
    if len(candidates) > 1 or (candidates and uncertain):
        raise EvidenceUnavailable("retained evidence selection", "ambiguous candidates")
    if candidates:
        return candidates[0]
    if failures:
        raise (uncertain or failures)[0]
    raise EvidenceUnavailable("retained evidence selection", "not found")


def selected_path(entered: str) -> Path:
    """Parse literal hidden input, never shell expressions or environment expansion."""
    entered = entered.strip()
    if not entered or any(ord(character) < 32 for character in entered):
        raise EvidenceUnavailable("run directory", "empty input or control character")
    if entered[0] in ("'", '"'):
        if len(entered) < 2 or entered[-1] != entered[0]:
            raise EvidenceUnavailable("run directory", "unmatched surrounding quote")
        entered = entered[1:-1]
    if not entered or any(character in entered for character in "\"'<>|?*"):
        raise EvidenceUnavailable("run directory", "invalid literal path characters")
    if any(character in entered for character in "\u2018\u2019\u201c\u201d"):
        raise EvidenceUnavailable("run directory", "typographic quotes not supported")
    return Path(entered)


def selected_candidate() -> Path:
    stage("interactive selection")
    if not sys.stdin.isatty():
        raise EvidenceUnavailable("interactive selection", "interactive input unavailable")
    # getpass hides the directory, keeping it out of console/history/argv.
    entered = getpass.getpass("Exact retained run directory (input hidden): ")
    return validate_retained(selected_path(entered))


def diagnose(tools: Path, selected: bool = False) -> dict[str, str]:
    root = selected_candidate() if selected else retained_candidate()
    stage("tools/connection setup")
    database = AuthenticatedNativeDatabase(tools)
    database.root, database.data = root, root / "data"
    database.token = json.loads(evidence_text(root / "owner.json", "manifest"))["token"]
    database.environment["PGPASSFILE"] = str(root / "client-passwords")
    database.environment["PGSSLMODE"] = "disable"
    # Read-only connection, even though its only statement is a fixed SELECT.
    database.environment["PGOPTIONS"] = "-c default_transaction_read_only=on"
    pidfile = database.data / "postmaster.pid"
    lines = evidence_text(pidfile, "PID metadata").splitlines()
    if len(lines) < 8 or not all(lines[index].isdigit() for index in (0, 2, 3)):
        raise EvidenceUnavailable("PID metadata", "invalid format")
    if Path(lines[1]).resolve() != database.data.resolve():
        raise EvidenceUnavailable("data directory", "mismatch")
    database.port = int(lines[3])
    if not 1024 <= database.port <= 65535 or database.port == 5432:
        raise EvidenceUnavailable("port", "invalid format")
    if lines[5].strip() != "127.0.0.1" or lines[7].strip() != "ready":
        raise EvidenceUnavailable("PID listener configuration/readiness", "not loopback-ready")
    started = int(lines[2])
    handle = process_handle(int(lines[0]), tools / "postgres.exe", started)
    try:
        stage("authenticated identity query preparation")
        query = database.identity_query().rstrip().removesuffix(";")
        # Add observational timestamp fields, without changing the runner query.
        query = "SELECT base::jsonb || jsonb_build_object('timestamp_text', " \
                "pg_postmaster_start_time()::text, 'epoch_text', " \
                "extract(epoch FROM pg_postmaster_start_time())::text) " \
                "FROM (" + query + ") AS observed(base);"
        try:
            stage("authenticated read")
            raw = database.run(
                database.client_command("postgres"), "read-only retained identity", query,
            )
        except VerificationFailure as error:
            status = ("authentication failed" if "28P01" in str(error)
                      else "authenticated read failed")
            raise EvidenceUnavailable("authenticated read", status) from None
        try:
            stage("SQL identity output")
            identity = json.loads(raw)
        except ValueError:
            raise EvidenceUnavailable("SQL identity output", "invalid format") from None
        if not isinstance(identity, dict):
            raise EvidenceUnavailable("SQL identity output", "invalid format")
        if evidence_text(pidfile, "PID metadata").splitlines()[:4] != lines[:4]:
            raise EvidenceUnavailable("PID/process identity", "metadata changed")
        code = ctypes.c_uint32()
        stage("PID/process identity (post-read query)")
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.GetExitCodeProcess.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_uint32)]
        if not kernel.GetExitCodeProcess(handle, ctypes.byref(code)):
            raise api_error("PID/process identity (post-read status)")
        if code.value != 259:
            raise EvidenceUnavailable("PID/process identity", "process exited")
        stage("identity comparisons")
        comparisons = database.identity_comparisons(identity, started)
        result = {label: "match" if value else "mismatch" for label, value in comparisons.items()}
        result["PID/process identity"] = "inspected metadata matches; original handle unavailable"
        directory = identity.get("directory")
        stage("path lexical normalization")
        result["another field (path lexical normalization)"] = (
            "match" if isinstance(directory, str) and ntpath.normcase(ntpath.normpath(directory))
            == ntpath.normcase(ntpath.normpath(str(database.data))) else "mismatch"
        )
        try:
            stage("timestamp interpretation")
            epoch = Decimal(identity["epoch_text"])
            text_epoch = datetime.fromisoformat(identity["timestamp_text"]).timestamp()
            result["another field (timestamp timezone conversion)"] = (
                "match" if abs(float(epoch) - text_epoch) < 0.00001 else "mismatch"
            )
            # Observations only; exact start-time equality remains mandatory.
            result["another field (start-time difference at most one second)"] = (
                "yes" if abs(int(epoch.to_integral_value(rounding=ROUND_FLOOR)) - started) <= 1
                else "no"
            )
        except (KeyError, TypeError, ValueError, InvalidOperation):
            result["another field (timestamp interpretation)"] = "invalid format"
        return result
    finally:
        kernel = ctypes.WinDLL("kernel32")
        kernel.CloseHandle.argtypes = [ctypes.c_void_p]
        kernel.CloseHandle(handle)
    # No cleanup/adoption method is called, even if every comparison matches.


def main() -> int:
    stage("diagnostic setup")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pg-bin", type=Path, required=True)
    parser.add_argument("--select-run", action="store_true",
                        help="prompt privately for the exact retained directory; read-only")
    options = parser.parse_args()
    try:
        if os.name != "nt" or sys.version_info < (3, 12):
            raise EvidenceUnavailable("diagnostic runtime", "unsupported version")
        if ctypes.windll.shell32.IsUserAnAdmin():
            raise EvidenceUnavailable("diagnostic context", "administrator context not supported")
        result = diagnose(options.pg_bin, options.select_run)
        print(json.dumps(result, sort_keys=True))
        return 1 if "mismatch" in result.values() else 0
    except EvidenceUnavailable as error:
        print(json.dumps({error.field: error.status}))
    except KeyboardInterrupt:
        print(json.dumps({_current_stage: "interrupted; retained resources untouched"}))
    except EOFError:
        print(json.dumps({_current_stage: "interactive input ended"}))
    except OSError as error:
        classified = filesystem_error(_current_stage, error)
        print(json.dumps({classified.field: classified.status}))
    except UnicodeError:
        print(json.dumps({_current_stage: "invalid format"}))
    except ValueError:
        print(json.dumps({_current_stage: "value error"}))
    except TypeError:
        print(json.dumps({_current_stage: "type error"}))
    except KeyError:
        print(json.dumps({_current_stage: "missing field"}))
    except ctypes.ArgumentError:
        print(json.dumps({_current_stage: "API argument error"}))
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
