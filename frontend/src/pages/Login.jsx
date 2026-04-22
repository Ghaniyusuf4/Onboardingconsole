import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { GoogleLogo, ArrowRight, Lightning, ChartBar, ShieldCheck } from "@phosphor-icons/react";

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && user) navigate("/dashboard", { replace: true }); }, [user, loading, navigate]);

  const onGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white" data-testid="login-page">
      <div className="flex flex-col justify-between p-10 lg:p-16">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-[#0055FF] grid place-items-center text-white font-display font-black">S</div>
          <span className="font-display font-bold text-zinc-900">Singular Onboarding</span>
        </div>
        <div className="max-w-md">
          <p className="eyebrow mb-4">Onboarding · Testing · Attribution</p>
          <h1 className="font-display font-black text-5xl lg:text-6xl tracking-tight text-zinc-950 leading-[1.05]">
            Ship Singular integrations<br/>
            <span className="text-[#0055FF]">faster</span>, with proof.
          </h1>
          <p className="text-zinc-600 mt-6 text-base leading-relaxed">
            Track every onboarding phase, validate APK SDK events live, and confirm attribution — all from one workspace built for CSMs and Solution Engineers.
          </p>
          <Button onClick={onGoogle} data-testid="google-login-button" className="mt-8 h-12 px-6 bg-zinc-950 hover:bg-zinc-800 text-white rounded-md font-medium gap-2">
            <GoogleLogo weight="bold" className="w-5 h-5" />
            Continue with Google
            <ArrowRight weight="bold" className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-xs text-zinc-400">© 2026 · For Singular customers and partners</div>
      </div>
      <div className="hidden lg:flex bg-[#F4F4F5] border-l border-zinc-200 p-12 flex-col justify-center">
        <div className="grid gap-4 max-w-lg">
          {[
            { icon: Lightning, t: "Live Testing Console", d: "Stream SDK events from your APK and validate session, install, and revenue triggers in real time." },
            { icon: ChartBar, t: "Attribution Verification", d: "Hit the Attribution Details API with device IDs and confirm campaign attribution per device." },
            { icon: ShieldCheck, t: "Auditable Checklists", d: "Eight phases. Forty-plus tasks. Hundreds of checks. Nothing slips through." },
          ].map((f, i) => (
            <div key={i} className="bg-white border border-zinc-200 rounded-xl p-5 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-md bg-[#0055FF]/10 grid place-items-center text-[#0055FF]">
                <f.icon weight="bold" className="w-5 h-5" />
              </div>
              <div>
                <div className="font-display font-bold text-zinc-900">{f.t}</div>
                <div className="text-sm text-zinc-600 mt-1">{f.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
