import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@phosphor-icons/react";
import Tracker from "@/components/Tracker";
import TestingConsole from "@/components/TestingConsole";
import Attribution from "@/components/Attribution";
import ApkUpload from "@/components/ApkUpload";
import Overview from "@/components/Overview";

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);

  const reload = async () => {
    const r = await api.get(`/projects/${id}`);
    setProject(r.data);
  };
  useEffect(() => { reload(); }, [id]);

  if (!project) return <div className="p-12 text-zinc-400">Loading project…</div>;

  const total = project.phases.reduce((s, p) => s + p.tasks.length, 0);
  const closed = project.phases.reduce((s, p) => s + p.tasks.filter(t => t.status === "closed").length, 0);
  const pct = total ? Math.round((closed / total) * 100) : 0;

  return (
    <div className="min-h-screen" data-testid="project-detail-page">
      <div className="border-b border-zinc-200 bg-white sticky top-0 z-20 backdrop-blur-md">
        <div className="px-8 lg:px-12 py-5 max-w-[1500px] mx-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-3" data-testid="back-to-dashboard">
            <ArrowLeft weight="bold" className="w-3.5 h-3.5" /> Projects
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{project.platform} · {project.customer || "—"}</p>
              <h1 className="font-display font-black text-3xl lg:text-4xl tracking-tight text-zinc-950">{project.name}</h1>
            </div>
            <div className="flex items-center gap-6">
              <div className="min-w-[200px]">
                <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                  <span>Overall completion</span>
                  <span className="font-mono font-semibold text-zinc-900">{pct}%</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0055FF] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-xs text-zinc-500 mt-1.5">{closed}/{total} tasks closed</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 lg:px-12 py-8 max-w-[1500px] mx-auto">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-zinc-100 p-1 rounded-md">
            <TabsTrigger data-testid="tab-overview" value="overview">Overview</TabsTrigger>
            <TabsTrigger data-testid="tab-tracker" value="tracker">Tracker</TabsTrigger>
            <TabsTrigger data-testid="tab-testing" value="testing">Live Testing</TabsTrigger>
            <TabsTrigger data-testid="tab-attribution" value="attribution">Attribution</TabsTrigger>
            <TabsTrigger data-testid="tab-apk" value="apk">APK Uploads</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6"><Overview project={project} /></TabsContent>
          <TabsContent value="tracker" className="mt-6"><Tracker project={project} reload={reload} /></TabsContent>
          <TabsContent value="testing" className="mt-6"><TestingConsole project={project} /></TabsContent>
          <TabsContent value="attribution" className="mt-6"><Attribution project={project} /></TabsContent>
          <TabsContent value="apk" className="mt-6"><ApkUpload project={project} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
