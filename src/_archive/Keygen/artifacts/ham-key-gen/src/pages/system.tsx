import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Cpu, Database, Activity, Server } from "lucide-react";
import { Button } from "@/components/ui/button";

type SystemInfo = {
  name: string;
  nodeVersion: string;
  uptimeSec: number;
  db: { status: "ok" | "down"; latencyMs: number };
  memory: { rss: number; heapUsed: number; heapTotal: number };
  nodeEnv: string;
  platform?: string;
  arch?: string;
  pid?: number;
};

function fmtBytes(n: number) {
  const mb = n / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}
function fmtUptime(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export default function SystemPage() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/info", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setInfo((await res.json()) as SystemInfo);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System</h1>
            <p className="text-muted-foreground">Live status of the API server and database.</p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading} data-testid="button-refresh">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {error && <div className="text-destructive text-sm">{error}</div>}

        {loading && !info ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : info ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Database</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant={info.db.status === "ok" ? "default" : "destructive"}>{info.db.status}</Badge>
                  <span className="text-2xl font-bold">{info.db.latencyMs}ms</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Round-trip SELECT 1</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmtUptime(info.uptimeSec)}</div>
                <p className="text-xs text-muted-foreground mt-1">Since last restart</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Memory</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmtBytes(info.memory.heapUsed)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Heap used / {fmtBytes(info.memory.heapTotal)} · RSS {fmtBytes(info.memory.rss)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Runtime</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{info.nodeVersion}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {info.nodeEnv}{info.platform ? ` · ${info.platform}/${info.arch}` : ""}
                  {info.pid ? ` · pid ${info.pid}` : ""}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
