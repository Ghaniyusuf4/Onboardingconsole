import { CheckCircle, Circle, Clock, Warning } from "@phosphor-icons/react";

export default function Overview({ project }) {
  const phaseStats = project.phases.map(p => {
    const total = p.tasks.length;
    const closed = p.tasks.filter(t => t.status === "closed").length;
    const inprog = p.tasks.filter(t => t.status === "in_progress").length;
    const blocked = p.tasks.filter(t => t.status === "blocked").length;
    return { ...p, total, closed, inprog, blocked, pct: total ? Math.round((closed/total)*100) : 0 };
  });

  const completedPhaseCount = phaseStats.filter(p=>p.pct===100).length;

  return (
    <div className="space-y-6" data-testid="overview-tab">
      {/* Workflow strip */}
      <section className="workflow-strip">
        <div className="wf-step">
          <div className="wf-num">1</div>
          <div className="wf-body">
            <strong>Setup &amp; Configure</strong>
            <p>Provision the Singular account, configure apps, set up data connectors and analytics.</p>
          </div>
        </div>
        <div className="wf-step">
          <div className="wf-num">2</div>
          <div className="wf-body">
            <strong>Integrate &amp; Validate</strong>
            <p>SDK basic integration, partner configuration, and live testing across all in-app events.</p>
          </div>
        </div>
        <div className="wf-step">
          <div className="wf-num">3</div>
          <div className="wf-body">
            <strong>Launch &amp; Verify</strong>
            <p>Reporting, fraud rules, GDPR mechanism, SKAN model, and campaign launch with attribution proof.</p>
          </div>
        </div>
      </section>

      {/* 5-step workflow indicator */}
      <section className="panel p-6">
        <div className="section-head">
          <div>
            <h2>Onboarding Workflow</h2>
            <p className="muted">{completedPhaseCount}/{phaseStats.length} phases at 100%</p>
          </div>
          <span className="badge badge-orange">In Progress</span>
        </div>
        <div className="step-grid">
          {[
            { t: "Setup", phaseIdx: 0 },
            { t: "Configure", phaseIdx: 1 },
            { t: "SDK", phaseIdx: 2 },
            { t: "Validate", phaseIdx: 4 },
            { t: "Launch", phaseIdx: 7 },
          ].map((s, i) => {
            const phase = phaseStats[s.phaseIdx];
            const done = phase && phase.pct === 100;
            const active = phase && phase.pct > 0 && phase.pct < 100;
            return (
              <div key={i} className={`step-card ${done ? "is-done" : active ? "is-active" : ""}`} data-testid={`workflow-step-${i}`}>
                <span>{i+1}</span>
                <strong>{s.t}</strong>
              </div>
            );
          })}
        </div>
      </section>

      {/* Phase grid */}
      <section className="panel p-6">
        <div className="section-head">
          <div>
            <h2>Phase Progress</h2>
            <p className="muted">Detailed breakdown of all 8 onboarding phases.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {phaseStats.map((p, idx) => (
            <div key={p.id} className="panel-soft p-4" data-testid={`phase-card-${idx}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-[var(--sg-fg-3)] uppercase tracking-wider">P{idx+1}</span>
                <span className="font-mono text-sm font-semibold text-[var(--sg-fg)]">{p.pct}%</span>
              </div>
              <h3 className="font-display font-bold text-[var(--sg-fg)] mt-2 leading-tight text-sm">{p.name}</h3>
              <p className="text-xs text-[var(--sg-fg-3)] mt-1 line-clamp-2">{p.description}</p>
              <div className="progress-track mt-3"><div className="progress-fill" style={{ width: `${p.pct}%` }} /></div>
              <div className="flex items-center gap-3 mt-3 text-xs text-[var(--sg-fg-3)]">
                <span className="inline-flex items-center gap-1"><CheckCircle weight="fill" className="w-3 h-3 text-[var(--sg-success)]" /> {p.closed}</span>
                <span className="inline-flex items-center gap-1"><Clock weight="fill" className="w-3 h-3 text-[var(--sg-warning)]" /> {p.inprog}</span>
                <span className="inline-flex items-center gap-1"><Warning weight="fill" className="w-3 h-3 text-[var(--sg-error)]" /> {p.blocked}</span>
                <span className="inline-flex items-center gap-1"><Circle weight="bold" className="w-3 h-3" /> {p.total - p.closed - p.inprog - p.blocked}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
