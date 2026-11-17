# Task 045D - Enable disposable database verification

Date: 2026-11-17. **Native transport implemented; actual database execution remains
blocked.** No software was installed, Windows configuration changed, database
initialized or SQL executed. No PostgreSQL/RLS result is claimed.

## Latest lifecycle investigation: no demonstrated probe defect

The user reports that the identical native-check error also occurs in an ordinary
non-administrator terminal outside this managed session. That external observation
is user-provided evidence, not an agent-run external-terminal test. The request to
compare contexts is therefore satisfied; repeating it is not the next step.

Reviewed the runner's actual order: create AF_INET socket, set exclusivity, bind
to loopback/port 0, call `listen(1)`, then invoke the ownership API. The existing
independent diagnostic also calls `Listen(1)` before querying. The hypothesis
that the runner expects a listener before calling listen is not supported by
either source or the new measured lifecycle trace.

Added `supabase/tests/reproduce_listener_lifecycle.py`, a standalone stdlib-only
reproduction that does not import the runner. It records the bound/pre-listen
phase, explicitly listens, checks the same socket immediately/250ms/500ms later,
then performs an actual connect/accept/echo on that still-owned socket. It queries
only matching own-port rows and never prints actual PIDs, private paths or
unrelated network metadata. All sockets/processes it creates close on completion.
There is no PostgreSQL, settings change, elevation or existing-service connection.

### Actual lifecycle and independent OS evidence

| Observation | Bound before listen | After explicit listen, all three samples |
| --- | --- | --- |
| Socket family | AF_INET = 2 | AF_INET = 2 |
| Winsock SO_ACCEPTCONN | 0 | 1 |
| Listener-only API class 3 | No matching row | One own PID/address/port row, state 0 |
| All-endpoints API class 5 | No matching row | One own PID/address/port row, state 0 |
| API size/query status | 122 / 0 | 122 / 0 |
| Native row bounds | Valid | Valid |

Additional observed evidence:

- An actual loopback connection was accepted and data echoed correctly by the
  explicitly owned socket: `owned_loopback_connect_accept_echo_passed=true`.
  This demonstrates a working listener beyond the SO_ACCEPTCONN flag.
- .NET/C# P/Invoke independently reproduced no row before listen, followed by
  own-PID rows with state 0 after listen at three sampling times. The inline
  PowerShell command ran with ordinary access and exited 0; it completed the
  measurement, not a successful ownership-contract check.
- .NET `GetActiveTcpListeners()` did **not** contain the owned endpoint.
- `netstat.exe -ano -p tcp` exited 0 but returned no matching owned endpoint.
  The reproduction emits only the sanitized empty match list, never the complete
  network table. These enumeration tools can share underlying Windows data
  sources; they are not proof of independent kernel correctness.

### Hypotheses reviewed without assuming a cause

| Hypothesis | Result |
| --- | --- |
| API is called before listen | Ruled out for the reproduction and runner source. The before/after SO_ACCEPTCONN transition is measured, and an actual echo works. |
| Startup visibility race | State remains 0 immediately, 250ms and 500ms after listen in Python and .NET. No short-delay correction is observed; a broader host cause is not diagnosed from that alone. |
| Wrong address family | Both socket and API use AF_INET=2; known IPv4 loopback bytes match. No IPv4/IPv6 table substitution occurs. |
| Wrong table selection | Class 3 is OWNER_PID_LISTENER; class 5 is OWNER_PID_ALL. Both yield the same matching post-listen row/state. |
| Wrong layout/alignment | Six uint32 fields have offsets 0,4,8,12,16,20; row size 24, first-row offset 4. Independent .NET native layout agrees, bounds are valid, and PID/address/port match known values. |
| Wrong byte ordering | Network-order port converts back to the bound port; raw low port word equals htons(port). Address bytes equal inet_aton(loopback). State is a host DWORD and is not byte-swapped; zero would remain zero under any byte order. |
| Occupied port/hidden ownership | Exclusive fresh bind succeeds, and API returns the exact known PID/address/port. No access-denied or foreign-PID result explains this failure. |

The [Microsoft row contract](https://learn.microsoft.com/en-us/windows/win32/api/tcpmib/ns-tcpmib-mib_tcprow_owner_pid)
defines LISTEN as 2, with ports in network byte order. Its
[table-class contract](https://learn.microsoft.com/en-us/windows/win32/api/iprtrmib/ne-iprtrmib-tcp_table_class)
confirms the class selections above. No demonstrated lifecycle, family, table,
layout or byte-order defect justifies changing the runner. State 0 has not been
reinterpreted as LISTEN, and the ownership guard/SQL assertions remain unchanged.
The precise remaining blocker is contradictory host network-enumeration metadata
for a proven working owned listener, with the deeper Windows/provider/driver
cause still unestablished. This is not evidence of a migration defect.

### Commands and actual results for this investigation

An existing system Python **3.14.7** runs under ordinary access, unlike the earlier
sandbox-denied 3.13 virtual-environment launcher. It was used only for stdlib
diagnosis/runner capability checking. Backend runtime requirements remain 3.13;
no dependency or environment was installed/modified. All commands in this
investigation ran without administrator access or sandbox execution overrides.

From the repository root:

```powershell
python -B supabase/tests/reproduce_listener_lifecycle.py
.\.venv\Scripts\ruff.exe check --config backend/pyproject.toml --no-cache supabase/tests/reproduce_listener_lifecycle.py
python -B supabase/tests/run_disposable_security.py --backend native --pg-bin $pgBin --check
```

`$pgBin` held the already-verified tool directory locally; the actual value is
withheld. Results:

- Standalone reproduction: **exit 2**, reproduced twice. All after-listen samples
  report API=0/state=0 with known PID, address and port matches. Final output is
  `BLOCKED: listener contract remains unsatisfied`; owned echo passes each run.
- Ruff with the backend's complete configured rules: **exit 0, All checks passed!**
  Two initial line-length findings in the new reproduction were corrected.
- Native capability check: **exit 2**, exact sanitized failure:

  ```text
  BLOCKED: Windows listener state cannot establish ownership (API=0; state=0; owner_pid_present=True)
  ```

- PowerShell AST parsing of the existing independent diagnostic: zero errors;
  effective Restricted policy remains unchanged. No script-policy bypass was used.
- Backend tests/type checks were not rerun: no backend, runner or assertion changed,
  and the ownership capability did not pass. Earlier test counts below are history,
  not new results. No mocked test substitutes for SQL evidence.

The SQL matrix was **not** run because the probe still fails. No disposable or
existing database was initialized/connected to, so database shutdown/deletion was
not needed. No process was killed and no software, firewall or Windows setting
changed. The new reproduction, README and this report are the only changes;
fingerprints confirm existing runner/SQL/tests/app files and photos are unchanged.

The reproduction is suitable evidence for further Windows/network-provider support
diagnosis without admin access or sensitive output. The current evidence does not
justify a specific OS/driver change or an ownership-check bypass. Once a documented
ownership check can pass, run the unchanged native matrix and record real cleanup.
Hosted Supabase API/pooler/platform-role/exposure/failover checks remain pending.

## Earlier diagnosis: ownership failure classified, execution still blocked

The corrected PostgreSQL 17.6 binaries remain available. No database was created
or connected to during this diagnosis; the full SQL matrix remains unexecuted.
All network probes used fresh test-owned IPv4 loopback sockets, and disposed only
those sockets. No unknown process was stopped or existing service contacted.

### Exact API and observed failure

The runner invokes Windows `GetExtendedTcpTable` with `AF_INET=2` and
`TCP_TABLE_OWNER_PID_LISTENER=3`. The initial size query returns
`ERROR_INSUFFICIENT_BUFFER=122` as expected, and the data query returns success
`0`. The matching row contains a nonzero, correct own PID/address/port but TCP
state **0**. The documented `MIB_TCP_STATE_LISTEN` value is **2**. Native check now
returns **exit 2**, printing exactly:

```text
BLOCKED: Windows listener state cannot establish ownership (API=0; state=0; owner_pid_present=True)
```

An independent PowerShell/.NET/C# P/Invoke probe was compiled and run inline under
ordinary access, without administrator elevation or the Python runner. It used
native structure layout (`row_offset=4`, `stride=24`) and compared only its own
socket row. Actual sanitized outputs:

```text
class=3 first_status=122 status=0 state=0 own_pid_visible=true loopback=True socket_accepts=1 collision_rejected=True row_offset=4 stride=24
class=5 first_status=122 status=0 state=0 own_pid_visible=true loopback=True socket_accepts=1 collision_rejected=True row_offset=4 stride=24
```

Both the listener-only and all-endpoints API classes reproduce the anomaly.
Winsock `SO_ACCEPTCONN=1` independently establishes that the owned socket really
is listening. Its exclusive bind succeeded on a fresh OS-selected port; a second
exclusive bind to that same owned port was rejected. No probe connected to another
listener, accepted traffic or selected a known database port.

| Candidate cause | Evidence and conclusion |
| --- | --- |
| Occupied port | Excluded for this failing probe: a new exclusive bind succeeds. Deliberate collision with that very socket is rejected as expected. |
| Insufficient ownership visibility | Not observed for this socket: API query succeeds and returns the correct own PID/address/port. No API access-denied status occurred. This does not certify visibility into unrelated processes, which is unnecessary here. |
| Runner decoding defect | Independent native-layout .NET decoding reproduces state 0 with identical offset/stride. A Python-only marshaling explanation is therefore unsupported. No state reinterpretation or ownership bypass was added. |
| Host execution restriction | Separately observed: ordinary execution of the existing Python environment is sandbox-denied; `.ps1` files are blocked by effective Restricted policy. These restrictions were not changed. The state-0 anomaly reproduces in normal-access inline PowerShell too; whether its deeper cause is Windows, instrumentation or the managed host remains unresolved without an outside-context comparison. |

This establishes an incompatible host/API observation, not a migration defect or
a confirmed diagnosis of a Windows kernel bug. Administrator access is not the
default remedy: the relevant own PID is already visible, and the API succeeds.

### Focused changes and checks

- Runner API failures now retain the exact sanitized API code and operation stage.
  Unknown states include state and owner-PID-presence booleans; zero owner PIDs
  explicitly fail. No paths, actual PID, unrelated endpoint or credential is output.
- Bounded retries handle the documented endpoint-table growth race between size
  and data calls. Only API 122 is retried; access failures and invalid states are
  never treated as absence or successful ownership. This hardens diagnosis but
  does not resolve the host's state-0 behavior.
- Five new regression cases cover API failure codes, buffer-growth retry, invalid
  state rejection and zero owner-PID rejection. All prepared SQL files, grants,
  policies, matrix assertions and Docker lifecycle remain unchanged.
- Added `supabase/tests/diagnose_listener_ownership.ps1` as sanitized independent
  diagnostic source. PowerShell AST parsing reports zero errors. Running the file
  under ordinary access is blocked by effective Restricted policy
  (`PSSecurityException`, exit 1). The successful independent probe above ran as
  permitted inline commands before this script was prepared. The new file itself
  is not reported as executed. No execution-policy bypass or policy change was used.

After ordinary execution of the existing Python interpreter was denied, offline
Python checks used the already-authorized sandbox execution override. That is not
a Windows `RunAs`/administrator elevation request and changes no system setting.
From `backend/`, with the actual tool directory kept only in local `$pgBin`:

```powershell
..\.venv\Scripts\python.exe -B ..\supabase\tests\run_disposable_security.py --backend native --pg-bin $pgBin --check
..\.venv\Scripts\python.exe -B -m pytest -p no:cacheprovider tests ../supabase/tests/test_disposable_runner.py
..\.venv\Scripts\python.exe -B -m ruff check --no-cache app tests ../supabase/tests/run_disposable_security.py ../supabase/tests/test_disposable_runner.py
..\.venv\Scripts\python.exe -B -m mypy --no-incremental app tests ../supabase/tests/run_disposable_security.py ../supabase/tests/test_disposable_runner.py
```

Actual results:

- Native capability check: **exit 2**, exact state-0 failure shown above.
- pytest: **exit 1; 1 failed, 212 passed in 2.77s**. The genuine Windows ownership
  probe remains failing and is not skipped or marked expected-failure. All 192
  existing backend cases pass; mocked runner regression tests are not RLS evidence.
- Ruff: **exit 0; All checks passed!**
- mypy: **exit 0; no issues in 12 source files**.
- Independent inline own-socket probes: **exit 0**, API observations shown above;
  the command completing is not an ownership-contract pass.
- `git diff --check`: passed. Original files/photos were fingerprinted before work;
  only this report, the runner, its safety tests and the test README changed, plus
  the newly added diagnostic source. No SQL/app/dependency/credential change.

### Smallest manual next action

Open an **ordinary, non-administrator PowerShell outside this managed agent
session**, start in the repository root and run this read-only check:

```powershell
$pgBin = Read-Host 'Local PostgreSQL 17 bin directory'
& .\.venv\Scripts\python.exe -B supabase/tests/run_disposable_security.py --backend native --pg-bin $pgBin --check
```

Keep the actual directory local and return only the sanitized result. This invokes
no PowerShell script file, installs nothing, changes no policy/firewall setting,
does not initialize a cluster and requests no administrator token. A pass there
would isolate the managed-context limitation; the same exact failure would show
that the API issue also exists outside it. That comparison is necessary before
recommending any host remediation; no speculative OS/security change is justified.

Until ownership can be established, do not launch a database just to bypass the
preflight. Once resolved, the existing native mode must use its unique owned data
directory/postmaster handle/PID metadata and verified loopback nondefault listener,
run the unchanged SQL matrix, and prove its own shutdown/removal. Unknown ownership
must retain evidence rather than trigger process-name kills or directory deletion.
No live database cleanup was required in this diagnosis. Hosted Supabase API,
pooler, role/platform grants, Realtime and failover/RPO 0 checks remain pending.

## Earlier retry: supplied native binaries verified

The user supplied a corrected binary directory, kept out of this report. An
approved read-only probe confirmed the directory and all four executables exist.
Actual version outputs:

```text
postgres (PostgreSQL) 17.6
initdb (PostgreSQL) 17.6
pg_ctl (PostgreSQL) 17.6
psql (PostgreSQL) 17.6
```

The native tooling/location blocker is resolved. From `backend/`, with `$pgBin`
holding that corrected directory locally, the actual commands were:

```powershell
foreach ($tool in @('postgres','initdb','pg_ctl','psql')) {
    $executable = Join-Path $pgBin ($tool+'.exe')
    if (Test-Path -LiteralPath $executable -PathType Leaf) {
        & $executable --version
    }
}
..\.venv\Scripts\python.exe -B ..\supabase\tests\run_disposable_security.py --backend native --pg-bin $pgBin --check
```

All version probes completed successfully. Native check still returned **exit 2**:
`BLOCKED: Windows listener state cannot establish ownership`. This is now the
remaining execution gate; earlier missing-directory results below are history.
The corrected native check reaches the real loopback socket probe but stops before
cluster allocation. No initdb, postmaster, migration or SQL matrix was run; no
database cleanup was necessary. No ownership assertion was bypassed or relaxed.
No runner/source changes were made for this retry, and no prior test result is
presented as a new run. Only this report was updated. Hosted checks remain pending.

## Continuation: native runner implementation and actual results (earlier)

The user authorized native Windows adaptation, preserving Docker mode and using
only a new loopback-bound disposable cluster. The supplied extraction directory
was absent both under ordinary access and an approved read-only probe outside
the workspace sandbox. Its `bin`, `pgsql/bin` and direct-root layouts each
contained zero of the four required executables. The actual path is withheld.
The message also contained a replacement-path placeholder; an asynchronous
clarification requested the actual extraction directory. No replacement directory
has been supplied at the time of this report.

### Changes made in this continuation

- `supabase/tests/run_disposable_security.py`: preserved default Docker CLI and
  container lifecycle; added native Windows mode with `--backend native --pg-bin`.
  Both backends now invoke one `verify_matrix` implementation containing the same
  original migration/preflight/catalog/smoke/disposable SQL and interleaved-session
  checks. No SQL file, permission or assertion was changed.
- `supabase/tests/test_disposable_runner.py`: 16 offline safety/capability tests,
  including one real Windows loopback socket probe. These tests are not PostgreSQL
  tests and do not substitute for RLS evidence.
- `supabase/tests/README.md`: documented native usage, isolation, limitations and
  the blocked platform check.
- This document: current continuation results, followed by the historical initial
  readiness review. Earlier statements that native support was not implemented
  describe that initial phase and are superseded by this section.

### Native isolation and cleanup design

Native check mode requires four matching PostgreSQL 17 tool versions and a working
Windows listener-ownership probe **before any cluster allocation**. Native run
mode uses only a newly created, uniquely marked OS-temporary directory; no data
directory, DSN, existing process, host or port can be supplied. An exclusive
loopback socket reserves an available nondefault port until immediately before
launch. An explicitly owned postmaster process binds only `127.0.0.1` and disables
Unix sockets. HBA trust is restricted to the synthetic test roles/database on
IPv4 loopback; other entries reject. There are no passwords, installed services,
firewall edits or hosted connections. Other local users remain outside this
short-lived synthetic-data test instance's trust boundary.

Every client and reused-session query checks the original process handle/PID,
PID-file data path/port and OS-reported listener ownership. Each SQL invocation
also verifies a unique server-side run marker. All ambient PG connection/options/
service/password settings are cleared or overridden with safe defaults; psql uses
explicit connection arguments and `-X -w`. Native subprocess failures print only
stage/exit information and SQLSTATE when safely available, never raw error text
or private paths.

Cleanup validates ownership before using `pg_ctl` to stop only that postmaster,
waits for process exit, requires PID-file/listener disappearance, then verifies
the directory's marker/absolute containment and rejects symlinks/junctions before
recursive deletion. Ambiguous ownership retains resources rather than stopping
or deleting an unrelated resource. No name-based process kill, service operation,
existing-cluster adoption or generic directory deletion was added.

**Actual cleanup evidence:** no PostgreSQL process/cluster was created, so real
postmaster shutdown/deletion was not exercised. Simulated cleanup tests passed,
including foreign PID/path/port refusal, wrong directory marker/parent refusal,
redirected-entry refusal and preservation of an unrelated sibling directory.
Temporary OS socket probes closed their own sockets. This does not certify
native PostgreSQL lifecycle behavior.

### Additional platform failure investigated

The real socket probe binds/listens on `127.0.0.1` with an OS-selected port, then
asks Windows for its own PID/address/port. `GetExtendedTcpTable` returned success
and the correct own PID/loopback/port, but `dwState=0`. This was reproduced across
three samples with the all-endpoints class and separately with both listener-only
class 3 and all-endpoints class 5. No existing database socket was contacted.

Typed ctypes row/table structures, explicit API argument types, native structure
offset/stride and buffer bounds were then used to exclude the original hardcoded
layout assumption. The real listener probe still fails. Microsoft's documented
[MIB_TCPROW_OWNER_PID contract](https://learn.microsoft.com/en-us/windows/win32/api/tcpmib/ns-tcpmib-mib_tcprow_owner_pid)
defines LISTEN as 2; zero is not a documented listener state. The
[table-layout documentation](https://learn.microsoft.com/en-us/windows/win32/api/tcpmib/ns-tcpmib-mib_tcptable_owner_pid)
requires accounting for alignment, which the typed implementation does.

The original new-code draft silently filtered out state 0, potentially confusing
uncertain ownership with no listener. This **runner safety defect was fixed**:
unknown matching-port states now raise a capability failure, and the real platform
probe runs before cluster creation. State 0 is not accepted, no assertion is
relaxed, and the failure is not hidden/skipped to obtain a green test run.

The remaining failure is an observed platform/API capability problem, not a
migration defect. Its underlying Windows/network-driver/instrumentation cause
is not established. No OS update, network reset, driver change, BIOS change or
firewall modification was attempted. Even after the actual binaries become
available, this ownership capability must be established before native execution.

### Actual commands and results in this continuation

From `backend/`, `$pgBin` held the supplied directory's bin-layout candidate
locally; its actual value was not printed or recorded here:

```powershell
..\.venv\Scripts\python.exe -B ..\supabase\tests\run_disposable_security.py --backend native --pg-bin $pgBin --check
..\.venv\Scripts\python.exe -B ..\supabase\tests\run_disposable_security.py --backend native --pg-bin $pgBin --run
..\.venv\Scripts\python.exe -B ..\supabase\tests\run_disposable_security.py --check
```

Native check and run each returned **2** with
`BLOCKED: native PostgreSQL binaries are missing`. The default Docker check
returned **2** with `BLOCKED: local Docker executable is unavailable`. All stopped
at capability gates. No cluster directory, initdb/postmaster, migration or database
connection was created by these invocations.

```powershell
..\.venv\Scripts\python.exe -B -m pytest -p no:cacheprovider tests ../supabase/tests/test_disposable_runner.py
..\.venv\Scripts\python.exe -B -m ruff check --no-cache app tests ../supabase/tests/run_disposable_security.py ../supabase/tests/test_disposable_runner.py
..\.venv\Scripts\python.exe -B -m mypy --no-incremental app tests ../supabase/tests/run_disposable_security.py ../supabase/tests/test_disposable_runner.py
```

- pytest: **exit 1; 1 failed, 207 passed in 2.49s**. All 192 pre-existing backend
  cases passed. Of 16 new runner tests, 15 passed and the genuine Windows ownership
  capability test failed with `BLOCKED: Windows listener state cannot establish
  ownership`. No expected-failure marker or test exclusion masks this result.
- Ruff: passed after correcting line-length findings in the new tests.
- mypy: **exit 0; no issues in 12 source files**.
- Direct diagnostic commands used only Python ctypes plus fresh loopback sockets;
  their outputs were limited to status codes, state values and own-port/PID-match
  evidence. They did not inspect/print unrelated endpoint addresses or raw rows.
- No SQLSTATE result exists: SQL never ran. Native lifecycle and Docker end-to-end
  behavior remain unverified; Docker adapter command preservation has unit evidence
  and its default CLI still reaches the same missing-tool gate.

### Remaining execution gates

1. Supply/confirm the actual extracted PostgreSQL 17 binary directory. Do not
   install software or initialize an existing data directory as a workaround.
2. Establish reliable documented listener ownership on this Windows environment
   without treating an unknown state as LISTEN or removing the ownership guard.
   Diagnose using isolated own-socket probes; any necessary system changes remain
   the user's decision/action.
3. Once both gates pass, execute the unchanged full matrix in the new owned native
   cluster, investigate test/transport versus migration failures, rerun affected
   checks and the full matrix, and record actual shutdown/removal evidence.
4. Hosted Supabase roles/capabilities, Data API/Realtime exposure, runtime TLS/pooler/
   primary routing, failover/acknowledged-commit preservation and RPO 0 remain
   pending separately authorized checks. Native PostgreSQL cannot prove them.

All unrelated source, previous work and photos were preserved. Before edits, 296
pre-existing nonignored files were fingerprinted. Final comparison permits only
the runner, this report and the SQL-test README to change, plus the new safety
test file. No SQL/migration/app/dependency/credential file was changed; nothing
was staged, committed, pushed, installed or deployed.

## Initial readiness review (historical)

The following sections record the preceding read-only phase, before the native
transport was implemented. They remain useful machine/setup history; the current
continuation results and implementation status above take precedence.

## Inspection and actual machine findings

Read `backend/TASK_045C_VERIFICATION.md` and inspected the complete prepared
`supabase/tests/run_disposable_security.py`. The Task 045C SQL matrix and migration
remain unchanged. No applicable AGENTS.md was found in the repository; ancestor
instructions were previously checked during the baseline review.

| Check | Actual result |
| --- | --- |
| Windows | Microsoft Windows 11 Home Single Language, 64-bit, version 10.0.26300, build 26300 |
| Processor architecture | AMD64/x86-64; matches the Windows x86-64 PostgreSQL distribution |
| Physical RAM | 15.78 GiB |
| Disk C | 74.46 GiB available, 201.28 GiB total |
| Disk D | 160.43 GiB available, 273.44 GiB total |
| PostgreSQL tools | `postgres`, `initdb`, `pg_ctl`, `psql`: unavailable on PATH; no standard PostgreSQL installation found |
| Container/Supabase tools | Docker, Podman and Supabase CLI unavailable on PATH; standard and per-user container installation probes were absent |
| WSL | `wsl.exe` launcher exists; both status/list commands report WSL is not installed |
| Windows features | WSL, VirtualMachinePlatform and HypervisorPlatform each report InstallState 2 (disabled); Hyper-V-All was not returned |
| Virtualization | HypervisorPresent=true, but firmware virtualization, VM-monitor and SLAT processor flags each report false; these mixed results do not establish Docker/WSL readiness or justify changing BIOS settings |
| Runtime libraries | Installed-program metadata lists Microsoft Visual C++ v14/2022 x64 runtime 14.50.35719 and older 2013 x64 runtimes; binary execution must still establish actual PostgreSQL DLL compatibility |
| Other discovery | No matching PostgreSQL/container/WSL services were returned; no winget, Chocolatey or Scoop command found |

Discovery was bounded to PATH, standard installation locations, per-user Docker
locations, a prospective repository-local tools location, service metadata and
installed-program registry entries. This is not an exhaustive disk scan.

Initial sandboxed CIM requests were denied, and sandboxed drive statistics
reported unusable zero totals. Approved read-only queries outside that restriction
produced the Windows/RAM/CPU/disk figures above. The Windows product-name registry
value still says Windows 10; the successful OS CIM query identifies Windows 11.
The stale registry label and sandbox zero values are not used as compatibility or
capacity evidence. No automatic approval rejection remains outstanding.

## Smallest practical setup

**Recommend the PostgreSQL 17 Windows x86-64 binary ZIP, extracted outside the
repository.** It supplies the server, initialization/control tools, psql, DLLs and
shared resources without installing a Windows database service. PostgreSQL's
official Windows page explicitly offers a binary archive, and EDB currently lists
the 17.x archive as 17.12. Preserve the entire extracted distribution rather than
copying only EXEs. This recommendation uses the official
[PostgreSQL Windows downloads](https://www.postgresql.org/download/windows/) and
[EDB binary archive page](https://www.enterprisedb.com/download-postgresql-binaries).

Native execution needs no Docker, WSL, Hyper-V, firmware virtualization change,
package manager or Python database-driver installation. Reserve approximately
3 GiB of working headroom for the archive, extraction and tiny disposable cluster;
this is a planning allowance, not a measured download size or vendor minimum.
Both measured drives have adequate headroom for that allowance. Native binary
startup on this particular Windows build is not yet verified; EDB describes
comparable desktop Windows support rather than certifying this specific build.

| Option | Machine setup | Existing matrix transport |
| --- | --- | --- |
| Native PostgreSQL 17 ZIP - recommended | Extract binaries; validate existing runtime libraries; no service/VM setup | Needs a focused native process/connection adapter; not implemented yet |
| Docker Desktop + Linux PostgreSQL image | Install/configure WSL 2/container tooling and cache image; potentially reboot | Current runner supports only its local default-context Docker path |
| WSL + native Linux PostgreSQL | Install WSL/distro/server tools | Also needs native transport adaptation; no size/simplicity advantage here |

The current runner's Docker requirement is an implementation choice, not a SQL
requirement. Claiming that dropping native binaries onto PATH makes it work would
be incorrect. It currently hardcodes Docker create/exec/inspect/remove, Linux
socket/process paths and tmpfs. No unsupported `--native`/`--pg-bin` flag or native
run command is advertised. Transport adaptation is deferred until the actual
binaries can validate startup and cleanup behavior, avoiding another unexecuted
runner branch. No test assertion, migration grant or SQL policy was changed.

## User setup steps - not performed by the agent

1. Open the official PostgreSQL Windows downloads page linked above, follow its
   ZIP archive link to EDB and select **PostgreSQL 17, Windows x86-64**. Do not
   choose PostgreSQL 18: the prepared bootstrap intentionally requires major 17.
2. Download the ZIP manually. Extract the full archive into a short, user-writable
   tools directory **outside the Git checkout and OneDrive**. Keep its `pgsql`
   directory, including `bin`, libraries and `share`, intact. Do not run the
   installer, StackBuilder or pgAdmin, and do not register a database service.
3. In a normal, non-administrator PowerShell, verify the extracted binaries with
   the following commands. Enter the local `pgsql\bin` directory at the prompt;
   do not paste that private path or full error output into a report/chat.

   ```powershell
   $pgBin = Read-Host 'Local PostgreSQL 17 bin directory'
   foreach ($toolName in @('postgres', 'initdb', 'pg_ctl', 'psql')) {
       $toolExe = Join-Path $pgBin ($toolName + '.exe')
       if (-not (Test-Path -LiteralPath $toolExe -PathType Leaf)) {
           throw 'Required PostgreSQL binary is missing; stop setup.'
       }
       & $toolExe --version
       if ($LASTEXITCODE -ne 0) {
           throw 'PostgreSQL version check failed; stop setup.'
       }
   }
   ```

4. All four commands should identify the same PostgreSQL 17.x distribution. If a
   DLL/runtime error occurs, stop and report only the missing DLL name or generic
   error category. Existing runtime metadata is not grounds to install extra
   runtime packages automatically. No machine-wide PATH change is required.
5. Tell the agent the binaries are ready. Keep their location available locally
   for the next run. **Do not initialize a cluster, start a service, connect with
   psql, change firewall/BIOS/Windows features or alter any existing database.**
   The next agent step will discover/confirm that tool directory without publishing
   its path and create only a newly owned disposable cluster.

Installation/extraction and any required system changes are paused for the user
as explicitly requested in Task 045D. This is not an approval request to perform
them automatically. Nothing was downloaded by the agent; only public vendor
documentation was browsed.

Docker is an alternative only if preferred for broader development. Its official
[Windows installation requirements](https://docs.docker.com/desktop/setup/install/windows-install/)
describe WSL 2.1.5+, suitable hardware/virtualization and an 8 GB RAM minimum;
Home editions use Linux containers. RAM is sufficient here, but disabled features,
absent WSL and mixed CPU flags mean readiness is unverified. A user choosing that
route would install WSL 2 per Microsoft's instructions, reboot if requested,
install/start Docker Desktop for Linux containers, and manually cache
`postgres:17` before the offline runner can work. No such changes were attempted.
The native ZIP recommendation avoids this system configuration work.

## Actual read-only commands and results

Tool availability was checked with `Get-Command -ErrorAction SilentlyContinue`
for `docker`, `podman`, `psql`, `postgres`, `initdb`, `pg_ctl`, `supabase`, `wsl`,
`winget`, `choco`, `scoop`. `Test-Path` probes and registry/service queries emitted
labels, versions or booleans only, not expanded private installation paths.

Successful read-only system queries, with output limited to relevant properties:

```powershell
Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,BuildNumber,OSArchitecture | ConvertTo-Json -Compress
Get-CimInstance Win32_ComputerSystem | Select-Object HypervisorPresent,@{Name='RAMGiB';Expression={[math]::Round($_.TotalPhysicalMemory/1GB,2)}} | ConvertTo-Json -Compress
Get-CimInstance Win32_Processor | Select-Object AddressWidth,VirtualizationFirmwareEnabled,VMMonitorModeExtensions,SecondLevelAddressTranslationExtensions | ConvertTo-Json -Compress
[System.IO.DriveInfo]::GetDrives() | Where-Object IsReady | ForEach-Object { [PSCustomObject]@{ Drive=$_.Name.Substring(0,1); FreeGiB=[math]::Round($_.AvailableFreeSpace/1GB,2); TotalGiB=[math]::Round($_.TotalSize/1GB,2) } } | ConvertTo-Json -Compress
Get-CimInstance Win32_OptionalFeature | Where-Object { $_.Name -in @('Microsoft-Windows-Subsystem-Linux','VirtualMachinePlatform','Microsoft-Hyper-V-All','HypervisorPlatform') } | Select-Object Name,InstallState | ConvertTo-Json -Compress
wsl.exe --status
wsl.exe --list --quiet
```

The CIM queries exited successfully when given the required read access.
`wsl.exe --status` reported not installed and exited **50**;
`wsl.exe --list --quiet` reported not installed and exited **1**. Each exit code
was captured independently after suppressing the launcher's UTF-16 output.
No Windows feature command
that changes state, installer or package-manager install command was run.

From `backend/`, the existing runner's read-only capability check was repeated:

```powershell
..\.venv\Scripts\python.exe -B ..\supabase\tests\run_disposable_security.py --check
```

Actual output: `BLOCKED: local Docker executable is unavailable`.
**Exit code 2**, explicitly captured from PowerShell `$LASTEXITCODE`.
No image/container/database inspection or connection followed that failure.
No `--run` was repeated because no execution tooling exists and it would hit the
same guard. The native route cannot execute until its binaries and transport
support exist.

`git status --short`, `git diff --name-only` and `git diff --check` were inspected
from the repository root. The previous work, including the ten untracked photos,
was retained. SHA-256 fingerprints of all 295 pre-existing nonignored files were
captured before document creation and compared afterward: no existing file
changed. This also preserves the original migration, SQL matrix and runner.
No tests were rerun for this documentation-only change. Task 045C's historical
192 backend passes are not current SQL evidence or rerun results.

## Resume and evidence requirements

After native tools become available, make only the transport/lifecycle changes
needed to run the **same SQL and interleaved-connection matrix** on a fresh cluster:

- Never accept an existing database/DSN/data directory. Create a unique private
  directory, initialize explicitly as `postgres` and confirm PostgreSQL 17.
- Isolate client settings from ambient PG environment/service files. Use a
  private local socket where supported and validated; otherwise explicitly review
  loopback-only binding/authentication before startup. The Docker socket path
  must not be assumed to work natively: Windows creates no socket by default.
  See [PostgreSQL 17 connection settings](https://www.postgresql.org/docs/17/runtime-config-connection.html).
- Verify ownership and identity of the new cluster before migration replay and
  every connection; do not fall back to an unrelated listener or existing service.
- Preserve actual restricted-role login, all privilege/behavior assertions,
  same-physical-backend reuse, simultaneous A/B sessions and committed-revocation
  visibility. Keep passwords/paths/raw SQL errors out of output.
- Stop only the owned instance and validate the exact directory/ownership before
  cleanup. Do not register a service or modify system settings.
- Record real command/version/phase/SQLSTATE evidence. Classify any failure as
  transport/test defect versus migration defect before changing anything; rerun
  affected checks and then the complete matrix without weakening assertions.

There is currently **no PostgreSQL execution evidence** and therefore no diagnosed
SQL/migration defect. Missing tooling and the Docker-only transport are execution
blockers, not proof that the migration is wrong. Source inspection alone does not
justify a migration or assertion change.

Even a future full local pass cannot establish hosted Supabase bootstrap/FK/role
capabilities, actual platform memberships/PUBLIC grants, Data API exposure,
Realtime configuration, runtime TLS/pooler/primary routing, acknowledged-commit
preservation or failover/RPO 0. Those remain separately authorized hosted checks.
Account provisioning/enforcement, secure mobile sessions and durable logout also
remain separate work; no login-ready or secured-app claim follows from this task.
