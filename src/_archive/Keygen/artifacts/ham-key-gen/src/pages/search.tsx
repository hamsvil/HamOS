import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search as SearchIcon, KeyRound, History, FileText } from "lucide-react";
import { Link } from "wouter";

type ApiKey = { id: number; name: string; provider: string; keyPrefix: string; status: string };
type Hist = { id: number; provider: string; keyPrefix: string; status: string; validatedAt: string };
type Audit = { id: number; action: string; entityType: string; entityId: number | null; createdAt: string };

async function api<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function Search() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);

  const search = useQuery({
    queryKey: ["search", dq],
    queryFn: () =>
      api<{ keys: ApiKey[]; history: Hist[]; audit: Audit[] }>(
        `/api/search?q=${encodeURIComponent(dq)}`,
      ),
    enabled: dq.length >= 2,
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Global Search</h1>
        <div className="relative max-w-2xl">
          <SearchIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari nama key, provider, prefix, atau aksi audit (min 2 huruf)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {dq.length < 2 && (
          <div className="text-center p-12 text-muted-foreground border rounded-md">
            Mulai mengetik untuk mencari (minimal 2 huruf).
          </div>
        )}

        {search.isFetching && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Mencari…
          </div>
        )}

        {search.data && (
          <div className="grid gap-4 md:grid-cols-3">
            <Group title="API Keys" icon={KeyRound} count={search.data.keys.length}>
              {search.data.keys.map((k) => (
                <Link key={k.id} href={`/keys/${k.id}`}>
                  <div className="px-3 py-2 hover:bg-muted rounded cursor-pointer text-sm">
                    <div className="font-medium truncate">{k.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {k.provider} · {k.keyPrefix}… · {k.status}
                    </div>
                  </div>
                </Link>
              ))}
              {search.data.keys.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Tidak ada hasil.</div>
              )}
            </Group>

            <Group title="Validation History" icon={History} count={search.data.history.length}>
              {search.data.history.map((h) => (
                <div key={h.id} className="px-3 py-2 text-sm">
                  <div className="font-medium">{h.provider} · <span className="text-xs text-muted-foreground">{h.status}</span></div>
                  <div className="text-xs text-muted-foreground">
                    {h.keyPrefix}… · {new Date(h.validatedAt).toLocaleString()}
                  </div>
                </div>
              ))}
              {search.data.history.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Tidak ada hasil.</div>
              )}
            </Group>

            <Group title="Audit Log" icon={FileText} count={search.data.audit.length}>
              {search.data.audit.map((a) => (
                <div key={a.id} className="px-3 py-2 text-sm">
                  <div className="font-medium">{a.action}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.entityType ?? "-"} · {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
              {search.data.audit.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Tidak ada hasil.</div>
              )}
            </Group>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Group({
  title, icon: Icon, count, children,
}: { title: string; icon: typeof SearchIcon; count: number; children: React.ReactNode }) {
  return (
    <div className="border rounded-md bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted text-sm font-medium">
        <Icon className="h-4 w-4" /> {title}
        <span className="ml-auto text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="divide-y">{children}</div>
    </div>
  );
}
