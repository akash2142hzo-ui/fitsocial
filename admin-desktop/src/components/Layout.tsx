import type { ReactNode } from "react";
import { modules, type ModuleId } from "../demo";
import { Icon } from "./Icon";

export function Sidebar({ active, onNavigate }: { active: ModuleId; onNavigate: (id: ModuleId) => void }) {
  return <aside className="sidebar">
    <a className="brand" href="#main"><span className="brand-mark" aria-hidden="true">F<span>↗</span></span><span>FitSocial<small>ADMIN STUDIO</small></span></a>
    <div className="workspace"><span className="workspace-symbol" aria-hidden="true">FS</span><div>Demo workspace<small>Local prototype</small></div><span className="workspace-dot" aria-hidden="true" /></div>
    <nav aria-label="Admin modules">
      {["Workspace", "Commerce", "Manage"].map((section) => <div className="nav-group" key={section}>
        <p className="nav-caption">{section}</p>
        {modules.filter((module) => module.section === section).map((module) => <button key={module.id}
          className={`nav-item ${active === module.id ? "is-active" : ""}`} aria-current={active === module.id ? "page" : undefined}
          onClick={() => onNavigate(module.id)}><Icon name={module.id} /><span>{module.label}</span>
          {module.id === "moderation" && <span className="nav-count" aria-label="2 demo reports awaiting review">2</span>}
        </button>)}
      </div>)}
    </nav>
    <div className="sidebar-bottom"><span className="avatar" aria-hidden="true">D</span><div>Demo viewer<small>Not authenticated</small></div><span className="demo-pill">DEMO</span></div>
  </aside>;
}

export function Panel({ title, eyebrow, children, aside }: { title: string; eyebrow?: string; children: ReactNode; aside?: ReactNode }) {
  return <section className="panel"><div className="panel-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{aside}</div>{children}</section>;
}

export function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ModuleId }) {
  return <section className="metric-card"><div className="metric-top"><h2>{label}</h2><Icon name={icon} /></div><p className="metric-value">{value}</p><p className="metric-detail">{detail}</p></section>;
}

export function Status({ children }: { children: string }) {
  return <span className={`status ${["Active", "Reviewed"].includes(children) ? "status-green" : ["Review", "Pending"].includes(children) ? "status-amber" : ""}`}><span aria-hidden="true">●</span> {children}</span>;
}
