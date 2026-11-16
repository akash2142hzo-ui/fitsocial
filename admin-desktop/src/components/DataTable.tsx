import { useState } from "react";
import { filterRows, type DemoRow } from "../demo";
import { Status } from "./Layout";

export function DataTable({ title, columns, rows }: { title: string; columns: [string, string, string]; rows: DemoRow[] }) {
  const [query, setQuery] = useState("");
  const visible = filterRows(rows, query);
  return <>
    <div className="table-toolbar"><label className="search-label"><span className="sr-only">Search {title} demo records</span>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg>
      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search demo records…" maxLength={120} /></label>
      <span className="table-count" role="status">{visible.length} of {rows.length} demo records</span></div>
    <div className="table-scroll" role="region" aria-label={`${title} demo records`} tabIndex={0}>
      <table><caption className="sr-only">{title} — fictional demo records, read only</caption>
        <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{visible.map((row) => <tr key={row.id}><th scope="row"><span className="record-name">{row.name}</span><span className="record-detail">{row.detail}</span></th><td><Status>{row.status}</Status></td><td>{row.value}</td></tr>)}</tbody>
      </table>
      {visible.length === 0 && <div className="empty"><h3>No matching demo records</h3><p>Try another name, state or value.</p><button className="button-secondary" onClick={() => setQuery("")}>Clear search</button></div>}
    </div>
  </>;
}
