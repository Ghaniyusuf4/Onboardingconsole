import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { GoogleLogo, ArrowRight, Lightning, ChartBar, ShieldCheck, Cube } from "@phosphor-icons/react";
import SingularLogo from "@/components/SingularLogo";

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && user) navigate("/dashboard", { replace: true }); }, [user, loading, navigate]);

  const onGoogle = () => {
    // Redirect to our own backend Google OAuth endpoint
    const backendUrl = process.env.REACT_APP_BACKEND_URL || "";
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  return (
    <div className="min-h-screen" data-testid="login-page">
      <nav className="panel topnav max-w-[1400px] mx-auto mt-4 mx-4 lg:mx-auto">
        <div className="brand-lockup">
          <SingularLogo height={30} />
          <span>Singular</span>
          <span className="brand-service-inline">Onboarding & Testing Console</span>
        </div>
        <div className="flex items-center gap-2">
          <a className="topnav-link" href="https://support.singular.net" target="_blank" rel="noreferrer">Docs</a>
          <button className="button button-soft h-9" onClick={onGoogle} data-testid="topnav-signin">Sign in</button>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-0 mt-10 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <header className="panel p-10 lg:col-span-3 flex flex-col justify-between" style={{ minHeight: 480 }}>
          <div>
            <span className="eyebrow eyebrow-orange">Powered by Singular</span>
            <div className="font-display font-bold text-[var(--sg-fg-2)] mt-3 text-base">Faster onboarding · Verified attribution</div>
            <h1 className="font-display font-black text-4xl lg:text-6xl text-[var(--sg-fg)] tracking-tight mt-4 leading-[1.05]">
              On-board customers faster.<br/>
              <span className="text-orange">Verify integrations live.</span>
            </h1>
            <p className="text-[var(--sg-fg-2)] mt-5 max-w-xl">
              Track every onboarding phase, validate APK SDK events live against the Singular Testing Console,
              and confirm device attribution — all from one workspace built for CSMs and Solution Engineers.
            </p>
            <div className="flex gap-3 mt-7">
              <button data-testid="google-login-button" onClick={onGoogle} className="button button-primary h-12 px-6">
                <GoogleLogo weight="bold" className="w-5 h-5" /> Continue with Google
                <ArrowRight weight="bold" className="w-4 h-4" />
              </button>
              <a className="button button-soft h-12 px-6" href="https://support.singular.net/hc/en-us/categories/360002441132" target="_blank" rel="noreferrer">SDK Docs</a>
            </div>
          </div>
          <div className="metric-grid mt-10">
            <div className="metric-card"><span>Phases</span><strong>8 phase plan</strong></div>
            <div className="metric-card"><span>Validation</span><strong>SDK + Attribution</strong></div>
            <div className="metric-card"><span>Upload</span><strong>APK · up to 200MB</strong></div>
          </div>
        </header>

        <aside className="panel p-8 lg:col-span-2 flex flex-col gap-3" style={{ minHeight: 480 }}>
          <span className="eyebrow">What you get</span>
          <h2 className="font-display font-bold text-2xl text-[var(--sg-fg)] mt-1">A single source of truth</h2>
          <div className="grid gap-3 mt-3">
            {[
              { icon: Lightning, t: "Live Testing Console", d: "Stream SDK events from your APK and validate session, install, and revenue triggers in real time." },
              { icon: ChartBar, t: "Attribution Verification", d: "Hit the Attribution Details API with device IDs and confirm campaign attribution per device." },
              { icon: ShieldCheck, t: "Auditable Checklists", d: "Eight phases. Forty-plus tasks. Hundreds of checks. Nothing slips through." },
              { icon: Cube, t: "APK Object Storage", d: "Drag-drop uploads with versioning. Stored securely, never exposed via direct URLs." },
            ].map((f, i) => (
              <div key={i} className="flex gap-3 items-start panel-soft p-4">
                <div className="w-9 h-9 rounded-md bg-[var(--sg-orange-soft)] grid place-items-center text-[var(--sg-orange)] flex-shrink-0">
                  <f.icon weight="bold" className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display font-bold text-[var(--sg-fg)] text-sm">{f.t}</div>
                  <div className="text-xs text-[var(--sg-fg-2)] mt-0.5 leading-relaxed">{f.d}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <footer className="max-w-[1400px] mx-auto px-4 lg:px-0 mt-8 mb-8 text-xs text-[var(--sg-fg-3)] flex justify-between">
        <span>© 2026 · For Singular customers and partners</span>
        <span>Built on Singular Testing Console & Attribution Details APIs</span>
      </footer>
    </div>
  );
}
