import { useState } from "react";
import { api } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CaretDown, CaretRight } from "@phosphor-icons/react";

const STATUS_OPTIONS = ["open", "in_progress", "blocked", "closed"];
const PRIORITY_OPTIONS = ["low", "medium", "high"];

const STATUS_BADGE = {
  open: "badge badge-neutral",
  in_progress: "badge badge-info",
  blocked: "badge badge-error",
  closed: "badge badge-success",
};
const PRIORITY_BADGE = {
  low: "badge badge-neutral",
  medium: "badge badge-warning",
  high: "badge badge-orange",
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

function TaskRow({ task, projectId, reload }) {
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
      <TableRow data-testid={`task-row-${task.id}`} className="hover:bg-[var(--sg-panel-soft)]">
        <TableCell>
          <button onClick={() => setOpen(!open)} className="text-[var(--sg-fg-3)] hover:text-[var(--sg-orange)]" data-testid={`expand-task-${task.id}`}>
            {open ? <CaretDown weight="bold" /> : <CaretRight weight="bold" />}
          </button>
        </TableCell>
        <TableCell className="font-medium text-[var(--sg-fg)]">{task.title}</TableCell>
        <TableCell>
          {task.owner && (
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6"><AvatarImage src={ownerAvatar(task.owner)} /><AvatarFallback className="text-[10px]">{task.owner[0]}</AvatarFallback></Avatar>
              <span className="text-sm text-[var(--sg-fg-2)]">{task.owner}</span>
            </div>
          )}
        </TableCell>
        <TableCell>
          <Select value={task.status} onValueChange={(v) => updateTask({ status: v })}>
            <SelectTrigger data-testid={`status-select-${task.id}`} className={`h-8 text-xs w-[140px] border-[var(--sg-border)] bg-white`}><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}><span className={STATUS_BADGE[s]}>{s.replace("_"," ")}</span></SelectItem>)}</SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Select value={task.priority} onValueChange={(v) => updateTask({ priority: v })}>
            <SelectTrigger className={`h-8 text-xs w-[110px] border-[var(--sg-border)] bg-white`}><SelectValue /></SelectTrigger>
            <SelectContent>{PRIORITY_OPTIONS.map(s => <SelectItem key={s} value={s}><span className={PRIORITY_BADGE[s]}>{s}</span></SelectItem>)}</SelectContent>
          </Select>
        </TableCell>
        <TableCell><span className="font-mono text-xs text-[var(--sg-fg-2)]">{done}/{total}</span></TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={6} className="bg-[var(--sg-panel-soft)]">
            <div className="py-3 pl-6">
              <span className="eyebrow">Checklist</span>
              <div className="space-y-1 mt-3">
                {task.checklist.map(item => (
                  <label key={item.id} data-testid={`checklist-item-${item.id}`} className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-md transition border border-transparent hover:border-[var(--sg-border)]">
                    <Checkbox checked={item.done} onCheckedChange={() => toggleCheck(item)} className="data-[state=checked]:bg-[var(--sg-orange)] data-[state=checked]:border-[var(--sg-orange)]" />
                    <span className={`text-sm ${item.done ? "line-through text-[var(--sg-fg-3)]" : "text-[var(--sg-fg)]"}`}>{item.label}</span>
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
  const closed = phase.tasks.filter(t => t.status === "closed").length;
  const pct = phase.tasks.length ? Math.round((closed / phase.tasks.length) * 100) : 0;
  return (
    <div className="min-w-[300px] w-[300px] panel-soft p-4" data-testid={`kanban-column-${idx}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[10px] font-mono font-bold text-[var(--sg-fg-3)] uppercase tracking-wider">P{idx+1}</p>
          <h3 className="font-display font-bold text-sm text-[var(--sg-fg)]">{phase.name}</h3>
        </div>
        <span className="badge badge-orange">{phase.tasks.length}</span>
      </div>
      <div className="progress-track mb-3"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
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
    <div data-testid={`kanban-card-${task.id}`} className="bg-white border border-[var(--sg-border)] rounded-md p-3 hover:shadow-md hover:border-[var(--sg-orange)] transition-all">
      <div className="text-sm font-medium text-[var(--sg-fg)] leading-snug">{task.title}</div>
      <div className="flex items-center justify-between mt-2.5">
        <span className={PRIORITY_BADGE[task.priority]}>{task.priority}</span>
        {total > 0 && <span className="font-mono text-[10px] text-[var(--sg-fg-3)]">{done}/{total}</span>}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        {task.owner && <Avatar className="w-5 h-5"><AvatarImage src={ownerAvatar(task.owner)} /><AvatarFallback className="text-[9px]">{task.owner[0]}</AvatarFallback></Avatar>}
        <Select value={task.status} onValueChange={updateStatus}>
          <SelectTrigger className="h-6 text-[10px] ml-auto w-[110px] py-0 border-[var(--sg-border)]"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function Tracker({ project, reload }) {
  return (
    <Tabs defaultValue="kanban" data-testid="tracker">
      <TabsList className="bg-white border border-[var(--sg-border)] p-1 h-auto">
        <TabsTrigger data-testid="tracker-kanban-tab" value="kanban" className="data-[state=active]:bg-[var(--sg-orange-soft)] data-[state=active]:text-[var(--sg-orange)] data-[state=active]:shadow-none">Kanban</TabsTrigger>
        <TabsTrigger data-testid="tracker-table-tab" value="table" className="data-[state=active]:bg-[var(--sg-orange-soft)] data-[state=active]:text-[var(--sg-orange)] data-[state=active]:shadow-none">Table</TabsTrigger>
      </TabsList>
      <TabsContent value="kanban" className="mt-4">
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
          {project.phases.map((p, idx) => (
            <div key={p.id} className="snap-start"><PhaseColumn phase={p} projectId={project.id} reload={reload} idx={idx} /></div>
          ))}
        </div>
      </TabsContent>
      <TabsContent value="table" className="mt-4">
        <div className="space-y-6">
          {project.phases.map((phase, pi) => (
            <div key={phase.id} className="panel overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--sg-border)] bg-[var(--sg-panel-soft)] flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-mono font-bold text-[var(--sg-fg-3)] uppercase tracking-wider">PHASE {pi+1}</p>
                  <h3 className="font-display font-bold text-[var(--sg-fg)]">{phase.name}</h3>
                </div>
                <span className="badge badge-orange">{phase.tasks.length} tasks</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-[var(--sg-panel-soft)] border-b border-[var(--sg-border)]">
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-[var(--sg-fg-3)] font-semibold">Task</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-[var(--sg-fg-3)] font-semibold">Owner</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-[var(--sg-fg-3)] font-semibold">Status</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-[var(--sg-fg-3)] font-semibold">Priority</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-[var(--sg-fg-3)] font-semibold">Checklist</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {phase.tasks.map((t) => <TaskRow key={t.id} task={t} projectId={project.id} reload={reload} />)}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
