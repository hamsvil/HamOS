import { AppLayout } from "@/components/layout/app-layout";
import {
  useGetKey, useRevokeKey, useArchiveKey, useRestoreKey,
  useAddKeyTag, useRemoveKeyTag, useGetKeyHistory, getGetKeyQueryKey
} from "@workspace/api-client-react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2, Ban, Archive, ArchiveRestore, ArrowLeft,
  Tag, X, Clock, Shield, Key, Activity, Copy, Check, ChevronRight, Home
} from "lucide-react";
import { Link } from "wouter";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-green-500/20 text-green-600 border-green-500/30",
    revoked: "bg-red-500/20 text-red-600 border-red-500/30",
    expired: "bg-orange-500/20 text-orange-600 border-orange-500/30",
    archived: "bg-gray-500/20 text-gray-500 border-gray-500/30",
  };
  return <Badge className={map[status] ?? ""}>{status}</Badge>;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true); toast.success("Disalin!"); setTimeout(() => setCopied(false), 2000);
      });
    }}>
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

export default function KeyDetail() {
  const [, params] = useRoute("/keys/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ? parseInt(params.id) : 0;
  const queryClient = useQueryClient();

  const { data: key, isLoading } = useGetKey(id, { query: { enabled: !!id } });
  const { data: history, isLoading: histLoading } = useGetKeyHistory(id, {}, { query: { enabled: !!id } });

  const revokeKey = useRevokeKey();
  const archiveKey = useArchiveKey();
  const restoreKey = useRestoreKey();
  const addTag = useAddKeyTag();
  const removeTag = useRemoveKeyTag();

  const [tagInput, setTagInput] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetKeyQueryKey(id) });

  const handleRevoke = () => {
    if (!confirm("Yakin ingin merevoke key ini? Tindakan ini tidak bisa dibatalkan.")) return;
    revokeKey.mutate({ id }, {
      onSuccess: () => { toast.success("Key berhasil direvoke"); invalidate(); },
      onError: () => toast.error("Gagal merevoke key")
    });
  };

  const handleArchive = () => {
    archiveKey.mutate({ id }, {
      onSuccess: () => { toast.success("Key diarsipkan"); invalidate(); },
      onError: () => toast.error("Gagal mengarsipkan key")
    });
  };

  const handleRestore = () => {
    restoreKey.mutate({ id }, {
      onSuccess: () => { toast.success("Key dipulihkan"); invalidate(); },
      onError: () => toast.error("Gagal memulihkan key")
    });
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = tagInput.trim();
    if (!tag) return;
    addTag.mutate({ id, data: { tag } }, {
      onSuccess: () => { toast.success(`Tag '${tag}' ditambahkan`); setTagInput(""); invalidate(); },
      onError: () => toast.error("Gagal menambah tag")
    });
  };

  const handleRemoveTag = (tag: string) => {
    removeTag.mutate({ id, tag }, {
      onSuccess: () => { toast.success(`Tag '${tag}' dihapus`); invalidate(); },
      onError: () => toast.error("Gagal menghapus tag")
    });
  };

  if (isLoading) {
    return <AppLayout><div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  if (!key) {
    return <AppLayout><div className="text-center p-12 text-muted-foreground">Key tidak ditemukan.</div></AppLayout>;
  }

  const isActive = key.status === "active";
  const isArchived = key.status === "archived";

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/dashboard" className="inline-flex items-center gap-1 hover:text-foreground">
            <Home className="h-3 w-3" /> Dashboard
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/keys" className="hover:text-foreground">API Keys</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium truncate max-w-[40ch]">{key.name}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/keys")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{key.name}</h1>
              <StatusBadge status={key.status} />
              <Badge variant="outline" className="text-xs">{key.provider}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Dibuat {new Date(key.createdAt).toLocaleString("id-ID")}
            </p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            {isActive && (
              <>
                <Button variant="outline" size="sm" onClick={handleArchive} disabled={archiveKey.isPending} className="gap-1.5">
                  <Archive className="h-3.5 w-3.5" /> Arsipkan
                </Button>
                <Button variant="destructive" size="sm" onClick={handleRevoke} disabled={revokeKey.isPending} className="gap-1.5">
                  {revokeKey.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                  Revoke
                </Button>
              </>
            )}
            {isArchived && (
              <Button variant="outline" size="sm" onClick={handleRestore} disabled={restoreKey.isPending} className="gap-1.5">
                <ArchiveRestore className="h-3.5 w-3.5" /> Pulihkan
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="details">
          <TabsList className="grid w-full grid-cols-3 max-w-sm">
            <TabsTrigger value="details" className="gap-1.5">
              <Key className="h-3.5 w-3.5" /> Detail
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Riwayat
            </TabsTrigger>
            <TabsTrigger value="tags" className="gap-1.5">
              <Tag className="h-3.5 w-3.5" /> Tags
            </TabsTrigger>
          </TabsList>

          {/* DETAILS TAB */}
          <TabsContent value="details" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Identitas Key
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Prefix</p>
                    <div className="flex items-center gap-1">
                      <code className="flex-1 bg-muted px-2 py-1.5 rounded text-xs font-mono">{key.keyPrefix}...</code>
                      <CopyBtn text={key.keyPrefix} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Suffix</p>
                    <div className="flex items-center gap-1">
                      <code className="flex-1 bg-muted px-2 py-1.5 rounded text-xs font-mono">...{key.keySuffix}</code>
                      <CopyBtn text={key.keySuffix} />
                    </div>
                  </div>
                  {key.lastValidStatus && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status Terakhir</p>
                      <Badge variant="outline">{key.lastValidStatus}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Statistik
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Penggunaan</p>
                      <p className="text-2xl font-bold">{key.usageCount ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Rate Limit</p>
                      <p className="text-lg font-semibold">{key.rateLimit ?? "∞"}<span className="text-xs text-muted-foreground">/jam</span></p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {key.lastValidatedAt && (
                      <div className="flex justify-between">
                        <span>Terakhir divalidasi</span>
                        <span>{new Date(key.lastValidatedAt).toLocaleString("id-ID")}</span>
                      </div>
                    )}
                    {key.expiresAt && (
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Kadaluarsa</span>
                        <span className={new Date(key.expiresAt) < new Date() ? "text-destructive font-medium" : ""}>
                          {new Date(key.expiresAt).toLocaleString("id-ID")}
                        </span>
                      </div>
                    )}
                    {key.environmentId && (
                      <div className="flex justify-between">
                        <span>Environment</span>
                        <Badge variant="outline" className="text-xs">ID {key.environmentId}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Riwayat Validasi</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border-t">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Response</TableHead>
                        <TableHead>Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {histLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : !history?.data?.length ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                            Belum ada riwayat validasi untuk key ini.
                          </TableCell>
                        </TableRow>
                      ) : history.data.map((h: any) => (
                        <TableRow key={h.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(h.validatedAt).toLocaleString("id-ID")}
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{h.provider}</Badge></TableCell>
                          <TableCell>
                            <Badge className={
                              h.status === "valid" ? "bg-green-500/20 text-green-600 border-green-500/30" :
                              h.status === "invalid" ? "bg-red-500/20 text-red-600 border-red-500/30" :
                              "bg-orange-500/20 text-orange-600 border-orange-500/30"
                            }>
                              {h.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{h.responseTime}ms</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {h.error ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAGS TAB */}
          <TabsContent value="tags" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleAddTag} className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    placeholder="Tambah tag baru..."
                    className="max-w-xs"
                  />
                  <Button type="submit" size="sm" disabled={addTag.isPending || !tagInput.trim()} className="gap-1.5">
                    {addTag.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" />}
                    Tambah
                  </Button>
                </form>

                {key.tags?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {key.tags.map((tag: string) => (
                      <div key={tag} className="flex items-center gap-1 bg-muted rounded-full px-3 py-1">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{tag}</span>
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Belum ada tags.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
