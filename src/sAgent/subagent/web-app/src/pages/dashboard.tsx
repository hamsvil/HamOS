import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, type SystemStatus, type Task } from "@/lib/apiClient";
import { Activity, Brain, Cpu, Database, Terminal, Wrench, Zap } from "lucide-react";

export default function Dashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, tasks] = await Promise.all([api.status(), api.tasks.list()]);
        setStatus(s);
        setRecentTasks(tasks.slice(0, 5));
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const statusColor = (s: Task["status"]) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      running: "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse",
      completed: "bg-green-500/10 text-green-400 border-green-500/20",
      failed: "bg-red-500/10 text-red-400 border-red-500/20",
      cancelled: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    };
    return map[s] ?? "bg-gray-500/10 text-gray-400";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Autopilot Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time status of your autonomous AI system</p>
      </div>

      {status && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" /> Status
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm font-medium capitalize">{status.status}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" /> Running Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <span className="text-2xl font-bold">{status.tasks.running}</span>
                <span className="text-muted-foreground text-xs ml-1">/ {status.tasks.total} total</span>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5" /> Memory Entries
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <span className="text-2xl font-bold">{status.memory.active}</span>
                <span className="text-muted-foreground text-xs ml-1">active (24h)</span>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5" /> Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <span className="text-2xl font-bold">{status.tools.total}</span>
                <span className="text-muted-foreground text-xs ml-1">{status.tools.dynamic} dynamic</span>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="px-4 pt-4 pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Cpu className="w-4 h-4" /> System Info
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{status.system.model}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max Tokens</span>
                  <span>{status.system.maxTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max Iterations</span>
                  <span>{status.system.maxToolIterations}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Node</span>
                  <span className="font-mono text-xs">{status.system.nodeVersion}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Uptime</span>
                  <span>{Math.floor(status.system.uptime)}s</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader className="px-4 pt-4 pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> Recent Tasks
                </CardTitle>
                <Link href="/tasks" className="text-xs text-primary hover:underline">View all →</Link>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {recentTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks yet. <Link href="/tasks" className="text-primary hover:underline">Create one →</Link></p>
                ) : (
                  recentTasks.map((t) => (
                    <Link key={t.id} href={`/tasks/${t.id}`}>
                      <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                        <span className="text-sm truncate max-w-[180px]">{t.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(t.status)}`}>{t.status}</span>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
