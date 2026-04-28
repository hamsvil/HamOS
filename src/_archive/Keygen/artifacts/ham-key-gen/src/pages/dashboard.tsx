import { AppLayout } from "@/components/layout/app-layout";
import { useGetAnalyticsSummary, useGetUsageStats, useGetSecurityScore, useGetValidationHistory } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ShieldCheck, Key, CheckCircle2, AlertCircle, XCircle, Loader2, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Link } from "wouter";
import { useEffect, useState } from "react";

type ExpiringKey = { id: number; name: string; provider: string; keyPrefix: string; status: string; expiresAt: string };

export default function Dashboard() {
  const [expiring, setExpiring] = useState<ExpiringKey[] | null>(null);
  useEffect(() => {
    fetch("/api/keys/expiring?days=14", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setExpiring(d as ExpiringKey[]))
      .catch(() => setExpiring([]));
  }, []);

  const { data: summary, isLoading: isLoadingSummary } = useGetAnalyticsSummary();
  const { data: usageStats, isLoading: isLoadingStats } = useGetUsageStats({ query: { enabled: true } });
  const { data: score, isLoading: isLoadingScore } = useGetSecurityScore();
  const { data: recentValidations, isLoading: isLoadingHistory } = useGetValidationHistory({
    limit: 5,
  }, { query: { enabled: true } });

  const isLoading = isLoadingSummary || isLoadingStats || isLoadingScore || isLoadingHistory;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">System Dashboard</h1>
        </div>

        {/* Top Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.activeKeys || 0}</div>
              <p className="text-xs text-muted-foreground">
                of {summary?.totalKeys || 0} total generated
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Validated Today</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.validatedToday || 0}</div>
              <p className="text-xs text-muted-foreground">
                {summary?.totalValidations || 0} all time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{((summary?.successRate || 0) * 100).toFixed(1)}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Score</CardTitle>
              {(score?.score || 0) > 80 ? (
                <ShieldCheck className="h-4 w-4 text-green-500" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-destructive" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(score?.score || 0) > 80 ? 'text-green-500' : 'text-destructive'}`}>
                {score?.score || 0}/100
              </div>
            </CardContent>
          </Card>
        </div>

        {expiring && expiring.length > 0 && (
          <Card className="border-amber-500/40">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-400" /> Keys Expiring Soon</CardTitle>
                <CardDescription>Active keys expiring within 14 days</CardDescription>
              </div>
              <Badge variant="secondary">{expiring.length}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expiring.slice(0, 5).map((k) => {
                  const days = Math.ceil((new Date(k.expiresAt).getTime() - Date.now()) / 86400000);
                  return (
                    <Link key={k.id} href={`/keys/${k.id}`}>
                      <div className="flex items-center justify-between border-b border-border/50 last:border-0 py-2 hover:bg-muted/40 px-2 rounded cursor-pointer">
                        <div>
                          <div className="font-medium text-sm">{k.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{k.provider} · {k.keyPrefix}...</div>
                        </div>
                        <Badge variant={days <= 3 ? "destructive" : "secondary"}>{days}d</Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Chart */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Validation Activity (7 Days)</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageStats || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: 'hsl(var(--muted))'}} 
                      contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))'}} 
                    />
                    <Bar dataKey="success" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Success" />
                    <Bar dataKey="failed" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Failed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Validations */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest validation attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentValidations?.data?.map((v) => (
                  <div key={v.id} className="flex items-center gap-4 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                    <div className={`rounded-full p-2 ${v.status === 'valid' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                      {v.status === 'valid' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none font-mono">
                        {v.provider} &middot; {v.keyPrefix}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.validatedAt).toLocaleString()}
                      </p>
                    </div>
                    {v.responseTime && (
                      <div className="text-xs text-muted-foreground font-mono">
                        {v.responseTime}ms
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
