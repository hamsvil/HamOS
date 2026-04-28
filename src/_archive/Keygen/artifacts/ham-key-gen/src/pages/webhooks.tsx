import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, RefreshCw } from "lucide-react";

type WebhookLog = {
  id: number; url: string; method: string; payload: unknown;
  responseStatus: number | null; responseBody: string | null;
  durationMs: number | null; createdAt: string;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function statusColor(status: number | null) {
  if (status == null) return "text-muted-foreground";
  if (status >= 200 && status < 300) return "text-green-600";
  if (status >= 400) return "text-destructive";
  return "text-orange-500";
}

export default function Webhooks() {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [payload, setPayload] = useState('{"event":"test","ts":' + Date.now() + "}");
  const [result, setResult] = useState<{ success: boolean; statusCode: number | null; responseBody: string | null; durationMs: number; hmacSignature: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const logs = useQuery({
    queryKey: ["webhooks", "logs"],
    queryFn: () => api<{ data: WebhookLog[]; total: number }>("/api/webhooks/logs?limit=50"),
  });

  const testMut = useMutation({
    mutationFn: () => {
      let parsed: unknown;
      try { parsed = JSON.parse(payload); } catch { throw new Error("Payload bukan JSON valid"); }
      return api<{ success: boolean; statusCode: number | null; responseBody: string | null; durationMs: number; hmacSignature: string }>(
        "/api/webhooks/test",
        { method: "POST", body: JSON.stringify({ url, method: "POST", payload: parsed }) },
      );
    },
    onSuccess: (data) => {
      setResult(data); setError(null);
      qc.invalidateQueries({ queryKey: ["webhooks", "logs"] });
    },
    onError: (e: Error) => { setError(e.message); setResult(null); },
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
        <p className="text-sm text-muted-foreground">
          Kirim payload uji ke endpoint webhook. Setiap request dilengkapi header
          <code className="px-1 mx-1 bg-muted rounded text-xs">X-HamKeyGen-Signature</code>
          (HMAC-SHA256) untuk verifikasi sisi penerima.
        </p>

        {/* Tester */}
        <section className="p-6 border rounded-md bg-card space-y-3">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Send className="h-4 w-4" /> Kirim payload uji
          </h2>
          <div className="space-y-2 max-w-2xl">
            <div>
              <Label>URL Webhook</Label>
              <Input
                placeholder="https://contoh.com/webhook"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL ke private/loopback IP diblokir oleh SSRF guard.
              </p>
            </div>
            <div>
              <Label>Payload (JSON)</Label>
              <textarea
                className="w-full h-28 p-2 border rounded-md font-mono text-xs bg-background"
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={!url || testMut.isPending}
              onClick={() => testMut.mutate()}
            >
              {testMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Kirim
            </Button>
            {error && <div className="text-xs text-destructive">{error}</div>}
            {result && (
              <div className="mt-2 p-3 border rounded-md bg-muted text-xs space-y-1">
                <div>
                  Status:{" "}
                  <span className={`font-bold ${statusColor(result.statusCode)}`}>
                    {result.statusCode ?? "ERR"}
                  </span>
                  {" · "}Durasi: {result.durationMs}ms
                </div>
                <div className="font-mono break-all">Sig: {result.hmacSignature}</div>
                {result.responseBody && (
                  <pre className="whitespace-pre-wrap break-all max-h-32 overflow-auto">
                    {result.responseBody}
                  </pre>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Logs */}
        <section className="p-6 border rounded-md bg-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Riwayat pengiriman</h2>
            <Button size="sm" variant="ghost" onClick={() => logs.refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
          </div>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-2">Waktu</th>
                  <th className="px-3 py-2">URL</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Durasi</th>
                </tr>
              </thead>
              <tbody>
                {logs.data?.data.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs truncate max-w-xs">{l.url}</td>
                    <td className={`px-3 py-2 font-bold ${statusColor(l.responseStatus)}`}>
                      {l.responseStatus ?? "ERR"}
                    </td>
                    <td className="px-3 py-2">{l.durationMs ?? "-"}ms</td>
                  </tr>
                ))}
                {logs.data?.data.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Belum ada log.</td></tr>
                )}
                {logs.isLoading && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
