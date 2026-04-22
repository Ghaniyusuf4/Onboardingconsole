import { useState } from "react";
import { CaretDown, Info, Question } from "@phosphor-icons/react";

/**
 * Collapsible "How to use" explainer used on Testing Console, Attribution & APK tabs.
 * Pass `title`, `summary`, and an array of `steps` = [{label, body, href?}].
 */
export default function GuidancePanel({ title, summary, steps = [], defaultOpen = false, testId = "guidance-panel" }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="panel p-0 overflow-hidden" data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-[var(--sg-panel-soft)] transition-colors"
        data-testid={`${testId}-toggle`}
      >
        <div className="w-9 h-9 rounded-md grid place-items-center flex-shrink-0"
             style={{ background: "var(--sg-blue-soft)", color: "var(--sg-blue)" }}>
          <Question weight="bold" className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-[var(--sg-fg)]">{title}</h3>
          <p className="text-sm text-[var(--sg-fg-3)] line-clamp-2">{summary}</p>
        </div>
        <CaretDown weight="bold" className={`w-4 h-4 text-[var(--sg-fg-3)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-0 border-t border-[var(--sg-border)]">
          <ol className="mt-4 space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3" data-testid={`${testId}-step-${i}`}>
                <span className="w-6 h-6 rounded-full flex-shrink-0 text-xs font-display font-bold grid place-items-center"
                      style={{ background: "var(--sg-blue)", color: "#fff" }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-[var(--sg-fg)]">{s.label}</div>
                  <div className="text-xs text-[var(--sg-fg-3)] mt-0.5 leading-relaxed">
                    {s.body}
                    {s.href && (
                      <>
                        {" "}
                        <a href={s.href} target="_blank" rel="noreferrer" className="text-[var(--sg-blue)] hover:underline font-medium">
                          Open docs →
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-4 p-3 rounded-md text-xs text-[var(--sg-fg-2)] flex gap-2 items-start"
               style={{ background: "var(--sg-blue-soft)", border: "1px solid var(--sg-blue)" }}>
            <Info weight="bold" className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--sg-blue)]" />
            <div>All calls to Singular happen server-side — keys never leave this workspace.</div>
          </div>
        </div>
      )}
    </section>
  );
}
