import { AppLayout } from "@/components/layout/app-layout";
import { useListEnvironments, useCreateEnvironment, useDeleteEnvironment } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Database } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const ENV_COLORS = ["#00BFFF","#00FF88","#FF8C00","#FF4455","#A855F7","#F59E0B","#10B981","#3B82F6"];

export default function Environments() {
  const queryClient = useQueryClient();
  const { data: environments, isLoading } = useListEnvironments({ query: { enabled: true } });
  const createEnv = useCreateEnvironment();
  const deleteEnv = useDeleteEnvironment();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(ENV_COLORS[0]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createEnv.mutate({ data: { name: name.trim(), color } }, {
      onSuccess: () => {
        toast.success(`Environment '${name}' dibuat`);
        setOpen(false);
        setName("");
        setColor(ENV_COLORS[0]);
        queryClient.invalidateQueries({ queryKey: ["environments"] });
      },
      onError: () => toast.error("Gagal membuat environment")
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Hapus environment '${name}'?`)) return;
    deleteEnv.mutate({ id }, {
      onSuccess: () => {
        toast.success("Environment dihapus");
        queryClient.invalidateQueries({ queryKey: ["environments"] });
      },
      onError: () => toast.error("Gagal menghapus environment")
    });
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Environments</h1>
            <p className="text-sm text-muted-foreground">Kelompokkan API key berdasarkan environment</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Tambah Environment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Environment Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nama Environment</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Production, Staging, Dev" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Warna</Label>
                  <div className="flex gap-2 flex-wrap">
                    {ENV_COLORS.map(c => (
                      <button
                        key={c} type="button"
                        className={`w-8 h-8 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setColor(c)}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
                  <Button type="submit" disabled={createEnv.isPending || !name.trim()}>
                    {createEnv.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Buat Environment
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : !environments?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Database className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground mb-4">Belum ada environment.</p>
              <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Buat Environment Pertama</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {environments.map(env => (
              <Card key={env.id} className="group relative">
                <div className="absolute inset-x-0 top-0 h-1 rounded-t-lg" style={{ backgroundColor: env.color }} />
                <CardHeader className="pt-5 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: env.color }} />
                    <span className="truncate">{env.name}</span>
                    {env.isDefault && <Badge variant="outline" className="text-xs ml-auto">Default</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <p className="text-2xl font-bold">{env.keyCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">API keys terdaftar</p>
                  <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 w-full"
                      onClick={() => handleDelete(env.id, env.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Hapus
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
