import { AppLayout } from "@/components/layout/app-layout";
import {
  useGenerateKey,
  useListProviders,
  useListEnvironments,
  getListKeysQueryKey,
  customFetch,
} from "@workspace/api-client-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Copy, Check, ArrowLeft, Key, Zap, RefreshCw, Shield, Lock,
  CheckCircle2, XCircle, AlertTriangle,
} from "lucide-react";

const KEY_FORMATS = [
  { value: "uuid", label: "UUID", desc: "32-char hex" },
  { value: "hex", label: "Hex", desc: "Hexadecimal" },
  { value: "base64", label: "Base64url", desc: "URL-safe base64" },
  { value: "alphanumeric", label: "Alphanumeric", desc: "Huruf + angka" },
];
const KEY_LENGTHS = [16, 24, 32, 48, 64];
const COUNTS = [1, 5, 10, 20];

const NO_ENV = "__none__";

const PROVIDER_PREFIXES: Record<string, string> = {
  gemini: "AIza", groq: "gsk_", openrouter: "sk-or-", together: "tgp_",
  cohere: "co_", mistral: "mst_", huggingface: "hf_", replicate: "r8_",
  stability: "sk-", deepinfra: "di_", perplexity: "pplx-", fireworks: "fw-",
  cerebras: "csk-", nvidia: "nvapi-", openai: "sk-", anthropic: "sk-ant-",
};

const ENCRYPTION_GUIDES: Record<string, { atRest: string; inTransit: string; hashing: string; note: string }> = {
  gemini: { atRest: "AES-256-GCM", inTransit: "TLS 1.3", hashing: "SHA-256 fingerprint", note: "Bind ke service account; rotasi 90 hari." },
  groq: { atRest: "AES-256-GCM", inTransit: "TLS 1.3", hashing: "Argon2id", note: "Free tier 30 req/min — pasang circuit breaker." },
  openrouter: { atRest: "AES-256-GCM", inTransit: "TLS 1.3", hashing: "SHA-256", note: "Pakai HTTP-Referer header sesuai TOS." },
  default: { atRest: "AES-256-GCM (envelope encryption via KMS)", inTransit: "TLS 1.3", hashing: "SHA-256 sebagai fingerprint", note: "Jangan pernah simpan kunci dalam plaintext. Rotasi minimal 90 hari." },
};

function EntropyBar({ entropy }: { entropy: number }) {
  const max = 6;
  const pct = Math.min(100, (entropy / max) * 100);
  const color = pct > 70 ? "bg-green-500" : pct > 40 ? "bg-yellow-500" : "bg-red-500";
  const label = pct > 70 ? "Kuat" : pct > 40 ? "Sedang" : "Lemah";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Entropi: {entropy.toFixed(2)} bits/char</span>
        <span className={pct > 70 ? "text-green-500" : pct > 40 ? "text-yellow-500" : "text-red-500"}>{label}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CopyBtn({ text, label = "Salin" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          toast.success("Disalin!");
          setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Tersalin" : label}
    </Button>
  );
}

interface GeneratedKey {
  id: number; fullKey: string; keyPrefix: string; keySuffix: string;
  provider: string; name: string; entropy: number;
  validation?: {
    status: "valid" | "invalid" | "error" | "rate_limited" | "pending";
    error?: string | null;
    tier?: string | null;
    responseTime?: number;
  };
}

export default function KeyGenerate() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: providers } = useListProviders({ query: { enabled: true } });
  const { data: environments } = useListEnvironments({ query: { enabled: true } });
  const generateKey = useGenerateKey();

  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [environmentId, setEnvironmentId] = useState<string>(NO_ENV);
  const [format, setFormat] = useState("uuid");
  const [length, setLength] = useState("32");
  const [count, setCount] = useState("1");
  const [customPrefix, setCustomPrefix] = useState("");
  const [usePrefix, setUsePrefix] = useState(true);
  const [autoValidate, setAutoValidate] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [rateLimit, setRateLimit] = useState("1000");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [results, setResults] = useState<GeneratedKey[] | null>(null);

  const guide = ENCRYPTION_GUIDES[provider] ?? ENCRYPTION_GUIDES.default;
  const autoPrefix = useMemo(
    () => (provider && usePrefix ? PROVIDER_PREFIXES[provider] ?? "" : ""),
    [provider, usePrefix],
  );

  // Reset custom prefix when provider changes if user wants auto.
  useEffect(() => {
    if (usePrefix && provider) setCustomPrefix(autoPrefix);
  }, [provider, usePrefix, autoPrefix]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !provider) return;

    const payload = {
      name, provider, format, length: parseInt(length, 10),
      customPrefix: customPrefix.trim() || undefined,
      environmentId: environmentId !== NO_ENV ? parseInt(environmentId, 10) : null,
      expiresAt: expiresAt || null,
      rateLimit: parseInt(rateLimit, 10),
      count: parseInt(count, 10),
    };

    generateKey.mutate(
      { data: payload as any },
      {
        onSuccess: (data: any) => {
          const list: GeneratedKey[] = Array.isArray(data?.keys) ? data.keys : [data];
          const initial = list.map((k) => ({
            ...k,
            validation: autoValidate ? { status: "pending" as const } : undefined,
          }));
          setResults(initial);
          toast.success(`${initial.length} key berhasil di-generate`);
          queryClient.invalidateQueries({ queryKey: getListKeysQueryKey() });

          if (autoValidate) {
            initial.forEach((k, idx) => {
              customFetch<any>("/api/validate", {
                method: "POST",
                body: JSON.stringify({ key: k.fullKey, provider, keyId: k.id }),
                headers: { "Content-Type": "application/json" },
              })
                .then((r) => {
                  setResults((prev) => {
                    if (!prev) return prev;
                    const next = [...prev];
                    next[idx] = {
                      ...next[idx],
                      validation: {
                        status: r.status,
                        error: r.error ?? null,
                        tier: r.tier ?? null,
                        responseTime: r.responseTime,
                      },
                    };
                    return next;
                  });
                })
                .catch((err) => {
                  setResults((prev) => {
                    if (!prev) return prev;
                    const next = [...prev];
                    next[idx] = {
                      ...next[idx],
                      validation: { status: "error", error: err?.message ?? "Gagal" },
                    };
                    return next;
                  });
                });
            });
          }
        },
        onError: (err: any) => {
          toast.error(err?.data?.error || err?.message || "Gagal generate key");
        },
      },
    );
  };

  if (results) {
    const validCount = results.filter((r) => r.validation?.status === "valid").length;
    const filtered = autoValidate
      ? results.filter((r) => r.validation?.status === "valid" || r.validation?.status === "pending")
      : results;

    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/keys")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Hasil Generate</h1>
            <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
              {results.length} key dibuat
            </Badge>
            {autoValidate && (
              <Badge variant="outline" className="text-xs">
                {validCount}/{results.length} valid
              </Badge>
            )}
          </div>

          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            Salin key sekarang. Setelah halaman ini ditutup, hanya prefix &amp; suffix yang akan terlihat.
          </div>

          {autoValidate && (
            <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-muted-foreground">
              Auto-validate aktif: hanya menampilkan key yang lolos validasi terhadap endpoint <code>{provider}</code>.
              Token yang di-generate adalah token internal aplikasi — token tersebut tidak akan diakui sebagai
              kredensial valid oleh server provider eksternal kecuali Anda mendaftarkannya secara terpisah.
            </div>
          )}

          {filtered.length === 0 && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Tidak ada key yang lolos validasi terhadap <code>{provider}</code>.
                Ini wajar — kunci acak hampir tidak mungkin valid di provider eksternal.
                Matikan opsi auto-validate jika Anda hanya butuh token internal.
              </CardContent>
            </Card>
          )}

          {filtered.map((r) => (
            <Card key={r.id} className="border-green-500/30 bg-green-500/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Shield className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-base">{r.name}</CardTitle>
                  <Badge variant="outline" className="text-xs">{r.provider}</Badge>
                  <Badge variant="outline" className="text-xs">ID #{r.id}</Badge>
                  {r.validation && (
                    <Badge
                      variant="outline"
                      className={
                        r.validation.status === "valid" ? "text-xs border-green-500/40 text-green-600" :
                        r.validation.status === "invalid" ? "text-xs border-destructive/40 text-destructive" :
                        r.validation.status === "rate_limited" ? "text-xs border-yellow-500/40 text-yellow-600" :
                        r.validation.status === "pending" ? "text-xs border-blue-500/40 text-blue-600" :
                        "text-xs border-muted text-muted-foreground"
                      }
                    >
                      {r.validation.status === "pending" ? <Loader2 className="h-3 w-3 mr-1 animate-spin inline" /> :
                       r.validation.status === "valid" ? <CheckCircle2 className="h-3 w-3 mr-1 inline" /> :
                       <XCircle className="h-3 w-3 mr-1 inline" />}
                      {r.validation.status}
                    </Badge>
                  )}
                  {r.validation?.tier && (
                    <Badge variant="outline" className="text-xs">tier: {r.validation.tier}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <div className="p-3 bg-background border-2 border-primary/30 rounded-lg font-mono text-sm break-all select-all leading-relaxed pr-24">
                    {r.fullKey}
                  </div>
                  <div className="absolute top-2 right-2">
                    <CopyBtn text={r.fullKey} label="Salin" />
                  </div>
                </div>
                <EntropyBar entropy={r.entropy} />
                {r.validation?.error && (
                  <p className="text-xs text-destructive">Error: {r.validation.error}</p>
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex flex-wrap gap-2 justify-end">
            {results.length > 1 && (
              <CopyBtn
                text={results.map((r) => r.fullKey).join("\n")}
                label="Salin semua"
              />
            )}
            <Button variant="outline" onClick={() => { setResults(null); setName(""); }} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Generate lagi
            </Button>
            <Button onClick={() => setLocation("/keys")}>Lihat semua keys →</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/keys")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Generate API Key</h1>
            <p className="text-sm text-muted-foreground">
              Key disimpan sebagai hash SHA-256. Key asli hanya tampil sekali.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                <Key className="h-4 w-4" /> Informasi Dasar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-1.5">
                <Label>Nama Key <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production Groq Key" required />
              </div>
              <div className="space-y-1.5">
                <Label>Provider <span className="text-destructive">*</span></Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih provider AI" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers?.map((p) => (
                      <SelectItem key={p.slug} value={p.slug}>
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground text-xs ml-2">{p.category}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Format</Label>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KEY_FORMATS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          <span className="font-medium">{f.label}</span>
                          <span className="text-muted-foreground text-xs ml-1">— {f.desc}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Panjang</Label>
                  <Select value={length} onValueChange={setLength}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KEY_LENGTHS.map((l) => (
                        <SelectItem key={l} value={l.toString()}>{l} karakter</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Jumlah key sekali generate</Label>
                  <Select value={count} onValueChange={setCount}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTS.map((c) => (
                        <SelectItem key={c} value={c.toString()}>{c} key</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center justify-between">
                    <span>Pakai prefix khas provider</span>
                    <Switch checked={usePrefix} onCheckedChange={setUsePrefix} />
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {provider
                      ? (autoPrefix
                          ? <>Awalan otomatis: <code className="bg-muted px-1 rounded">{autoPrefix}</code></>
                          : "Provider ini tidak punya awalan standar.")
                      : "Pilih provider dulu."}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center justify-between">
                  <span>Auto-validate ke endpoint provider</span>
                  <Switch checked={autoValidate} onCheckedChange={setAutoValidate} />
                </Label>
                <p className="text-xs text-muted-foreground">
                  Setelah di-generate, masing-masing key langsung di-test ke endpoint provider. Hanya yang lolos
                  yang ditampilkan. <strong>Catatan:</strong> kunci acak hampir tidak mungkin lolos di provider
                  eksternal — fitur ini berguna untuk endpoint internal Anda sendiri.
                </p>
              </div>
            </CardContent>
          </Card>

          {provider && (
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  <Lock className="h-4 w-4" /> Panduan Enkripsi — {providers?.find((p) => p.slug === provider)?.name ?? provider}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs pt-0">
                <p><span className="text-muted-foreground">At rest:</span> <code className="bg-background px-1.5 py-0.5 rounded">{guide.atRest}</code></p>
                <p><span className="text-muted-foreground">In transit:</span> <code className="bg-background px-1.5 py-0.5 rounded">{guide.inTransit}</code></p>
                <p><span className="text-muted-foreground">Hashing/fingerprint:</span> <code className="bg-background px-1.5 py-0.5 rounded">{guide.hashing}</code></p>
                <p className="text-muted-foreground italic">Catatan: {guide.note}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                <Zap className="h-4 w-4" /> Pengaturan Lanjutan
                <span className="ml-auto text-xs font-normal">{showAdvanced ? "▲ Sembunyikan" : "▼ Tampilkan"}</span>
              </CardTitle>
            </CardHeader>
            {showAdvanced && (
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-1.5">
                  <Label>Prefix Kustom <span className="text-muted-foreground text-xs">(opsional, override prefix otomatis)</span></Label>
                  <Input
                    value={customPrefix}
                    onChange={(e) => { setCustomPrefix(e.target.value); setUsePrefix(false); }}
                    placeholder="e.g. prod_, sk-, myapp-"
                    maxLength={20}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Environment</Label>
                  <Select value={environmentId} onValueChange={setEnvironmentId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_ENV}>Tidak ada</SelectItem>
                      {environments?.map((e) => (
                        <SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Kadaluarsa</Label>
                    <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Rate Limit (req/jam)</Label>
                    <Input type="number" value={rateLimit} onChange={(e) => setRateLimit(e.target.value)} min={1} max={100000} />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setLocation("/keys")}>Batal</Button>
            <Button type="submit" disabled={generateKey.isPending || !name || !provider} className="gap-2">
              {generateKey.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
              Generate {parseInt(count) > 1 ? `${count} Keys` : "Key"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
