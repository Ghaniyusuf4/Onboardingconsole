import { useState } from "react";
import { ArrowSquareOut, Database, ShieldCheck, Copy, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";

const IMPORT_URL = process.env.REACT_APP_IMPORT_PORTAL_URL || "https://singular-import-portal.vercel.app/login.html";

export default function HistoricalImport({ project }) {
  const [iframeKey, setIframeKey] = useState(0);

  const copyContext = async () => {
    const ctx = `Project: ${project.name} (${project.platform})\nCustomer: ${project.customer || "—"}`;
    await navigator.clipboard.writeText(ctx);
    toast.success("Project context copied — paste into the import portal");
  };

  return (
    <div className="space-y-5" data-testid="historical-import-tab">
      {/* Workflow strip */}
      <section className="workflow-strip">
        <div className="wf-step">
          <div className="wf-num">1</div>
          <div className="wf-body">
            <strong>Sign In</strong>
            <p>Authenticate to the Singular Historical Import Portal using your provided credentials.</p>
          </div>
        </div>
        <div className="wf-step">
          <div className="wf-num">2</div>
          <div className="wf-body">
            <strong>Upload &amp; Configure</strong>
            <p>Upload historical device-level data and configure S3 destination / mapping spec.</p>
          </div>
        </div>
        <div className="wf-step">
          <div className="wf-num">3</div>
          <div className="wf-body">
            <strong>Ingest &amp; QA</strong>
            <p>Trigger the import job and verify results in the Singular dashboard.</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left rail */}
        <aside className="lg:col-span-1 space-y-4">
          <section className="panel p-5">
            <p className="eyebrow">Historical Import Portal</p>
            <h3 className="font-display font-bold text-lg text-[var(--sg-fg)] mt-2 leading-tight">Device-level data import</h3>
            <p className="text-xs text-[var(--sg-fg-2)] mt-2">Embedded Singular self-serve import portal. Sign in below to run a historical data import for this customer.</p>
            <div className="flex flex-col gap-2 mt-4">
              <button onClick={copyContext} className="button button-soft w-full justify-start" data-testid="copy-import-context">
                <Copy weight="bold" className="w-4 h-4" /> Copy Project Context
              </button>
              <a href={IMPORT_URL} target="_blank" rel="noreferrer" className="button button-soft w-full justify-start" data-testid="open-portal-tab">
                <ArrowSquareOut weight="bold" className="w-4 h-4" /> Open in New Tab
              </a>
              <button onClick={() => setIframeKey(k => k + 1)} className="button button-ghost w-full justify-start" data-testid="reset-portal">
                Reset Session
              </button>
            </div>
          </section>

          <section className="panel p-5">
            <p className="eyebrow">Pre-flight Checklist</p>
            <ul className="mt-3 space-y-2.5 text-sm text-[var(--sg-fg)]">
              {[
                "Historical file spec agreed with customer",
                "S3 bucket credentials ready (if applicable)",
                "Date range &amp; time zone confirmed",
                "Device identifier column mapped",
                "Install vs. event rows split correctly",
                "Delta file plan for post-integration",
              ].map((t, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <CheckCircle weight="bold" className="w-4 h-4 text-[var(--sg-fg-3)] mt-0.5 flex-shrink-0" />
                  <span dangerouslySetInnerHTML={{__html: t}} />
                </li>
              ))}
            </ul>
          </section>

          <section className="panel p-5">
            <p className="eyebrow">Security Note</p>
            <div className="flex gap-2 mt-3">
              <ShieldCheck weight="fill" className="w-4 h-4 text-[var(--sg-success)] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--sg-fg-2)] leading-relaxed">
                The portal runs inside an isolated iframe. Your session and credentials stay on the portal's domain — they're not accessible to the Onboarding Console.
              </p>
            </div>
          </section>
        </aside>

        {/* Right: embedded portal */}
        <div className="lg:col-span-3">
          <div className="panel overflow-hidden flex flex-col h-[800px]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--sg-border)] bg-[var(--sg-panel-soft)]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[var(--sg-orange-soft)] grid place-items-center text-[var(--sg-orange)]">
                  <Database weight="bold" className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-display font-bold text-sm text-[var(--sg-fg)]">Singular Historical Import Portal</div>
                  <div className="text-[11px] text-[var(--sg-fg-3)]">Self-serve · Device-level ingestion</div>
                </div>
              </div>
              <span className="badge badge-orange">Embedded</span>
            </div>
            <iframe
              key={iframeKey}
              src={IMPORT_URL}
              title="Singular Historical Import Portal"
              className="flex-1 w-full bg-white"
              data-testid="import-iframe"
              allow="clipboard-write; clipboard-read"
            />
          </div>
          <p className="text-[11px] text-[var(--sg-fg-3)] mt-2 px-1">
            Embedded directly from <code className="font-mono">{new URL(IMPORT_URL).hostname}</code> · Your import credentials and uploads are handled by the portal, not stored in the Onboarding Console.
          </p>
        </div>
      </div>
    </div>
  );
}
