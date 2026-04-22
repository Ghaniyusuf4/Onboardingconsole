import { useState } from "react";
import { api } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CaretDown, CaretRight } from "@phosphor-icons/react";

const STATUS_OPTIONS = ["open", "in_progress", "blocked", "closed"];
const PRIORITY_OPTIONS = ["low", "medium", "high"];
const STATUS_COLORS = {
  open: "bg-zinc-100 text-zinc-700 border-zinc-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  blocked: "bg-red-50 text-red-700 border-red-200",
  closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};
const PRIORITY_COLORS = {
  low: "bg-zinc-100 text-zinc-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

const AVATARS = [
  "https://images.unsplash.com/photo-1576558656222-ba66febe3dec?crop=entropy&cs=srgb&fm=jpg&w=64&q=80",
  "https://images.unsplash.com/photo-1762522926157-bcc04bf0b10a?crop=entropy&cs=srgb&fm=jpg&w=64&q=80",
  "https://images.unsplash.com/photo-1769636929388-99eff95d3bf1?crop=entropy&cs=srgb&fm=jpg&w=64&q=80",
  "https://images.unsplash.com/photo-1672685667592-0392f458f46f?crop=entropy&cs=srgb&fm=jpg&w=64&q=80",
];
const ownerAvatar = (owner) => {
  if (!owner) return null;
  const i = Math.abs(owner.split("").reduce((a,c)=>a+c.charCodeAt(0),0)) % AVATARS.length;
  return AVATARS[i];
};

function TaskRow({ task, projectId, reload, idx }) {
  const [open, setOpen] = useState(false);
  const total = task.checklist.length;
  const done = task.checklist.filter(c => c.done).length;

  const updateTask = async (patch) => {
    await api.patch(`/projects/${projectId}/tasks/${task.id}`, patch);
    reload();
  };
  const toggleCheck = async (item) => {
    await api.patch(`/projects/${projectId}/tasks/${task.id}/checklist/${item.id}`, { done: !item.done });
    reload();
  };

  return (
    <>
      <TableRow data-testid={`task-row-${task.id}`}>
        <TableCell>
          <button onClick={() => setOpen(!open)} className="text-zinc-400 hover:text-zinc-700" data-testid={`expand-task-${task.id}`}>
            {open ? <CaretDown weight="bold" /> : <CaretRight weight="bold" />}
          </button>
        </TableCell>
        <TableCell className="font-medium text-zinc-900">{task.title}</TableCell>
        <TableCell>
          {task.owner && (
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6"><AvatarImage src={ownerAvatar(task.owner)} /><AvatarFallback>{task.owner[0]}</AvatarFallback></Avatar>
              <span className="text-sm text-zinc-600">{task.owner}</span>
            </div>
          )}
        </TableCell>
        <TableCell>
          <Select value={task.status} onValueChange={(v) => updateTask({ status: v })}>
            <SelectTrigger data-testid={`status-select-${task.id}`} className={`h-7 text-xs border ${STATUS_COLORS[task.status]} w-[130px]`}><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}</SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Select value={task.priority} onValueChange={(v) => updateTask({ priority: v })}>
            <SelectTrigger className={`h-7 text-xs ${PRIORITY_COLORS[task.priority]} border-0 w-[100px]`}><SelectValue /></SelectTrigger>
            <SelectContent>{PRIORITY_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </TableCell>
        <TableCell><span className="font-mono text-xs text-zinc-600">{done}/{total}</span></TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={6} className="bg-zinc-50/50">
            <div className="py-2 pl-6">
              <p className="eyebrow mb-3">Checklist</p>
              <div className="space-y-2">
                {task.checklist.map(item => (
                  <label key={item.id} data-testid={`checklist-item-${item.id}`} className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-md transition">
                    <Checkbox checked={item.done} onCheckedChange={() => toggleCheck(item)} />
                    <span className={`text-sm ${item.done ? "line-through text-zinc-400" : "text-zinc-700"}`}>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function PhaseColumn({ phase, projectId, reload, idx }) {
  return (
    <div className="min-w-[300px] w-[300px] bg-zinc-50/50 border border-zinc-200 rounded-xl p-4" data-testid={`kanban-column-${idx}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-mono font-semibold text-zinc-400">P{idx+1}</p>
          <h3 className="font-display font-bold text-sm text-zinc-900">{phase.name}</h3>
        </div>
        <Badge variant="secondary" className="font-mono text-xs">{phase.tasks.length}</Badge>
      </div>
      <div className="space-y-2">
        {phase.tasks.map(t => (
          <KanbanCard key={t.id} task={t} projectId={projectId} reload={reload} />
        ))}
      </div>
    </div>
  );
}

function KanbanCard({ task, projectId, reload }) {
  const total = task.checklist.length;
  const done = task.checklist.filter(c => c.done).length;
  const updateStatus = async (status) => {
    await api.patch(`/projects/${projectId}/tasks/${task.id}`, { status });
    reload();
  };
  return (
    <div data-testid={`kanban-card-${task.id}`} className="bg-white border border-zinc-200 rounded-lg p-3 hover:shadow-md hover:border-zinc-300 transition-all">
      <div className="text-sm font-medium text-zinc-900 leading-snug">{task.title}</div>
      <div className="flex items-center justify-between mt-2">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
        {total > 0 && <span className="font-mono text-[10px] text-zinc-500">{done}/{total}</span>}
      </div>
      <div className="mt-2 flex items-center justify-between">
        {task.owner && <Avatar className="w-5 h-5"><AvatarImage src={ownerAvatar(task.owner)} /><AvatarFallback className="text-[9px]">{task.owner[0]}</AvatarFallback></Avatar>}
        <Select value={task.status} onValueChange={updateStatus}>
          <SelectTrigger className={`h-6 text-[10px] ml-auto border ${STATUS_COLORS[task.status]} w-[110px] py-0`}><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function Tracker({ project, reload }) {
  return (
    <Tabs defaultValue="kanban" data-testid="tracker">
      <TabsList className="bg-zinc-100">
        <TabsTrigger data-testid="tracker-kanban-tab" value="kanban">Kanban</TabsTrigger>
        <TabsTrigger data-testid="tracker-table-tab" value="table">Table</TabsTrigger>
      </TabsList>
      <TabsContent value="kanban" className="mt-4">
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
          {project.phases.map((p, idx) => (
            <div key={p.id} className="snap-start"><PhaseColumn phase={p} projectId={project.id} reload={reload} idx={idx} /></div>
          ))}
        </div>
      </TabsContent>
      <TabsContent value="table" className="mt-4">
        <div className="space-y-8">
          {project.phases.map((phase, pi) => (
            <div key={phase.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/50">
                <p className="text-[10px] font-mono font-semibold text-zinc-400">PHASE {pi+1}</p>
                <h3 className="font-display font-bold text-zinc-900">{phase.name}</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Checklist</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {phase.tasks.map((t, i) => <TaskRow key={t.id} task={t} projectId={project.id} reload={reload} idx={i} />)}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
