import { ArrowSquareOut, Database, ShieldCheck, Copy, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";

const IMPORT_URL = process.env.REACT_APP_IMPORT_PORTAL_URL || "https://singular-import-portal.vercel.app/login.html";

export default function HistoricalImport({ project }) {
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
            <strong>Copy Context</strong>
            <p>Copy this project's context then open the Import Portal in a new tab.</p>
          </div>
        </div>
        <div className="wf-step">
          <div className="wf-num">2</div>
          <div className="wf-body">
            <strong>Sign In &amp; Upload</strong>
            <p>Authenticate, upload historical device-level data, and configure S3 destination / mapping spec.</p>
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
                Your session and credentials stay on the portal's domain — they are not accessible to the Onboarding Console.
              </p>
            </div>
          </section>
        </aside>

        {/* Right: launch panel */}
        <div className="lg:col-span-3">
          <div className="panel overflow-hidden flex flex-col">
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
              <span className="badge badge-orange">External</span>
            </div>

            {/* Launch card */}
            <div className="flex flex-col items-center justify-center gap-6 py-16 px-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--sg-orange-soft)] grid place-items-center text-[var(--sg-orange)]">
                <Database weight="bold" className="w-8 h-8" />
              </div>
              <div className="max-w-md">
                <h3 className="font-display font-bold text-xl text-[var(--sg-fg)]">Open the Import Portal</h3>
                <p className="text-sm text-[var(--sg-fg-2)] mt-2 leading-relaxed">
                  The portal opens in a new tab so login and file uploads work correctly.
                  Copy this project's context first, then paste it into the portal after signing in.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <button
                  onClick={copyContext}
                  className="button button-soft flex-1 justify-center"
                  data-testid="copy-import-context"
                >
                  <Copy weight="bold" className="w-4 h-4" /> Copy Project Context
                </button>
                <a
                  href={IMPORT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="button button-primary flex-1 justify-center"
                  data-testid="open-portal-tab"
                >
                  <ArrowSquareOut weight="bold" className="w-4 h-4" /> Open Portal
                </a>
              </div>
              <p className="text-[11px] text-[var(--sg-fg-3)]">
                Opens <code className="font-mono">{new URL(IMPORT_URL).hostname}</code> in a new tab
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
