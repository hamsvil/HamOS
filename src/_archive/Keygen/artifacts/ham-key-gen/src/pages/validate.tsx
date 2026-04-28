import { AppLayout } from "@/components/layout/app-layout";
import { useValidateKey, useListProviders, useGetValidationHistory } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Clock, Zap, List, RefreshCw } from "lucide-react";

type ValidationStatus = "valid" | "invalid" | "error" | "rate_limited";

interface ValidationResult {
  status: ValidationStatus;
  responseTime: number;
  error?: string | null;
  cached?: boolean;
  provider?: string;
}

interface BatchItem {
  key: string;
  result: ValidationResult | null;
  loading: boolean;
}

function StatusBadge({ status }: { status: ValidationStatus }) {
  const map: Record<ValidationStatus, { label: string; className: string; icon: React.ReactNode }> = {
    valid: { label: "Valid", className: "bg-green-500/20 text-green-600 border-green-500/30", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    invalid: { label: "Invalid", className: "bg-red-500/20 text-red-600 border-red-500/30", icon: <XCircle className="h-3.5 w-3.5" /> },
    error: { label: "Error", className: "bg-orange-500/20 text-orange-600 border-orange-500/30", icon: <AlertCircle className="h-3.5 w-3.5" /> },
    rate_limited: { label: "Rate Limited", className: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30", icon: <Clock className="h-3.5 w-3.5" /> },
  };
  const s = map[status] ?? map.error;
  return (
    <Badge className={`gap-1 ${s.className}`}>
      {s.icon} {s.label}
    </Badge>
  );
}

function ResponseTimeBar({ ms }: { ms: number }) {
  const max = 3000;
  const pct = Math.min(100, (ms / max) * 100);
  const color = pct < 20 ? "bg-green-500" : pct < 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-muted-foreground w-16 text-right">{ms}ms</span>
    </div>
  );
}

function SingleValidate() {
  const { data: providers } = useListProviders({ query: { enabled: true } });
  const validateKey = useValidateKey();
  const [key, setKey] = useState("");
  const [provider, setProvider] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !provider) return;
    setResult(null);
    validateKey.mutate({ data: { key: key.trim(), provider } }, {
      onSuccess: (data: any) => {
        setResult(data);
        if (data.status === "valid") toast.success("Key valid!");
        else if (data.status === "invalid") toast.error("Key tidak valid.");
        else toast.warning(`Status: ${data.status}`);
      },
      onError: (err: any) => {
        toast.error(err?.data?.error || "Validasi gagal");
      }
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>API Key <span className="text-destructive">*</span></Label>
              <Input
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="Masukkan API key untuk divalidasi..."
                className="font-mono text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Provider <span className="text-destructive">*</span></Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers?.map(p => (
                    <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={validateKey.isPending || !key.trim() || !provider} className="w-full gap-2">
              {validateKey.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Validasi Sekarang
            </Button>
          </form>
        </CardContent>
      </Card>

      {validateKey.isPending && (
        <Card className="border-dashed">
          <CardContent className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Menghubungi provider...</p>
          </CardContent>
        </Card>
      )}

      {result && !validateKey.isPending && (
        <Card className={
          result.status === "valid"
            ? "border-green-500/40 bg-green-500/5"
            : result.status === "invalid"
            ? "border-red-500/40 bg-red-500/5"
            : "border-orange-500/40 bg-orange-500/5"
        }>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Hasil Validasi</CardTitle>
              <StatusBadge status={result.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Response Time</p>
              <ResponseTimeBar ms={result.responseTime} />
            </div>
            {result.cached && (
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="h-3 w-3" /> Hasil dari cache (5 menit)
              </Badge>
            )}
            {result.error && (
              <div className="p-3 bg-background border rounded-md">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Detail Error</p>
                <code className="text-sm text-destructive">{result.error}</code>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setResult(null); setKey(""); }}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Validasi Key Lain
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BatchValidate() {
  const { data: providers } = useListProviders({ query: { enabled: true } });
  const validateKey = useValidateKey();
  const [keysText, setKeysText] = useState("");
  const [provider, setProvider] = useState("");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    const lines = keysText.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length || !provider) return;
    if (lines.length > 20) { toast.error("Maksimal 20 key per batch"); return; }

    setRunning(true);
    const initial: BatchItem[] = lines.map(k => ({ key: k, result: null, loading: true }));
    setItems(initial);

    for (let i = 0; i < lines.length; i++) {
      const key = lines[i];
      try {
        const result = await new Promise<ValidationResult>((resolve, reject) => {
          validateKey.mutate({ data: { key, provider } }, {
            onSuccess: (d: any) => resolve(d),
            onError: (e: any) => reject(e),
          });
        });
        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, result, loading: false } : it));
      } catch {
        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, result: { status: "error", responseTime: 0, error: "Request failed" }, loading: false } : it));
      }
      await new Promise(r => setTimeout(r, 200));
    }
    setRunning(false);
    toast.success(`Selesai: ${lines.length} key divalidasi`);
  };

  const valid = items.filter(i => i.result?.status === "valid").length;
  const invalid = items.filter(i => i.result?.status !== "valid" && i.result !== null).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-1.5">
            <Label>API Keys (satu per baris, maks 20)</Label>
            <Textarea
              value={keysText}
              onChange={e => setKeysText(e.target.value)}
              placeholder={"sk-ant-api03-xxx...\ngsk_abc123...\nAIzaSy..."}
              rows={6}
              className="font-mono text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {keysText.split("\n").filter(l => l.trim()).length} keys dimasukkan
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger><SelectValue placeholder="Pilih provider" /></SelectTrigger>
              <SelectContent>
                {providers?.map(p => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleRun}
            disabled={running || !keysText.trim() || !provider}
            className="w-full gap-2"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {running ? "Memvalidasi..." : "Jalankan Batch Validasi"}
          </Button>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">Hasil Batch</CardTitle>
              <div className="flex gap-2">
                <Badge className="bg-green-500/20 text-green-600 border-green-500/30">{valid} Valid</Badge>
                <Badge className="bg-red-500/20 text-red-600 border-red-500/30">{invalid} Invalid/Error</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Key Preview</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.key.length > 20 ? `${item.key.slice(0, 8)}...${item.key.slice(-4)}` : item.key}
                      </TableCell>
                      <TableCell>
                        {item.loading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : item.result ? (
                          <StatusBadge status={item.result.status} />
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {item.result ? `${item.result.responseTime}ms` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ValidationHistory() {
  const { data: history, isLoading, refetch } = useGetValidationHistory(
    { limit: 50 },
    { query: { enabled: true } }
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>
      <Card>
        <CardContent className="pt-4 px-0 pb-0">
          <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : history?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Belum ada riwayat validasi.
                    </TableCell>
                  </TableRow>
                ) : history?.data?.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(v.validatedAt).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{v.provider}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{v.keyPrefix}...</TableCell>
                    <TableCell><StatusBadge status={v.status as ValidationStatus} /></TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{v.responseTime}ms</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Validate() {
  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Validasi API Key</h1>
          <p className="text-sm text-muted-foreground">Validasi real-time langsung ke endpoint provider</p>
        </div>

        <Tabs defaultValue="single">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="single" className="gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Single
            </TabsTrigger>
            <TabsTrigger value="batch" className="gap-1.5">
              <List className="h-3.5 w-3.5" /> Batch
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Riwayat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-4">
            <SingleValidate />
          </TabsContent>

          <TabsContent value="batch" className="mt-4">
            <BatchValidate />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ValidationHistory />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
