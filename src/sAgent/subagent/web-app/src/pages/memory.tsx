import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api, type MemoryEntry } from "@/lib/apiClient";
import { Brain, Plus, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

export default function MemoryPage() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("general");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const data = await api.memory.list();
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !value.trim()) return;
    setSaving(true);
    try {
      await api.memory.set(key.trim(), { value: value.trim(), category: category.trim() || "general", ttlHours: 24 });
      setKey(""); setValue(""); setCategory("general");
      setOpen(false);
      toast({ title: "Memory stored" });
      await load();
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (k: string) => {
    try {
      await api.memory.delete(k);
      toast({ title: "Memory deleted" });
      await load();
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    }
  };

  const handleClear = async () => {
    if (!confirm("Clear all memory entries?")) return;
    try {
      await api.memory.clear();
      toast({ title: "Memory cleared" });
      await load();
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    }
  };

  const grouped = entries.reduce<Record<string, MemoryEntry[]>>((acc, e) => {
    (acc[e.category] ??= []).push(e);
    return acc;
  }, {});

  const timeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff < 0) return "expired";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Memory</h1>
          <p className="text-muted-foreground text-sm mt-1">Long-term agent memory with 24-hour TTL</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          {entries.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClear} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-1.5" /> Clear All
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1.5" /> Store Memory
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Store Memory Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-3 mt-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Key</Label>
                  <Input placeholder="e.g. project_name" value={key} onChange={(e) => setKey(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Value</Label>
                  <Textarea placeholder="What to remember..." value={value} onChange={(e) => setValue(e.target.value)} rows={3} className="resize-none" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Category</Label>
                  <Input placeholder="general" value={category} onChange={(e) => setCategory(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={saving || !key.trim() || !value.trim()}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Store (24h TTL)
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Brain className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No memory entries. The agent will store important context here during task execution.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, catEntries]) => (
          <div key={cat}>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{cat}</h3>
            <div className="space-y-2">
              {catEntries.map((entry) => (
                <Card key={entry.key} className="border-border/50 bg-card/50">
                  <CardContent className="px-4 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-mono font-medium">{entry.key}</span>
                        <span className="text-xs text-muted-foreground">expires in {timeLeft(entry.expiresAt)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground break-words">{entry.value}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDelete(entry.key)}>
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
