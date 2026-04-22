import { CheckCircle, Circle, Clock, Warning } from "@phosphor-icons/react";

export default function Overview({ project }) {
  const phaseStats = project.phases.map(p => {
    const total = p.tasks.length;
    const closed = p.tasks.filter(t => t.status === "closed").length;
    const inprog = p.tasks.filter(t => t.status === "in_progress").length;
    const blocked = p.tasks.filter(t => t.status === "blocked").length;
    return { ...p, total, closed, inprog, blocked, pct: total ? Math.round((closed/total)*100) : 0 };
  });

  return (
    <div className="space-y-8" data-testid="overview-tab">
      {/* Workflow strip */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6">
        <p className="eyebrow">Onboarding Workflow</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-0 mt-4 border border-zinc-200 rounded-lg divide-y md:divide-y-0 md:divide-x divide-zinc-200">
          {[
            { n: 1, t: "Setup", d: "Provision & access" },
            { n: 2, t: "Configure", d: "Apps & data" },
            { n: 3, t: "SDK", d: "Integration & QA" },
            { n: 4, t: "Validate", d: "Live testing & attribution" },
            { n: 5, t: "Launch", d: "SKAN & campaigns" },
          ].map((s, i) => {
            const active = i < Math.ceil(phaseStats.filter(p=>p.pct===100).length / Math.max(1, phaseStats.length) * 5);
            return (
              <div key={s.n} className="p-5 flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full grid place-items-center text-sm font-bold ${active ? "bg-[#0055FF] text-white" : "bg-zinc-100 text-zinc-500"}`}>{s.n}</div>
                <div>
                  <div className="font-display font-bold text-zinc-900">{s.t}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{s.d}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase grid */}
      <div>
        <p className="eyebrow mb-4">Phase Progress</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {phaseStats.map((p, idx) => (
            <div key={p.id} className="bg-white border border-zinc-200 rounded-xl p-5" data-testid={`phase-card-${idx}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-zinc-400">P{idx+1}</span>
                <span className="font-mono text-sm font-semibold text-zinc-900">{p.pct}%</span>
              </div>
              <h3 className="font-display font-bold text-zinc-900 mt-2 leading-tight">{p.name}</h3>
              <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{p.description}</p>
              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-4">
                <div className="h-full bg-[#0055FF] rounded-full transition-all duration-500" style={{ width: `${p.pct}%` }} />
              </div>
              <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1"><CheckCircle weight="fill" className="w-3 h-3 text-emerald-500" /> {p.closed}</span>
                <span className="inline-flex items-center gap-1"><Clock weight="fill" className="w-3 h-3 text-amber-500" /> {p.inprog}</span>
                <span className="inline-flex items-center gap-1"><Warning weight="fill" className="w-3 h-3 text-red-500" /> {p.blocked}</span>
                <span className="inline-flex items-center gap-1"><Circle weight="bold" className="w-3 h-3" /> {p.total - p.closed - p.inprog - p.blocked}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
