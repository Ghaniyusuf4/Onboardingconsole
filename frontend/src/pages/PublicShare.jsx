import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import HealthGauge, { HealthBreakdown } from "@/components/HealthGauge";
import { CheckCircle, Circle, Clock, Warning, ShieldCheck } from "@phosphor-icons/react";

export default function PublicShare() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get(`/public/share/${token}`)
      .then(r => setData(r.data))
      .catch(e => setErr(e?.response?.data?.detail || "Link not found"));
  }, [token]);

  if (err) return (
    <div className="min-h-screen grid place-items-center bg-[var(--sg-bg)] p-8">
      <div className="panel p-12 text-center max-w-md">
        <div className="w-12 h-12 rounded-md bg-[var(--sg-error-bg)] grid place-items-center mx-auto text-[var(--sg-error)]">
          <Warning weight="fill" className="w-6 h-6" />
        </div>
        <h1 className="font-display font-bold text-xl text-[var(--sg-fg)] mt-4">Share link unavailable</h1>
        <p className="text-sm text-[var(--sg-fg-2)] mt-2">{err}</p>
      </div>
    </div>
  );

  if (!data) return <div className="min-h-screen grid place-items-center text-[var(--sg-fg-3)] text-sm">Loading…</div>;

  const total = data.phases.reduce((s, p) => s + p.tasks.length, 0);
  const closed = data.phases.reduce((s, p) => s + p.tasks.filter(t => t.status === "closed").length, 0);
  const pct = total ? Math.round((closed / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[var(--sg-bg)]" data-testid="public-share">
      {/* Topnav */}
      <nav className="panel topnav max-w-[1300px] mx-auto mt-4 mx-3 lg:mx-auto">
        <div className="brand-lockup">
          <span className="brand-mark">S</span>
          <span>Singular</span>
          <span className="brand-service-inline">Customer Onboarding View · Read-only</span>
        </div>
        <span className="badge badge-orange">Shared by your CSM</span>
      </nav>

      <div className="max-w-[1300px] mx-auto px-3 lg:px-0 py-6 space-y-6">
        {/* Header */}
        <header className="panel p-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
            <div className="lg:col-span-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-orange uppercase">{data.platform}</span>
                <span className="badge badge-neutral">{data.customer || "Customer"}</span>
              </div>
              <span className="eyebrow">Onboarding Project</span>
              <h1 className="font-display font-black text-3xl lg:text-5xl text-[var(--sg-fg)] tracking-tight mt-2">{data.name}</h1>
              <p className="text-sm text-[var(--sg-fg-2)] mt-3">A live snapshot of your Singular integration. Updated automatically as your CSM and Solution Engineer make progress.</p>
            </div>
            <div className="lg:col-span-2 panel-soft p-5">
              <div className="flex items-center justify-between">
                <HealthGauge score={data.health.score} grade={data.health.grade} size={100} label="Onboarding Health" />
                <span className="badge badge-orange">Live</span>
              </div>
              <HealthBreakdown breakdown={data.health.breakdown || []} blocked={data.health.blocked} />
            </div>
          </div>
        </header>

        {/* Workflow strip */}
        <section className="workflow-strip">
          <div className="wf-step"><div className="wf-num">1</div><div className="wf-body"><strong>Setup</strong><p>Account provisioning and team access.</p></div></div>
          <div className="wf-step"><div className="wf-num">2</div><div className="wf-body"><strong>Integrate</strong><p>SDK basic integration and partner configuration.</p></div></div>
          <div className="wf-step"><div className="wf-num">3</div><div className="wf-body"><strong>Validate &amp; Launch</strong><p>Live testing, attribution verification, and SKAN launch.</p></div></div>
        </section>

        {/* Status */}
        <section className="panel p-6">
          <div className="section-head">
            <div>
              <h2>Phase Progress</h2>
              <p className="muted">{closed}/{total} tasks complete · {pct}% done</p>
            </div>
            <span className="progress-pill">{pct}%</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.phases.map((p, idx) => {
              const ctot = p.tasks.length;
              const ccl = p.tasks.filter(t => t.status === "closed").length;
              const cinp = p.tasks.filter(t => t.status === "in_progress").length;
              const cblk = p.tasks.filter(t => t.status === "blocked").length;
              const cpct = ctot ? Math.round((ccl/ctot)*100) : 0;
              return (
                <div key={p.id} className="panel-soft p-4" data-testid={`share-phase-${idx}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-[var(--sg-fg-3)] uppercase tracking-wider">P{idx+1}</span>
                    <span className="font-mono text-sm font-semibold text-[var(--sg-fg)]">{cpct}%</span>
                  </div>
                  <h3 className="font-display font-bold text-[var(--sg-fg)] mt-2 leading-tight text-sm">{p.name}</h3>
                  <div className="progress-track mt-3"><div className="progress-fill" style={{ width: `${cpct}%` }} /></div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-[var(--sg-fg-3)]">
                    <span className="inline-flex items-center gap-1"><CheckCircle weight="fill" className="w-3 h-3 text-[var(--sg-success)]" /> {ccl}</span>
                    <span className="inline-flex items-center gap-1"><Clock weight="fill" className="w-3 h-3 text-[var(--sg-warning)]" /> {cinp}</span>
                    <span className="inline-flex items-center gap-1"><Warning weight="fill" className="w-3 h-3 text-[var(--sg-error)]" /> {cblk}</span>
                    <span className="inline-flex items-center gap-1"><Circle weight="bold" className="w-3 h-3" /> {ctot - ccl - cinp - cblk}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Phases tasks */}
        {data.phases.map((phase, pi) => (
          <section key={phase.id} className="panel p-6">
            <div className="section-head">
              <div>
                <p className="text-[10px] font-mono font-bold text-[var(--sg-fg-3)] uppercase tracking-wider">PHASE {pi+1}</p>
                <h2>{phase.name}</h2>
                <p className="muted">{phase.description}</p>
              </div>
              <span className="badge badge-orange">{phase.tasks.length} tasks</span>
            </div>
            <div className="space-y-2">
              {phase.tasks.map(t => {
                const STATUS_BADGE = { open: "badge badge-neutral", in_progress: "badge badge-info", blocked: "badge badge-error", closed: "badge badge-success" };
                const ttot = t.checklist.length;
                const tdone = t.checklist.filter(c => c.done).length;
                return (
                  <div key={t.id} className="panel-soft p-4 flex items-center gap-3">
                    {t.status === "closed" ? <ShieldCheck weight="fill" className="w-5 h-5 text-[var(--sg-success)]" /> : <Circle weight="bold" className="w-5 h-5 text-[var(--sg-fg-3)]" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[var(--sg-fg)] text-sm">{t.title}</div>
                      {t.owner && <div className="text-xs text-[var(--sg-fg-3)] mt-0.5">Owner: {t.owner}</div>}
                    </div>
                    {ttot > 0 && <span className="font-mono text-xs text-[var(--sg-fg-3)]">{tdone}/{ttot}</span>}
                    <span className={STATUS_BADGE[t.status]}>{t.status.replace("_", " ")}</span>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <footer className="max-w-[1300px] mx-auto px-3 lg:px-0 py-6 text-xs text-[var(--sg-fg-3)] flex justify-between">
        <span>© 2026 · Singular Onboarding Console</span>
        <span>Read-only customer view · Auto-updating</span>
      </footer>
    </div>
  );
}
