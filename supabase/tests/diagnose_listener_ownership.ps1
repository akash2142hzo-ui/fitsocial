#requires -Version 5.1
# Read-only host diagnosis using only a fresh, exclusive IPv4 loopback socket.
# No PostgreSQL, process control, credentials, system settings or admin elevation.
# Output excludes paths, process names, actual PIDs and unrelated network rows.
$ErrorActionPreference = 'Stop'
try {
    if (-not ('FitSocialOwnedSocketDiagnostic' -as [type])) {
        Add-Type -TypeDefinition @'
using System;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.Collections.Generic;
public static class FitSocialOwnedSocketDiagnostic {
    [StructLayout(LayoutKind.Sequential)] public struct Row {
        public uint State, Address, Port, RemoteAddress, RemotePort, Pid;
    }
    [StructLayout(LayoutKind.Sequential)] public struct Header {
        public uint Count; public Row First;
    }
    [DllImport("iphlpapi.dll")] static extern uint GetExtendedTcpTable(
        IntPtr buffer, ref uint size, bool sorted, uint family, uint tableClass, uint reserved);
    public sealed class TableResult {
        public uint TableClass, SizeStatus, QueryStatus;
        public int RowOffset, RowStride, MatchingRows;
        public bool OwnPidMatches, LoopbackMatches, BoundsValid;
        public uint[] States;
        public bool Valid;
    }
    public sealed class Result {
        public string Decoder = "independent-dotnet-pinvoke";
        public bool ExclusiveBindSucceeded, NondefaultPort, CollisionRejected;
        public int AcceptsConnections, CollisionError;
        public TableResult[] Tables;
        public bool Valid;
    }
    static TableResult ReadTable(int port, uint tableClass) {
        var answer = new TableResult();
        answer.TableClass = tableClass;
        answer.RowOffset = (int)Marshal.OffsetOf(typeof(Header), "First");
        answer.RowStride = Marshal.SizeOf(typeof(Row));
        answer.States = new uint[0];
        for (int attempt = 0; attempt < 3; attempt++) {
            uint size = 0;
            answer.SizeStatus = GetExtendedTcpTable(IntPtr.Zero, ref size, false, 2, tableClass, 0);
            if (answer.SizeStatus != 122 || size < 4 || size > 16777216) return answer;
            IntPtr buffer = Marshal.AllocHGlobal((int)size);
            try {
                answer.QueryStatus = GetExtendedTcpTable(buffer, ref size, false, 2, tableClass, 0);
                if (answer.QueryStatus == 122) continue;
                if (answer.QueryStatus != 0) return answer;
                int count = Marshal.ReadInt32(buffer);
                answer.BoundsValid = count >= 0 &&
                    (long)answer.RowOffset + (long)count * answer.RowStride <= size;
                if (!answer.BoundsValid) return answer;
                var states = new List<uint>();
                bool pidMatches = true, addressMatches = true;
                for (int index = 0; index < count; index++) {
                    Row row = (Row)Marshal.PtrToStructure(
                        IntPtr.Add(buffer, answer.RowOffset + index * answer.RowStride), typeof(Row));
                    int decodedPort = (ushort)IPAddress.NetworkToHostOrder(unchecked((short)(row.Port & 65535)));
                    if (decodedPort != port) continue;
                    states.Add(row.State);
                    pidMatches &= row.Pid == (uint)Process.GetCurrentProcess().Id;
                    addressMatches &= row.Address == 16777343;
                }
                answer.MatchingRows = states.Count;
                answer.States = states.ToArray();
                answer.OwnPidMatches = states.Count > 0 && pidMatches;
                answer.LoopbackMatches = states.Count > 0 && addressMatches;
                answer.Valid = states.Count == 1 && pidMatches && addressMatches && states[0] == 2;
                return answer;
            } finally { Marshal.FreeHGlobal(buffer); }
        }
        return answer;
    }
    public static Result Run() {
        var answer = new Result();
        using (Socket owned = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp)) {
            owned.ExclusiveAddressUse = true;
            owned.Bind(new IPEndPoint(IPAddress.Loopback, 0));
            answer.ExclusiveBindSucceeded = true;
            int port = ((IPEndPoint)owned.LocalEndPoint).Port;
            answer.NondefaultPort = port != 5432;
            owned.Listen(1);
            answer.AcceptsConnections = (int)owned.GetSocketOption(
                SocketOptionLevel.Socket, SocketOptionName.AcceptConnection);
            using (Socket competing = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp)) {
                competing.ExclusiveAddressUse = true;
                try { competing.Bind(new IPEndPoint(IPAddress.Loopback, port)); }
                catch (SocketException error) {
                    answer.CollisionError = error.NativeErrorCode;
                    answer.CollisionRejected = error.SocketErrorCode == SocketError.AddressAlreadyInUse ||
                                              error.SocketErrorCode == SocketError.AccessDenied;
                }
            }
            answer.Tables = new TableResult[] { ReadTable(port, 3), ReadTable(port, 5) };
            answer.Valid = answer.NondefaultPort && answer.AcceptsConnections == 1 &&
                answer.CollisionRejected && answer.Tables[0].Valid && answer.Tables[1].Valid;
        }
        return answer;
    }
}
'@
    }
    $result = [FitSocialOwnedSocketDiagnostic]::Run()
    $result | ConvertTo-Json -Depth 5
    if (-not $result.Valid) {
        Write-Output 'BLOCKED: own-socket listener metadata did not satisfy the ownership contract'
        exit 2
    }
    Write-Output 'PASS: own-socket listener metadata satisfies the ownership contract'
    exit 0
} catch {
    Write-Output ('FAILED: own-socket diagnostic (' + $_.Exception.GetType().Name + '); details withheld')
    exit 2
}
