"""Discovery/parsing/redaction checks; no PostgreSQL or process control."""

import ctypes
import getpass
import json
import os
import sys
import tempfile
import time
from pathlib import Path
from unittest.mock import Mock

import diagnose_retained_identity as diagnostic
import pytest

pytestmark = pytest.mark.skipif(os.name != "nt", reason="Windows-native retained evidence")


@pytest.mark.parametrize("style", ["plain", "single", "double", "trailing", "forward"])
def test_literal_windows_input_normalizes_without_changing_candidate(
    tmp_path: Path, style: str,
) -> None:
    root = retained(tmp_path / "parent with spaces")
    entered = str(root)
    if style == "single":
        entered = "  '" + entered + "'  "
    elif style == "double":
        entered = '"' + entered + '"'
    elif style == "trailing":
        entered += "\\"
    elif style == "forward":
        entered = entered.replace("\\", "/")
    assert diagnostic.validate_retained(diagnostic.selected_path(entered)) == root.resolve()


@pytest.mark.parametrize(("entered", "reason"), [
    ('"C:\\private', "unmatched surrounding quote"),
    ("\u201cC:\\private\u201d", "typographic quotes not supported"),
    ("C:\\private\x00", "empty input or control character"),
    ("Get-Item 'C:\\private'", "invalid literal path characters"),
])
def test_input_format_rejection_is_specific_and_sanitized(entered: str, reason: str) -> None:
    with pytest.raises(diagnostic.EvidenceUnavailable) as captured:
        diagnostic.selected_path(entered)
    assert captured.value.status == reason
    assert "private" not in str(captured.value)


@pytest.mark.parametrize(("entered", "reason"), [
    ("relative", "absolute drive-qualified path required"),
    ("C:relative", "absolute drive-qualified path required"),
    ("\\\\server\\share\\private", "network/device path not supported"),
])
def test_location_rejections_are_distinct(entered: str, reason: str) -> None:
    with pytest.raises(diagnostic.EvidenceUnavailable) as captured:
        diagnostic.validate_retained(Path(entered))
    assert captured.value.status == reason


@pytest.mark.parametrize(("drive_type", "reason"), [
    (0, "drive type unavailable"), (1, "drive root unavailable"),
    (4, "network drive not supported"), (5, "optical drive not supported"),
])
def test_drive_query_rejection_is_precise(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, drive_type: int, reason: str,
) -> None:
    kernel = Mock()
    kernel.GetDriveTypeW.return_value = drive_type
    monkeypatch.setattr(ctypes, "WinDLL", lambda name: kernel)
    with pytest.raises(diagnostic.EvidenceUnavailable) as captured:
        diagnostic.validate_retained(tmp_path)
    assert captured.value.status == reason


def test_redirected_parent_is_rejected_before_manifest_read(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    root = retained(tmp_path)
    original = Path.is_junction
    monkeypatch.setattr(Path, "is_junction", lambda path: path == tmp_path or original(path))
    reader = Mock(side_effect=AssertionError("must reject before evidence reads"))
    monkeypatch.setattr(diagnostic, "evidence_text", reader)
    with pytest.raises(diagnostic.EvidenceUnavailable) as captured:
        diagnostic.validate_retained(root)
    assert captured.value.status == "redirected resource"
    reader.assert_not_called()


def retained(parent: Path, digit: str = "1") -> Path:
    marker = digit * 32
    root = parent / ("fitsocial 045e " + marker[:12] + " fixture")
    (root / "data").mkdir(parents=True)
    (root / "owner.json").write_text(json.dumps({"token": marker}), encoding="utf-8")
    (root / "data/postmaster.pid").write_text(
        f"12345\n{root / 'data'}\n{int(time.time())}\n65432\n\n127.0.0.1\n\nready\n",
        encoding="utf-8",
    )
    (root / "client-passwords").write_text(
        "127.0.0.1:65432:postgres:postgres:synthetic-admin\n"
        "127.0.0.1:65432:postgres:fitsocial_runtime:synthetic-runtime\n", encoding="utf-8",
    )
    return root


def test_ambiguous_retained_evidence_is_not_adopted(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(tempfile, "gettempdir", lambda: str(tmp_path))
    retained(tmp_path, "1")
    retained(tmp_path, "2")
    with pytest.raises(diagnostic.EvidenceUnavailable) as captured:
        diagnostic.retained_candidate()
    assert captured.value.status == "ambiguous candidates"
    assert len(list(tmp_path.iterdir())) == 2


def test_single_current_writer_manifest_is_discovered(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    root = retained(tmp_path)
    monkeypatch.setattr(tempfile, "gettempdir", lambda: str(tmp_path))
    assert diagnostic.retained_candidate() == root.resolve()


def test_denied_temp_parent_is_not_reported_as_empty(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(tempfile, "gettempdir", lambda: str(tmp_path))
    original = os.scandir

    def denied(path: object) -> object:
        if path == tmp_path:
            raise PermissionError("synthetic-private-temp-directory")
        return original(path)  # type: ignore[call-overload]

    monkeypatch.setattr(os, "scandir", denied)
    with pytest.raises(diagnostic.EvidenceUnavailable) as captured:
        diagnostic.retained_candidate()
    assert captured.value.field == "temporary directory discovery"
    assert captured.value.status == "access denied"


def test_accessible_candidate_is_not_guessed_when_another_candidate_is_denied(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    retained(tmp_path, "1")
    blocked = retained(tmp_path, "2") / "owner.json"
    monkeypatch.setattr(tempfile, "gettempdir", lambda: str(tmp_path))
    original = Path.read_text

    def denied(path: Path, *args: object, **kwargs: object) -> str:
        if path == blocked:
            raise PermissionError("synthetic-private-candidate")
        return original(path, *args, **kwargs)  # type: ignore[arg-type]

    monkeypatch.setattr(Path, "read_text", denied)
    with pytest.raises(diagnostic.EvidenceUnavailable) as captured:
        diagnostic.retained_candidate()
    assert captured.value.status == "ambiguous candidates"


def test_missing_evidence_output_is_precise_and_redacted(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(tempfile, "gettempdir", lambda: str(tmp_path))
    monkeypatch.setattr(sys, "argv", ["diagnostic", "--pg-bin", str(tmp_path / "private-tools")])
    inspect_process = Mock(side_effect=AssertionError("No process access without evidence"))
    monkeypatch.setattr(diagnostic, "process_handle", inspect_process)
    assert diagnostic.main() == 2
    output = capsys.readouterr().out
    assert json.loads(output) == {"retained evidence selection": "not found"}
    assert str(tmp_path) not in output and "private-tools" not in output
    inspect_process.assert_not_called()


@pytest.mark.parametrize(("payload", "status"), [
    ("{", "invalid format"), ("[]", "invalid format"),
    ('{"token":"bad"}', "invalid format"),
    ('{"run_id":"11111111111111111111111111111111"}', "invalid format"),
    ('{"token":"11111111111111111111111111111111","version":99}', "unsupported version"),
])
def test_manifest_format_and_version_are_distinct(
    tmp_path: Path, payload: str, status: str,
) -> None:
    root = retained(tmp_path)
    (root / "owner.json").write_text(payload, encoding="utf-8")
    with pytest.raises(diagnostic.EvidenceUnavailable) as captured:
        diagnostic.validate_retained(root)
    assert captured.value.status == status


def test_wrong_encoding_is_invalid_format(tmp_path: Path) -> None:
    root = retained(tmp_path)
    (root / "owner.json").write_bytes(b"\xff\xfe\x00\x00")
    with pytest.raises(diagnostic.EvidenceUnavailable) as captured:
        diagnostic.validate_retained(root)
    assert captured.value.field == "manifest" and captured.value.status == "invalid format"


@pytest.mark.parametrize("filename", ["owner.json", "client-passwords"])
def test_access_denied_is_not_misreported_as_missing(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, filename: str,
) -> None:
    root = retained(tmp_path)
    original = Path.read_text

    def denied(path: Path, *args: object, **kwargs: object) -> str:
        if path.name == filename:
            raise PermissionError("synthetic-private-path-and-credential")
        return original(path, *args, **kwargs)  # type: ignore[arg-type]

    monkeypatch.setattr(Path, "read_text", denied)
    with pytest.raises(diagnostic.EvidenceUnavailable) as captured:
        diagnostic.validate_retained(root)
    assert captured.value.status == "access denied"
    assert "synthetic-private" not in str(captured.value)


@pytest.mark.parametrize(("filename", "replacement", "field", "status"), [
    ("data/postmaster.pid", None, "PID metadata", "not found"),
    ("data/postmaster.pid", "bad metadata", "PID metadata", "invalid format"),
    ("client-passwords", "bad credential file", "credentials", "invalid format"),
])
def test_file_and_format_failures_have_exact_stage(
    tmp_path: Path, filename: str, replacement: str | None, field: str, status: str,
) -> None:
    root = retained(tmp_path)
    if replacement is None:
        (root / filename).unlink()
    else:
        (root / filename).write_text(replacement, encoding="utf-8")
    with pytest.raises(diagnostic.EvidenceUnavailable) as captured:
        diagnostic.validate_retained(root)
    assert (captured.value.field, captured.value.status) == (field, status)


def test_interactive_exact_directory_can_use_different_temp_parent_without_echo(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str],
) -> None:
    root = retained(tmp_path / "original terminal temp")
    current = tmp_path / "different current temp"
    current.mkdir()
    monkeypatch.setattr(tempfile, "gettempdir", lambda: str(current))
    monkeypatch.setattr(sys, "stdin", Mock(isatty=lambda: True))
    monkeypatch.setattr(getpass, "getpass", lambda prompt: str(root))
    assert diagnostic.selected_candidate() == root.resolve()
    assert str(root) not in capsys.readouterr().out


def test_noninteractive_prompt_cannot_fall_back_to_echo(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sys, "stdin", Mock(isatty=lambda: False))
    prompt = Mock(side_effect=AssertionError("must not echo a path"))
    monkeypatch.setattr(getpass, "getpass", prompt)
    with pytest.raises(diagnostic.EvidenceUnavailable) as captured:
        diagnostic.selected_candidate()
    assert captured.value.status == "interactive input unavailable"
    prompt.assert_not_called()


def test_prompted_unrelated_directory_is_rejected(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    unrelated = tmp_path / "unrelated"
    unrelated.mkdir()
    monkeypatch.setattr(sys, "stdin", Mock(isatty=lambda: True))
    monkeypatch.setattr(getpass, "getpass", lambda prompt: str(unrelated))
    with pytest.raises(diagnostic.EvidenceUnavailable) as captured:
        diagnostic.selected_candidate()
    assert captured.value.status == "not found"
    assert unrelated.exists()


def test_internal_type_error_has_stage_but_no_raw_message(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str],
) -> None:
    def broken(*args: object) -> dict[str, str]:
        diagnostic.stage("PID/process identity (ownership API)")
        raise TypeError("synthetic-private-path-and-password")

    monkeypatch.setattr(diagnostic, "diagnose", broken)
    monkeypatch.setattr(sys, "argv", ["diagnostic", "--pg-bin", str(tmp_path)])
    assert diagnostic.main() == 2
    assert json.loads(capsys.readouterr().out) == {
        "PID/process identity (ownership API)": "type error",
    }
