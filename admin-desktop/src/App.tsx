import { useRef, useState } from "react";
import { demoModules, modules, type ModuleId } from "./demo";
import { DataTable } from "./components/DataTable";
import { Icon } from "./components/Icon";
import { MetricCard, Panel, Sidebar } from "./components/Layout";

function ActivityChart() {
  return <figure className="activity-chart"><svg viewBox="0 0 640 190" role="img" aria-labelledby="activity-title" aria-describedby="activity-description">
    <title id="activity-title">Sample weekly activity</title><desc id="activity-description">Fictional active members, 09–15 November 2026: 420, 510, 480, 640, 590, 720, 842.</desc>
    <g className="chart-grid"><path d="M42 20H620 M42 65H620 M42 110H620 M42 155H620" /></g>
    <g className="chart-labels"><text x="0" y="24">900</text><text x="0" y="69">600</text><text x="0" y="114">300</text><text x="14" y="159">0</text></g>
    <path className="chart-area" d="M44 92 140 78 236 83 332 59 428 66 524 47 620 29V155H44Z" />
    <path className="chart-line" d="M44 92 140 78 236 83 332 59 428 66 524 47 620 29" />
    <circle cx="620" cy="29" r="5" className="chart-dot" />
    <g className="chart-labels"><text x="42" y="183">Mon</text><text x="130" y="183">Tue</text><text x="226" y="183">Wed</text><text x="322" y="183">Thu</text><text x="418" y="183">Fri</text><text x="514" y="183">Sat</text><text x="594" y="183">Sun</text></g>
  </svg><figcaption>09–15 Nov 2026 · Illustrative active members</figcaption></figure>;
}

function Overview({ onNavigate }: { onNavigate: (id: ModuleId) => void }) {
  return <>
    <div className="welcome-panel"><div><p className="eyebrow">WORKSPACE SNAPSHOT</p><h2>A clear view of your community.</h2><p>Explore the shape of FitSocial operations, one demo module at a time.</p></div><div className="welcome-art" aria-hidden="true"><span /><span /><span /><Icon name="analytics" /></div></div>
    <div className="metric-grid">
      <MetricCard label="Total members" value="2,480" detail="Fictional community total" icon="users" />
      <MetricCard label="Weekly active" value="842" detail="Sample · 09–15 Nov 2026" icon="analytics" />
      <MetricCard label="Reports to review" value="2" detail="Fictional moderation queue" icon="moderation" />
      <MetricCard label="Trainer applications" value="2" detail="Fictional applications" icon="trainers" />
    </div>
    <div className="overview-grid"><Panel title="Community activity" eyebrow="DEMO ANALYTICS" aside={<span className="quiet-pill">Last sample week</span>}><ActivityChart /></Panel>
      <Panel title="Review queues" eyebrow="DEMO OPERATIONS"><div className="queue-list">
        <button className="queue-item" onClick={() => onNavigate("moderation")}><span className="queue-icon"><Icon name="moderation" /></span><span>Content reports<small>Fictional review queue</small></span><strong>2</strong><span aria-hidden="true">›</span></button>
        <button className="queue-item" onClick={() => onNavigate("trainers")}><span className="queue-icon"><Icon name="trainers" /></span><span>Trainer applications<small>Fictional applications</small></span><strong>2</strong><span aria-hidden="true">›</span></button>
        <button className="queue-item" onClick={() => onNavigate("orders")}><span className="queue-icon"><Icon name="orders" /></span><span>Order previews<small>No transactions</small></span><strong>2</strong><span aria-hidden="true">›</span></button>
      </div><p className="panel-note">Browse sample records. Administrative actions are unavailable.</p></Panel></div>
    <Panel title="Workspace activity" eyebrow="FICTIONAL EXAMPLES" aside={<span className="quiet-pill">Read only</span>}>
      <ol className="activity-list"><li><span className="activity-dot" /><div><strong>Sample content report added</strong><p>A fictional post was placed in the review queue.</p></div><span className="activity-time">Example 01</span></li>
        <li><span className="activity-dot" /><div><strong>Sample trainer application received</strong><p>A fictional strength trainer profile is ready to preview.</p></div><span className="activity-time">Example 02</span></li>
        <li><span className="activity-dot" /><div><strong>Rewards catalog preview prepared</strong><p>Two cosmetic reward concepts are available to browse.</p></div><span className="activity-time">Example 03</span></li></ol>
    </Panel>
  </>;
}

export function App() {
  const [active, setActive] = useState<ModuleId>("overview");
  const heading = useRef<HTMLHeadingElement>(null);
  const current = modules.find((module) => module.id === active)!;
  function navigate(id: ModuleId) {
    setActive(id);
    heading.current?.focus();
    document.getElementById("main")?.scrollTo?.({ top: 0 });
  }
  const data = active === "overview" ? null : demoModules[active];
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <Sidebar active={active} onNavigate={navigate} />
    <main id="main" tabIndex={-1}>
      <header className="topbar"><p>Workspace <span aria-hidden="true">/</span> <strong>{current.label}</strong></p><span className="connection-state"><span aria-hidden="true" />Local demo · Offline data</span></header>
      <div className="page-content"><div className="demo-banner"><span className="demo-pill">DEMO</span><p>Fictional data only. No production connection or administrative actions.</p></div>
        <div className="page-heading"><div><p className="eyebrow">FITSOCIAL ADMIN STUDIO</p><h1 ref={heading} tabIndex={-1}>{current.label}</h1><p>{data?.description ?? "Your community, at a glance. All figures below are fictional examples."}</p></div><span className="quiet-pill">Prototype 0.1</span></div>
        {active === "overview" ? <Overview onNavigate={navigate} /> : data && <>
          <Panel title={`${current.label} preview`} eyebrow="DEMO DATA" aside={<span className="quiet-pill">Read only</span>}>
            <DataTable key={active} title={current.label} columns={data.columns} rows={data.rows} />
          </Panel>
          <section className="boundary-note" aria-label="Module limitations"><Icon name="moderation" /><div><h2>Preview only</h2><p>{data.note}</p></div></section>
          {active === "team" && <div className="unavailable-control"><button className="button-secondary" disabled aria-describedby="invite-note">Invite teammate — unavailable</button><p id="invite-note">Future invitations require owner authorization and MFA through the admin API.</p></div>}
        </>}
        <footer>FitSocial Admin Studio <span>Local prototype · Not authenticated · Not production-ready</span></footer>
      </div>
    </main>
  </div>;
}
