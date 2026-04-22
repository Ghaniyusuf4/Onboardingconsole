import { Heart, Warning } from "@phosphor-icons/react";

const GRADE_COLORS = {
  A: { fg: "var(--sg-success)", bg: "var(--sg-success-bg)", ring: "#1FA168" },
  B: { fg: "#1F6BFF", bg: "#E1ECFF", ring: "#1F6BFF" },
  C: { fg: "var(--sg-warning)", bg: "var(--sg-warning-bg)", ring: "#C77A00" },
  D: { fg: "var(--sg-orange)", bg: "var(--sg-orange-soft)", ring: "var(--sg-orange)" },
  F: { fg: "var(--sg-error)", bg: "var(--sg-error-bg)", ring: "var(--sg-error)" },
};

export default function HealthGauge({ score = 0, grade = "F", size = 120, label = "Health" }) {
  const c = GRADE_COLORS[grade] || GRADE_COLORS.F;
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex items-center gap-4" data-testid="health-gauge">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} stroke="#EEF0F6" strokeWidth="8" fill="none" />
          <circle
            cx={size/2} cy={size/2} r={r}
            stroke={c.ring} strokeWidth="8" fill="none"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-black text-2xl text-[var(--sg-fg)] leading-none">{score}</span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--sg-fg-3)] mt-0.5">/100</span>
        </div>
      </div>
      <div>
        <span className="eyebrow">{label}</span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="font-display font-black text-3xl text-[var(--sg-fg)]" style={{ color: c.fg }}>{grade}</span>
          <span className="text-xs text-[var(--sg-fg-3)]">grade</span>
        </div>
      </div>
    </div>
  );
}

export function HealthBreakdown({ breakdown = [], blocked = 0 }) {
  return (
    <div className="space-y-2 mt-3" data-testid="health-breakdown">
      {breakdown.map((b, i) => (
        <div key={i} className="flex items-center gap-3 text-xs">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between mb-1">
              <span className="text-[var(--sg-fg-2)] font-medium">{b.label} <span className="text-[var(--sg-fg-3)]">· {b.weight}%</span></span>
              <span className={`font-mono font-semibold ${b.value < 0 ? "text-[var(--sg-error)]" : "text-[var(--sg-fg)]"}`}>
                {b.value > 0 ? "+" : ""}{b.value}{b.note ? <span className="ml-1.5 text-[var(--sg-fg-3)] font-normal">({b.note})</span> : null}
              </span>
            </div>
            <div className="progress-track h-1.5">
              <div className={`h-full rounded-full transition-all`} style={{ width: `${Math.max(0, Math.min(100, Math.abs(b.value)))}%`, background: b.value < 0 ? "var(--sg-error)" : "var(--sg-orange)" }} />
            </div>
          </div>
        </div>
      ))}
      {blocked > 0 && (
        <div className="flex items-center gap-2 text-xs text-[var(--sg-error)] mt-2">
          <Warning weight="fill" className="w-3.5 h-3.5" />
          <span>{blocked} blocked task(s) reducing score</span>
        </div>
      )}
    </div>
  );
}
