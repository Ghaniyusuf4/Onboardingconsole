import { CheckCircle, XCircle, ShieldCheck, Info } from "@phosphor-icons/react";

export default function ApkAuditReport({ audit }) {
  if (!audit) return null;
  const findings = audit.findings || [];
  const score = audit.score || { passed: 0, total: findings.length };
  const pct = score.total ? Math.round((score.passed / score.total) * 100) : 0;
  const has = audit.has_singular_sdk;
  const version = audit.sdk_version;

  return (
    <div className="panel-soft p-4 mt-3" data-testid="apk-audit-report">
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <span className={`badge ${has ? "badge-success" : "badge-error"}`}>
          {has ? <ShieldCheck weight="bold" className="w-3 h-3" /> : <XCircle weight="bold" className="w-3 h-3" />}
          {has ? "Singular SDK detected" : "Singular SDK NOT detected"}
        </span>
        {version && <span className="badge badge-neutral">SDK v{version}</span>}
        {audit.manifest?.package && (
          <span className="text-xs font-mono text-[var(--sg-fg-2)]">{audit.manifest.package}
            {audit.manifest.version_name ? ` · v${audit.manifest.version_name}` : ""}
          </span>
        )}
        <span className="ml-auto text-xs text-[var(--sg-fg-3)]">
          {score.passed}/{score.total} checks · {pct}%
        </span>
      </div>

      <div className="progress-track mb-4"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>

      <ul className="space-y-2">
        {findings.map((f, i) => (
          <li key={i} className="flex gap-2 items-start text-sm" data-testid={`audit-finding-${i}`}>
            {f.ok
              ? <CheckCircle weight="fill" className="w-4 h-4 text-[var(--sg-success)] mt-0.5 flex-shrink-0" />
              : <XCircle weight="fill" className="w-4 h-4 text-[var(--sg-error)] mt-0.5 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[var(--sg-fg)]">{f.label}</div>
              <div className="text-xs text-[var(--sg-fg-3)] font-mono break-words">{f.detail}</div>
            </div>
          </li>
        ))}
      </ul>

      {audit.errors?.length > 0 && (
        <div className="mt-3 p-3 rounded-md bg-[#FFF4F2] border border-[#F4B4A9] text-xs text-[#9A2C1C] flex gap-2 items-start">
          <Info weight="bold" className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>{audit.errors.join(" · ")}</div>
        </div>
      )}
    </div>
  );
}
