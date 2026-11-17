"""Standalone Windows own-socket reproduction; stdlib only, no database/admin.

Does not import the runner. Never changes settings or opens existing endpoints.
Prints only phase/contract evidence, not paths, actual PIDs or unrelated rows.
"""

import ctypes
import json
import os
import socket
import subprocess
import sys
import time
from uuid import uuid4


class Row(ctypes.Structure):
    _fields_ = [(name, ctypes.c_uint32) for name in
                ("state", "address", "port", "remote_address", "remote_port", "pid")]


class Header(ctypes.Structure):
    _fields_ = [("count", ctypes.c_uint32), ("first", Row * 1)]


def table_evidence(port: int, kind: int) -> dict[str, object]:
    api = ctypes.WinDLL("iphlpapi").GetExtendedTcpTable
    api.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_uint32), ctypes.c_int,
                    ctypes.c_uint32, ctypes.c_int, ctypes.c_uint32]
    api.restype = ctypes.c_uint32
    answer: dict[str, object] = {"family": socket.AF_INET.value, "table_class": kind}
    for _ in range(3):
        length = ctypes.c_uint32(0)
        status = api(None, ctypes.byref(length), False, socket.AF_INET, kind, 0)
        answer["size_status"] = status
        if status != 122 or not 4 <= length.value <= 16 * 1024 * 1024:
            return answer
        memory = ctypes.create_string_buffer(length.value)
        status = api(memory, ctypes.byref(length), False, socket.AF_INET, kind, 0)
        answer["query_status"] = status
        if status == 122:
            continue
        if status != 0:
            return answer
        count = ctypes.c_uint32.from_buffer_copy(memory).value
        stride, offset = ctypes.sizeof(Row), Header.first.offset
        if offset + count * stride > ctypes.sizeof(memory):
            answer["bounds_valid"] = False
            return answer
        answer["bounds_valid"] = True
        matches: list[dict[str, object]] = []
        for index in range(count):
            row = Row.from_buffer_copy(memory, offset + index * stride)
            if socket.ntohs(row.port & 65535) != port:
                continue
            matches.append({
                "state": int(row.state), "pid_matches": row.pid == os.getpid(),
                "address_bytes_match": int(row.address).to_bytes(4, "little")
                == socket.inet_aton("127.0.0.1"),
                "network_port_matches": row.port & 65535 == socket.htons(port),
            })
        answer["matching_rows"] = matches
        answer["listener_contract_passed"] = len(matches) == 1 and matches[0] == {
            "state": 2, "pid_matches": True, "address_bytes_match": True,
            "network_port_matches": True,
        }
        return answer
    answer["buffer_race_exhausted"] = True
    return answer


def sample(owned: socket.socket, phase: str, port: int) -> dict[str, object]:
    tables = [table_evidence(port, kind) for kind in (3, 5)]
    return {
        "phase": phase, "socket_family": owned.family.value,
        "accept_connection": owned.getsockopt(socket.SOL_SOCKET, socket.SO_ACCEPTCONN),
        "tables": tables,
        "all_listener_contracts_passed": all(
            item.get("listener_contract_passed") is True for item in tables
        ),
    }


def netstat_evidence(port: int) -> dict[str, object]:
    result = subprocess.run(
        ["netstat.exe", "-ano", "-p", "tcp"], capture_output=True, text=True,
        timeout=10, check=False, creationflags=subprocess.CREATE_NO_WINDOW,
    )
    matches: list[str] = []
    for line in result.stdout.splitlines():
        fields = line.split()
        if len(fields) >= 4 and fields[1] == f"127.0.0.1:{port}" and fields[-1] == str(os.getpid()):
            state = fields[3] if len(fields) == 5 else "unparsed-state"
            matches.append(state if state.isascii() and state.isalnum() else "redacted-state")
    return {"source": "netstat", "exit": result.returncode, "own_endpoint_states": matches}


def receive_exact(stream: socket.socket, size: int) -> bytes:
    received = bytearray()
    while len(received) < size:
        chunk = stream.recv(size - len(received))
        if not chunk:
            break
        received.extend(chunk)
    return bytes(received)


def main() -> int:
    if os.name != "nt":
        print("BLOCKED: this reproduction requires Windows")
        return 2
    try:
        print(json.dumps({
            "row_size": ctypes.sizeof(Row), "first_row_offset": Header.first.offset,
            "field_offsets": [getattr(Row, field[0]).offset for field in Row._fields_],
        }))
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as owned:
            owned.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            owned.settimeout(2)
            owned.bind(("127.0.0.1", 0))
            port = owned.getsockname()[1]
            if port == 5432:
                print("BLOCKED: OS selected default database port; no test performed")
                return 2
            print(json.dumps(sample(owned, "bound_before_listen", port)))
            owned.listen(1)  # Explicitly precedes every listening-phase API call.
            passed = True
            for phase in ("after_listen_0ms", "after_listen_250ms", "after_listen_500ms"):
                evidence = sample(owned, phase, port)
                print(json.dumps(evidence))
                passed &= evidence["all_listener_contracts_passed"] is True
                if phase != "after_listen_500ms":
                    time.sleep(0.25)
            print(json.dumps(netstat_evidence(port)))
            # Connect only to this still-exclusively-owned socket, never a DB.
            payload = uuid4().hex.encode("ascii")
            with socket.create_connection(("127.0.0.1", port), timeout=2) as client:
                accepted, _ = owned.accept()
                with accepted:
                    accepted.settimeout(2)
                    client.sendall(payload)
                    data = receive_exact(accepted, len(payload))
                    accepted.sendall(data)
                    roundtrip = receive_exact(client, len(payload)) == payload
            print(json.dumps({"owned_loopback_connect_accept_echo_passed": roundtrip}))
            passed &= roundtrip
        print("PASS: listener contract" if passed else
              "BLOCKED: listener contract remains unsatisfied")
        return 0 if passed else 2
    except (OSError, ValueError, subprocess.TimeoutExpired) as error:
        print("FAILED: isolated reproduction (" + type(error).__name__ + "); details withheld")
        return 2


if __name__ == "__main__":
    sys.exit(main())
