import { useEffect, useState, useRef } from "react";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { api, type Task, type Log } from "@/lib/apiClient";
import { ArrowLeft, Play, Square, Trash2, Plus, Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4 text-yellow-400" />,
  running: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
  completed: <CheckCircle2 className="w-4 h-4 text-green-400" />,
  failed: <XCircle className="w-4 h-4 text-red-400" />,
  cancelled: <AlertCircle className="w-4 h-4 text-gray-400" />,
};

const LOG_LEVEL_COLOR: Record<string, string> = {
  info: "text-foreground",
  debug: "text-muted-foreground",
  warn: "text-yellow-400",
  error: "text-red-400",
};

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [autoStart, setAutoStart] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    const data = await api.tasks.list();
    setTasks(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setCreating(true);
    try {
      await api.tasks.create({ title: title.trim(), description: description.trim(), autoStart });
      setTitle("");
      setDescription("");
      toast({ title: "Task created", description: autoStart ? "Task started automatically" : "Task created, click Start to run" });
      await load();
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.tasks.delete(id);
      await load();
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    }
  };

  const statusColor = (s: Task["status"]) => {
    const map: Record<string, string> = {
      pending: "text-yellow-400",
      running: "text-blue-400",
      completed: "text-green-400",
      failed: "text-red-400",
      cancelled: "text-gray-400",
    };
    return map[s] ?? "text-gray-400";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground text-sm mt-1">Create and manage autonomous AI tasks</p>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader className="px-4 pt-4 pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Task
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <form onSubmit={handleCreate} className="space-y-3">
            <Input
              placeholder="Task title (e.g. Build a REST API endpoint)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background/50"
            />
            <Textarea
              placeholder="Describe what the AI should do in detail. The more specific, the better."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="bg-background/50 resize-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="autostart" checked={autoStart} onCheckedChange={setAutoStart} />
                <Label htmlFor="autostart" className="text-sm cursor-pointer">Auto-start</Label>
              </div>
              <Button type="submit" disabled={creating || !title.trim() || !description.trim()} size="sm">
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Create Task
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Terminal className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No tasks yet. Create your first autonomous task above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Link key={task.id} href={`/tasks/${task.id}`}>
              <Card className="border-border/50 bg-card/50 hover:bg-card/80 transition-colors cursor-pointer group">
                <CardContent className="px-4 py-3 flex items-center gap-3">
                  {STATUS_ICON[task.status] ?? <Clock className="w-4 h-4" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{task.description.slice(0, 80)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium ${statusColor(task.status)}`}>{task.status}</span>
                    {task.durationMs && (
                      <span className="text-xs text-muted-foreground">{(task.durationMs / 1000).toFixed(1)}s</span>
                    )}
                    {task.status !== "running" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDelete(task.id, e)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Terminal({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>;
}

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { toast } = useToast();

  const loadTask = async () => {
    try {
      const t = await api.tasks.get(id);
      setTask(t);
    } catch {
      setTask(null);
    }
  };

  const loadLogs = async () => {
    try {
      const l = await api.logs.list(id);
      setLogs(l);
    } catch {}
  };

  useEffect(() => {
    loadTask();
    loadLogs();
    const interval = setInterval(loadTask, 2000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    const es = new EventSource(api.logs.streamUrl(id));
    eventSourceRef.current = es;
    es.addEventListener("log", (e) => {
      const logEvent = JSON.parse(e.data) as { taskId: string; level: string; message: string; agentCodename?: string; timestamp: string };
      setLogs((prev) => {
        const newLog: Log = {
          id: Date.now(),
          taskId: logEvent.taskId,
          level: logEvent.level,
          message: logEvent.message,
          agentCodename: logEvent.agentCodename,
          createdAt: logEvent.timestamp,
        };
        return [...prev, newLog];
      });
    });
    return () => es.close();
  }, [id]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleStart = async () => {
    try {
      await api.tasks.start(id);
      toast({ title: "Task started" });
      await loadTask();
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    }
  };

  const handleCancel = async () => {
    try {
      await api.tasks.cancel(id);
      toast({ title: "Cancel signal sent" });
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    }
  };

  if (!task) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-3">
        <Link href="/tasks">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{task.title}</h1>
          <p className="text-xs text-muted-foreground">{task.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {STATUS_ICON[task.status]}
          <span className="text-sm font-medium capitalize">{task.status}</span>
          {task.status === "pending" && (
            <Button size="sm" onClick={handleStart}>
              <Play className="w-3.5 h-3.5 mr-1.5" /> Start
            </Button>
          )}
          {task.status === "running" && (
            <Button size="sm" variant="destructive" onClick={handleCancel}>
              <Square className="w-3.5 h-3.5 mr-1.5" /> Cancel
            </Button>
          )}
        </div>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardContent className="px-4 py-3">
          <p className="text-sm text-muted-foreground">{task.description}</p>
          {task.durationMs && (
            <p className="text-xs text-muted-foreground mt-1">Duration: {(task.durationMs / 1000).toFixed(1)}s</p>
          )}
          {task.error && (
            <p className="text-xs text-red-400 mt-1">Error: {task.error}</p>
          )}
          {task.filesChanged && task.filesChanged.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">Files changed:</p>
              <div className="flex flex-wrap gap-1">
                {task.filesChanged.map((f) => (
                  <span key={f} className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{f}</span>
                ))}
              </div>
            </div>
          )}
          {task.result && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">Result</p>
              <pre className="text-xs whitespace-pre-wrap break-words text-foreground">{task.result}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex-1 min-h-0">
        <Card className="border-border/50 bg-card/50 h-full flex flex-col">
          <CardHeader className="px-4 pt-3 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Live Logs ({logs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 flex-1 overflow-auto">
            <div className="font-mono text-xs p-4 space-y-0.5 min-h-[200px]">
              {logs.length === 0 ? (
                <p className="text-muted-foreground">No logs yet...</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`flex gap-2 ${LOG_LEVEL_COLOR[log.level] ?? "text-foreground"}`}>
                    <span className="text-muted-foreground shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                    {log.agentCodename && (
                      <span className="text-purple-400 shrink-0">[{log.agentCodename}]</span>
                    )}
                    <span className="break-all">{log.message}</span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
