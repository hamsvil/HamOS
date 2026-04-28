import { AppLayout } from "@/components/layout/app-layout";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  customFetch, useListProviders,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Send, Eye, EyeOff, MessageSquare, RefreshCw, Trash2, Lock, Wrench, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ChatProvider {
  slug: string; name: string; chatFormat: "openai" | "gemini";
  prefixPattern: string | null; hasModelsList: boolean;
  encryption: { atRest: string; inTransit: string; hashing: string; note: string };
  docsUrl: string;
}
interface Msg {
  role: "user" | "assistant" | "system";
  content: string;
  toolEvents?: AgentEvent[];
}
interface AgentEvent {
  type: "assistant" | "tool_call" | "tool_result" | "final" | "error" | "info";
  text?: string; tool?: string; args?: unknown; result?: unknown; error?: string; iteration?: number;
}

const FALLBACK_MODELS: Record<string, string[]> = {
  perplexity: ["sonar", "sonar-pro", "sonar-reasoning"],
};

export default function ChatPage() {
  const { data: chatProviders } = useQuery<ChatProvider[]>({
    queryKey: ["chat-providers"],
    queryFn: () => customFetch<ChatProvider[]>("/api/chat/providers"),
  });
  // Hint user about saved keys (we never expose plaintext, but we can show the prefixes).
  useListProviders({ query: { enabled: true } });

  const [provider, setProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const [fallbackTools, setFallbackTools] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedProvider = useMemo(
    () => chatProviders?.find((p) => p.slug === provider) ?? null,
    [chatProviders, provider],
  );

  // Auto-load models on provider+key change.
  useEffect(() => {
    setModel("");
    setModels([]);
    if (!provider || !apiKey || !selectedProvider) return;
    if (!selectedProvider.hasModelsList) {
      setModels(FALLBACK_MODELS[provider] ?? []);
      return;
    }
    let cancelled = false;
    setLoadingModels(true);
    customFetch<{ models: { id: string }[] }>("/api/chat/models", {
      method: "POST",
      body: JSON.stringify({ provider, key: apiKey }),
      headers: { "Content-Type": "application/json" },
    })
      .then((r) => {
        if (cancelled) return;
        setModels(r.models.map((m) => m.id).sort());
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(`Gagal load model: ${err?.data?.error ?? err?.message ?? "unknown"}`);
        setModels(FALLBACK_MODELS[provider] ?? []);
      })
      .finally(() => { if (!cancelled) setLoadingModels(false); });
    return () => { cancelled = true; };
  }, [provider, apiKey, selectedProvider]);

  // Auto-scroll on new message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async () => {
    if (!provider || !apiKey || !model || !draft.trim()) return;
    const newMessages: Msg[] = [];
    if (systemPrompt.trim() && !messages.some((m) => m.role === "system")) {
      newMessages.push({ role: "system", content: systemPrompt.trim() });
    }
    const userMsg: Msg = { role: "user", content: draft.trim() };
    const next = [...messages, ...newMessages, userMsg];
    setMessages(next);
    setDraft("");
    setSending(true);

    try {
      if (agentMode) {
        const r = await customFetch<{ events: AgentEvent[]; finalMessages: Msg[] }>("/api/agent/chat", {
          method: "POST",
          body: JSON.stringify({
            provider, model, key: apiKey, messages: next,
            systemPrompt: systemPrompt.trim() || undefined,
            mode: fallbackTools ? "fallback" : "native",
          }),
          headers: { "Content-Type": "application/json" },
        });
        const final = r.events.filter((e) => e.type === "final").map((e) => e.text ?? "").join("\n").trim();
        setMessages([...next, {
          role: "assistant",
          content: final || "(tidak ada jawaban final)",
          toolEvents: r.events,
        }]);
      } else {
        const r = await customFetch<{ reply: string; responseTime: number; usage: any }>("/api/chat", {
          method: "POST",
          body: JSON.stringify({ provider, model, key: apiKey, messages: next }),
          headers: { "Content-Type": "application/json" },
        });
        setMessages([...next, { role: "assistant", content: r.reply }]);
      }
    } catch (err: any) {
      const msg = err?.data?.error ?? err?.message ?? "Gagal";
      toast.error(`${agentMode ? "Agent" : "Chat"} error: ${msg}`);
      setMessages([...next, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">AI Chat</h1>
            <p className="text-sm text-muted-foreground">
              Tempel kunci API asli Anda, pilih model dari provider mana pun, dan langsung chat — request dikirim
              ke endpoint resmi provider, bukan simulasi.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[340px_1fr] gap-4">
          {/* Konfigurasi */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                Konfigurasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger><SelectValue placeholder="Pilih provider AI" /></SelectTrigger>
                  <SelectContent>
                    {chatProviders?.map((p) => (
                      <SelectItem key={p.slug} value={p.slug}>
                        <span className="font-medium">{p.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{p.chatFormat}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center justify-between">
                  <span>API Key {selectedProvider?.prefixPattern && (
                    <code className="ml-1 text-xs bg-muted px-1 rounded">{selectedProvider.prefixPattern}…</code>
                  )}</span>
                  <Button
                    type="button" size="sm" variant="ghost" className="h-6 px-1.5"
                    onClick={() => setShowKey((v) => !v)}
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </Label>
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Tempel kunci dari dashboard provider"
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="text-[11px] text-muted-foreground">
                  Kunci hanya disimpan di memori browser; setiap request di-proxy via backend Anda untuk
                  menghindari CORS, bukan disimpan di server.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center justify-between">
                  <span>Model</span>
                  {loadingModels && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </Label>
                <Select value={model} onValueChange={setModel} disabled={!apiKey || !provider || loadingModels}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !provider ? "Pilih provider" :
                      !apiKey ? "Masukkan API key" :
                      loadingModels ? "Memuat..." :
                      models.length === 0 ? "Tidak ada model" :
                      "Pilih model"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                {provider && apiKey && !loadingModels && (
                  <button
                    type="button"
                    onClick={() => { /* trigger by key change */
                      const k = apiKey; setApiKey(""); setTimeout(() => setApiKey(k), 0);
                    }}
                    className="text-[11px] text-blue-500 hover:underline inline-flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" /> Muat ulang model
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>System Prompt <span className="text-xs text-muted-foreground">(opsional)</span></Label>
                <Textarea
                  rows={3}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Kamu adalah asisten yang singkat dan jelas..."
                />
              </div>

              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 cursor-pointer">
                    <Wrench className="h-3.5 w-3.5" /> Agent Mode
                  </Label>
                  <Switch checked={agentMode} onCheckedChange={setAgentMode} />
                </div>
                {agentMode && (
                  <>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Model AI bisa <strong>membaca/menulis file</strong>, <strong>menjalankan shell</strong>,
                      <strong> query database</strong>, dan <strong>restart workflow</strong> di project ini.
                      Hanya untuk admin.
                    </p>
                    <div className="flex items-center gap-2 rounded bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>Model bisa menghapus file & data. Awasi setiap tool-call.</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Label className="text-[11px] cursor-pointer">Mode prompt-fallback</Label>
                      <Switch checked={fallbackTools} onCheckedChange={setFallbackTools} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Aktifkan untuk model yang tidak punya function-calling native.
                    </p>
                  </>
                )}
              </div>

              {selectedProvider && (
                <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-2.5 text-[11px] space-y-1">
                  <p className="flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-300">
                    <Lock className="h-3 w-3" /> Enkripsi disarankan
                  </p>
                  <p className="text-muted-foreground">At rest: <code>{selectedProvider.encryption.atRest}</code></p>
                  <p className="text-muted-foreground">In transit: <code>{selectedProvider.encryption.inTransit}</code></p>
                  <p className="text-muted-foreground italic">{selectedProvider.encryption.note}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat */}
          <Card className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <span>{selectedProvider?.name ?? "Belum terhubung"}</span>
                {model && <Badge variant="outline" className="text-xs">{model}</Badge>}
                <Button
                  variant="ghost" size="sm"
                  className="ml-auto h-7"
                  onClick={() => setMessages([])}
                  disabled={messages.length === 0}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Bersihkan
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && !sending && (
                  <div className="text-center text-sm text-muted-foreground py-12">
                    Mulai percakapan dengan mengetik pesan di bawah.
                  </div>
                )}
                {messages.filter((m) => m.role !== "system").map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {m.toolEvents && m.toolEvents.length > 0 && (
                        <details className="mb-2 text-xs not-prose">
                          <summary className="cursor-pointer flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium">
                            <Wrench className="h-3 w-3" /> {m.toolEvents.filter((e) => e.type === "tool_call").length} tool-call dijalankan
                          </summary>
                          <div className="mt-2 space-y-1.5 border-l-2 border-amber-500/40 pl-2">
                            {m.toolEvents.filter((e) => e.type !== "final").map((e, j) => (
                              <div key={j} className="font-mono text-[10px] leading-snug">
                                {e.type === "tool_call" && (
                                  <div>
                                    <span className="text-amber-600 dark:text-amber-400">→ {e.tool}(</span>
                                    <span className="text-muted-foreground break-all">{JSON.stringify(e.args).slice(0, 200)}</span>
                                    <span className="text-amber-600 dark:text-amber-400">)</span>
                                  </div>
                                )}
                                {e.type === "tool_result" && (
                                  <div className="text-green-700 dark:text-green-400 break-all">
                                    ← {JSON.stringify(e.result).slice(0, 240)}
                                    {JSON.stringify(e.result).length > 240 && "…"}
                                  </div>
                                )}
                                {e.type === "assistant" && e.text && (
                                  <div className="text-muted-foreground italic">💭 {e.text.slice(0, 200)}</div>
                                )}
                                {e.type === "error" && <div className="text-red-500">⚠ {e.error}</div>}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="rounded-lg px-3 py-2 bg-muted text-sm flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mengetik...
                    </div>
                  </div>
                )}
              </div>
              <form
                className="border-t p-3 flex gap-2"
                onSubmit={(e) => { e.preventDefault(); send(); }}
              >
                <Textarea
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={
                    !provider ? "Pilih provider dulu" :
                    !apiKey ? "Masukkan API key dulu" :
                    !model ? "Pilih model dulu" :
                    "Ketik pesan... (Enter untuk kirim, Shift+Enter baris baru)"
                  }
                  disabled={!provider || !apiKey || !model || sending}
                  className="min-h-[40px] max-h-32 resize-none"
                />
                <Button
                  type="submit"
                  disabled={!provider || !apiKey || !model || !draft.trim() || sending}
                  className="self-end"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
