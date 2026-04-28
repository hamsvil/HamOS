import { AppLayout } from "@/components/layout/app-layout";
import {
  useListKeys,
  useDeleteKey,
  useRevokeKey,
  useArchiveKey,
  useBulkRevokeKeys,
  useBulkArchiveKeys,
  getListKeysQueryKey,
  useListEnvironments,
  useListProviders,
} from "@workspace/api-client-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Loader2, MoreVertical, Trash, Ban, Archive, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type ConfirmKind = "delete" | "revoke" | "archive" | "rotate" | "bulk-revoke" | "bulk-archive";
type Confirm = { kind: ConfirmKind; id?: number; name?: string } | null;

function ttlBadge(expiresAt: string | null | undefined) {
  if (!expiresAt) return <span className="text-muted-foreground text-xs">—</span>;
  const ms = new Date(expiresAt).getTime() - Date.now();
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (ms <= 0) return <Badge variant="destructive">expired</Badge>;
  if (days <= 7) return <Badge variant="destructive">{days}d</Badge>;
  if (days <= 30) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">{days}d</Badge>;
  return <Badge variant="secondary">{days}d</Badge>;
}

export default function KeysList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [environmentId, setEnvironmentId] = useState<number | null>(null);
  const [provider, setProvider] = useState<string>("");
  const [page] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmAction, setConfirmAction] = useState<Confirm>(null);

  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListKeysQueryKey() });

  const { data: keys, isLoading } = useListKeys({
    search: search || undefined,
    status: status || undefined,
    environmentId: environmentId || undefined,
    provider: provider || undefined,
    page,
    limit: 20,
  }, { query: { enabled: true } });

  const { data: environments } = useListEnvironments({ query: { enabled: true } });
  const { data: providers } = useListProviders({ query: { enabled: true } });

  const deleteKey = useDeleteKey();
  const revokeKey = useRevokeKey();
  const archiveKey = useArchiveKey();
  const bulkRevoke = useBulkRevokeKeys();
  const bulkArchive = useBulkArchiveKeys();

  const rows = keys?.data ?? [];
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };
  const toggleOne = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  async function handleConfirm() {
    if (!confirmAction) return;
    const c = confirmAction;
    setConfirmAction(null);
    try {
      if (c.kind === "delete" && c.id) {
        await deleteKey.mutateAsync({ id: c.id });
        toast.success("Key deleted");
      } else if (c.kind === "revoke" && c.id) {
        await revokeKey.mutateAsync({ id: c.id });
        toast.success("Key revoked");
      } else if (c.kind === "archive" && c.id) {
        await archiveKey.mutateAsync({ id: c.id });
        toast.success("Key archived");
      } else if (c.kind === "rotate" && c.id) {
        const res = await fetch(`/api/keys/${c.id}/rotate`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format: "hex", length: 32 }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        await navigator.clipboard.writeText(data.fullKey).catch(() => {});
        toast.success(`Key rotated to v${data.version} — new value copied to clipboard`);
      } else if (c.kind === "bulk-revoke") {
        await bulkRevoke.mutateAsync({ data: { ids: selectedIds } });
        toast.success(`Revoked ${selectedIds.length} keys`);
        setSelected(new Set());
      } else if (c.kind === "bulk-archive") {
        await bulkArchive.mutateAsync({ data: { ids: selectedIds } });
        toast.success(`Archived ${selectedIds.length} keys`);
        setSelected(new Set());
      }
      invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? "Action failed");
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <Link href="/keys/generate">
            <Button data-testid="button-generate"><Plus className="mr-2 h-4 w-4" /> Generate Key</Button>
          </Link>
        </div>

        <div className="flex gap-4 items-center flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search keys..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              data-testid="input-search"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Provider" /></SelectTrigger>
            <SelectContent>
              {providers?.map((p) => (<SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={environmentId?.toString() || ""} onValueChange={(v) => setEnvironmentId(parseInt(v))}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Environment" /></SelectTrigger>
            <SelectContent>
              {environments?.map((e) => (<SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Button variant="ghost" onClick={() => { setSearch(""); setStatus(""); setEnvironmentId(null); setProvider(""); }}>
            Clear Filters
          </Button>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/40">
            <span className="text-sm font-medium">{selectedIds.length} selected</span>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={() => setConfirmAction({ kind: "bulk-archive" })}>
              <Archive className="mr-2 h-4 w-4" /> Archive
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setConfirmAction({ kind: "bulk-revoke" })}>
              <Ban className="mr-2 h-4 w-4" /> Revoke
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="Select all" />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>TTL</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No keys found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((key) => (
                  <TableRow key={key.id} data-testid={`row-key-${key.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(key.id)}
                        onCheckedChange={() => toggleOne(key.id)}
                        aria-label={`Select ${key.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/keys/${key.id}`} className="hover:underline">{key.name}</Link>
                    </TableCell>
                    <TableCell>{key.provider}</TableCell>
                    <TableCell className="font-mono text-xs">{key.keyPrefix}...</TableCell>
                    <TableCell>
                      <Badge variant={key.status === "active" ? "default" : "secondary"}>{key.status}</Badge>
                    </TableCell>
                    <TableCell>{ttlBadge(key.expiresAt as any)}</TableCell>
                    <TableCell>{new Date(key.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/keys/${key.id}`}>
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                          </Link>
                          {key.status === "active" && (
                            <DropdownMenuItem onClick={() => setConfirmAction({ kind: "rotate", id: key.id, name: key.name })}>
                              <RefreshCw className="mr-2 h-4 w-4" /> Rotate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setConfirmAction({ kind: "archive", id: key.id, name: key.name })}>
                            <Archive className="mr-2 h-4 w-4" /> Archive
                          </DropdownMenuItem>
                          {key.status === "active" && (
                            <DropdownMenuItem className="text-destructive" onClick={() => setConfirmAction({ kind: "revoke", id: key.id, name: key.name })}>
                              <Ban className="mr-2 h-4 w-4" /> Revoke
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive" onClick={() => setConfirmAction({ kind: "delete", id: key.id, name: key.name })}>
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.kind === "delete" && "Delete this key?"}
              {confirmAction?.kind === "revoke" && "Revoke this key?"}
              {confirmAction?.kind === "archive" && "Archive this key?"}
              {confirmAction?.kind === "rotate" && "Rotate this key?"}
              {confirmAction?.kind === "bulk-revoke" && `Revoke ${selectedIds.length} keys?`}
              {confirmAction?.kind === "bulk-archive" && `Archive ${selectedIds.length} keys?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.kind === "delete" && `"${confirmAction.name}" will be permanently removed. This cannot be undone.`}
              {confirmAction?.kind === "revoke" && `"${confirmAction.name}" will be marked revoked and rejected on validation.`}
              {confirmAction?.kind === "archive" && `"${confirmAction.name}" will be hidden from the active list.`}
              {confirmAction?.kind === "rotate" && `A new secret will be generated for "${confirmAction.name}". The old value stops working immediately and cannot be recovered.`}
              {confirmAction?.kind === "bulk-revoke" && "Selected keys will be marked revoked."}
              {confirmAction?.kind === "bulk-archive" && "Selected keys will be moved to archive."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
