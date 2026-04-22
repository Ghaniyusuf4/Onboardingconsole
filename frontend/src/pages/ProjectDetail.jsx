import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft } from "@phosphor-icons/react";
import Tracker from "@/components/Tracker";
import TestingConsole from "@/components/TestingConsole";
import Attribution from "@/components/Attribution";
import ApkUpload from "@/components/ApkUpload";
import Overview from "@/components/Overview";
import HealthGauge, { HealthBreakdown } from "@/components/HealthGauge";

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [health, setHealth] = useState(null);

  const reload = async () => {
    const [pr, hr] = await Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/health`),
    ]);
    setProject(pr.data);
    setHealth(hr.data);
  };
  useEffect(() => { reload(); }, [id]);

  if (!project) return <div className="py-12 text-[var(--sg-fg-3)] text-sm">Loading project…</div>;

  const total = project.phases.reduce((s, p) => s + p.tasks.length, 0);
  const closed = project.phases.reduce((s, p) => s + p.tasks.filter(t => t.status === "closed").length, 0);
  const pct = total ? Math.round((closed / total) * 100) : 0;

  return (
    <div className="py-6 space-y-6" data-testid="project-detail-page">
      <header className="panel p-6 lg:p-8">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-[var(--sg-fg-3)] hover:text-[var(--sg-orange)] mb-3 font-semibold uppercase tracking-wider" data-testid="back-to-dashboard">
          <ArrowLeft weight="bold" className="w-3.5 h-3.5" /> Projects
        </Link>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-end">
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-orange uppercase">{project.platform}</span>
              <span className="badge badge-neutral">{project.customer || "No customer"}</span>
            </div>
            <h1 className="font-display font-black text-3xl lg:text-4xl tracking-tight text-[var(--sg-fg)]">{project.name}</h1>
            <p className="text-sm text-[var(--sg-fg-2)] mt-2">Onboarding · SDK validation · Attribution verification</p>
          </div>
          <div className="lg:col-span-2 space-y-3">
            {health && (
              <div className="panel-soft p-5">
                <div className="flex items-center justify-between">
                  <HealthGauge score={health.score} grade={health.grade} size={100} label="Onboarding Health" />
                  <span className="badge badge-orange">Health Score</span>
                </div>
                <HealthBreakdown breakdown={health.breakdown || []} blocked={health.blocked} />
              </div>
            )}
            <div className="status-progress">
              <div className="status-progress-head">
                <div>
                  <strong className="font-display text-[var(--sg-fg)]">Overall completion</strong>
                  <p className="text-xs text-[var(--sg-fg-3)] mt-0.5">{closed}/{total} tasks closed</p>
                </div>
                <span className="progress-pill">{pct}%</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
            </div>
          </div>
        </div>
      </header>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-white border border-[var(--sg-border)] p-1 rounded-md h-auto">
          <TabsTrigger data-testid="tab-overview" value="overview" className="data-[state=active]:bg-[var(--sg-orange-soft)] data-[state=active]:text-[var(--sg-orange)] data-[state=active]:shadow-none">Overview</TabsTrigger>
          <TabsTrigger data-testid="tab-tracker" value="tracker" className="data-[state=active]:bg-[var(--sg-orange-soft)] data-[state=active]:text-[var(--sg-orange)] data-[state=active]:shadow-none">Tracker</TabsTrigger>
          <TabsTrigger data-testid="tab-testing" value="testing" className="data-[state=active]:bg-[var(--sg-orange-soft)] data-[state=active]:text-[var(--sg-orange)] data-[state=active]:shadow-none">Live Testing</TabsTrigger>
          <TabsTrigger data-testid="tab-attribution" value="attribution" className="data-[state=active]:bg-[var(--sg-orange-soft)] data-[state=active]:text-[var(--sg-orange)] data-[state=active]:shadow-none">Attribution</TabsTrigger>
          <TabsTrigger data-testid="tab-apk" value="apk" className="data-[state=active]:bg-[var(--sg-orange-soft)] data-[state=active]:text-[var(--sg-orange)] data-[state=active]:shadow-none">APK Uploads</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-5"><Overview project={project} /></TabsContent>
        <TabsContent value="tracker" className="mt-5"><Tracker project={project} reload={reload} /></TabsContent>
        <TabsContent value="testing" className="mt-5"><TestingConsole project={project} /></TabsContent>
        <TabsContent value="attribution" className="mt-5"><Attribution project={project} /></TabsContent>
        <TabsContent value="apk" className="mt-5"><ApkUpload project={project} /></TabsContent>
      </Tabs>
    </div>
  );
}
