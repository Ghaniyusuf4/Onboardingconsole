import { useState } from "react";
import { ArrowSquareOut, Robot, Lightning, Lightbulb, Copy } from "@phosphor-icons/react";
import { toast } from "sonner";

const COPILOT_URL = process.env.REACT_APP_COPILOT_URL || "https://onboarding-copilot.pages.dev/";

const STARTER_PROMPTS = [
  { title: "Onboarding Checklist", desc: "Full step-by-step sequence" },
  { title: "Deep Link Prerequisites", desc: "iOS Universal Links + Android App Links" },
  { title: "Post-Install SDK Callback", desc: "DDL, passthrough & attribution info" },
  { title: "Meta AEM vs Google ICM vs SKAN", desc: "iOS privacy measurement" },
  { title: "How do I test SDK integration?", desc: "Live testing workflow" },
  { title: "How to verify device attribution?", desc: "Attribution Details API guide" },
];

export default function SECopilot({ project }) {
  const [iframeKey, setIframeKey] = useState(0);

  const copyContext = async () => {
    const ctx = `Project: ${project.name} (${project.platform})\nCustomer: ${project.customer || "—"}`;
    await navigator.clipboard.writeText(ctx);
    toast.success("Project context copied — paste into the Copilot intake form");
  };

  return (
    <div className="space-y-5" data-testid="se-copilot-tab">
      {/* Workflow strip */}
      <section className="workflow-strip">
        <div className="wf-step">
          <div className="wf-num">1</div>
          <div className="wf-body">
            <strong>Ask in Plain English</strong>
            <p>Stuck on SDK integration? Type your question — the Copilot checks recent solved cases first.</p>
          </div>
        </div>
        <div className="wf-step">
          <div className="wf-num">2</div>
          <div className="wf-body">
            <strong>Get Instant Answer</strong>
            <p>Powered by Claude with retrieval over Singular Help Center + recent SE cases.</p>
          </div>
        </div>
        <div className="wf-step">
          <div className="wf-num">3</div>
          <div className="wf-body">
            <strong>Apply &amp; Verify</strong>
            <p>Use the answer to fix the integration, then re-run live testing in the next tab.</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left rail: starter prompts + actions */}
        <aside className="lg:col-span-1 space-y-4">
          <section className="panel p-5">
            <p className="eyebrow">Singular SE Co-Pilot</p>
            <h3 className="font-display font-bold text-lg text-[var(--sg-fg)] mt-2 leading-tight">Live developer help</h3>
            <p className="text-xs text-[var(--sg-fg-2)] mt-2">Ask integration questions and get instant, source-backed answers.</p>
            <div className="flex flex-col gap-2 mt-4">
              <button onClick={copyContext} className="button button-soft w-full justify-start" data-testid="copy-project-context">
                <Copy weight="bold" className="w-4 h-4" /> Copy Project Context
              </button>
              <a href={COPILOT_URL} target="_blank" rel="noreferrer" className="button button-soft w-full justify-start" data-testid="open-copilot-tab">
                <ArrowSquareOut weight="bold" className="w-4 h-4" /> Open in New Tab
              </a>
              <button onClick={() => setIframeKey(k => k + 1)} className="button button-ghost w-full justify-start" data-testid="reset-copilot">
                Reset Conversation
              </button>
            </div>
          </section>

          <section className="panel p-5">
            <p className="eyebrow">Starter Prompts</p>
            <div className="mt-3 space-y-2">
              {STARTER_PROMPTS.map((s, i) => (
                <div key={i} className="panel-soft p-3 text-xs hover:border-[var(--sg-orange)] transition-colors" data-testid={`starter-${i}`}>
                  <div className="flex items-start gap-2">
                    <Lightbulb weight="fill" className="w-3.5 h-3.5 text-[var(--sg-orange)] mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-[var(--sg-fg)]">{s.title}</div>
                      <div className="text-[var(--sg-fg-3)] mt-0.5">{s.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[var(--sg-fg-3)] mt-3 leading-relaxed">
              Click "Open in New Tab" then paste these into the Copilot's question box.
            </p>
          </section>
        </aside>

        {/* Right: embedded copilot */}
        <div className="lg:col-span-3">
          <div className="panel overflow-hidden flex flex-col h-[760px]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--sg-border)] bg-[var(--sg-panel-soft)]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[var(--sg-orange-soft)] grid place-items-center text-[var(--sg-orange)]">
                  <Robot weight="bold" className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-display font-bold text-sm text-[var(--sg-fg)]">Singular Onboarding Assistant</div>
                  <div className="text-[11px] text-[var(--sg-fg-3)]">Powered by Claude · Recent cases + Help Center retrieval</div>
                </div>
              </div>
              <span className="badge badge-success">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--sg-success)]" /> Online
              </span>
            </div>
            <iframe
              key={iframeKey}
              src={COPILOT_URL}
              title="Singular SE Co-Pilot"
              className="flex-1 w-full bg-white"
              data-testid="copilot-iframe"
              allow="clipboard-write"
            />
          </div>
          <p className="text-[11px] text-[var(--sg-fg-3)] mt-2 px-1 flex items-center gap-1.5">
            <Lightning weight="fill" className="w-3 h-3 text-[var(--sg-orange)]" />
            Embedded directly from <code className="font-mono">onboarding-copilot.pages.dev</code> · Conversations are not stored in your Singular project.
          </p>
        </div>
      </div>
    </div>
  );
}
