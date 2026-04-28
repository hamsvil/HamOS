import { AppLayout } from "@/components/layout/app-layout";
import { useListProviders, useGetCircuitStatus, getListProvidersQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Activity, Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Template = {
  slug: string; name: string; category: string; validateUrl: string;
  validateMethod: string; validateHeader: string; docsUrl: string;
  prefixPattern: string | null; timeoutMs: number;
};

export default function Providers() {
  const queryClient = useQueryClient();
  const { data: providers, isLoading } = useListProviders({ query: { enabled: true } });
  const { data: circuits } = useGetCircuitStatus({ query: { enabled: true } });

  const [pinging, setPinging] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/providers/templates", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, []);

  const installedSlugs = new Set((providers ?? []).map((p) => p.slug));
  const available = (templates ?? []).filter((t) => !installedSlugs.has(t.slug));

  const handleAddTemplate = async (t: Template) => {
    setAdding(t.slug);
    try {
      const r = await fetch("/api/providers/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providers: [t] }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      toast.success(`${t.name} added (${data.imported} imported, ${data.skipped} skipped)`);
      queryClient.invalidateQueries({ queryKey: getListProvidersQueryKey() });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add provider");
    } finally {
      setAdding(null);
    }
  };

  const handlePing = async (slug: string) => {
    setPinging(slug);
    try {
      const res = await fetch(`/api/providers/${slug}/ping`);
      const data = await res.json();
      if (data.reachable) {
        toast.success(`Ping successful (${data.responseTime}ms)`);
      } else {
        toast.error(`Ping failed: Provider unreachable`);
      }
    } catch (e) {
      toast.error("Ping request failed");
    } finally {
      setPinging(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Providers</h1>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Circuit Status</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : providers?.map((p) => {
                const circuit = circuits?.find(c => c.slug === p.slug);
                return (
                  <TableRow key={p.slug}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={circuit?.state === 'open' ? 'destructive' : circuit?.state === 'half-open' ? 'secondary' : 'default'}>
                        {circuit?.state || 'closed'}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.isActive ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handlePing(p.slug)} disabled={pinging === p.slug}>
                        {pinging === p.slug ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
                        Ping
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {available.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Add from template
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                One-click add curated providers (real validation endpoints, no simulation).
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {available.map((t) => (
                  <Button
                    key={t.slug}
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={adding === t.slug}
                    onClick={() => handleAddTemplate(t)}
                    data-testid={`button-add-template-${t.slug}`}
                  >
                    {adding === t.slug
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Plus className="h-3.5 w-3.5" />}
                    {t.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
