import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { api, type Tool } from "@/lib/apiClient";
import { Wrench, Plus, Trash2, RefreshCw, Loader2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

const IMPL_PLACEHOLDER = `// 'input' contains tool arguments
// 'WORKSPACE_ROOT', 'execSync', 'fs', 'path' are available
// Return a string result

const { path: filePath } = input;
const content = fs.readFileSync(filePath, 'utf-8');
return \`Word count: \${content.split(' ').length}\`;`;

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inputSchemaStr, setInputSchemaStr] = useState('{\n  "type": "object",\n  "properties": {\n    "path": { "type": "string", "description": "File path" }\n  },\n  "required": ["path"]\n}');
  const [implementation, setImplementation] = useState(IMPL_PLACEHOLDER);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const data = await api.tools.list();
    setTools(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let inputSchema: Record<string, unknown>;
    try {
      inputSchema = JSON.parse(inputSchemaStr);
    } catch {
      toast({ title: "Invalid JSON", description: "Input schema must be valid JSON", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await api.tools.register({ name: name.trim(), description: description.trim(), inputSchema, implementation });
      setName(""); setDescription(""); setImplementation(IMPL_PLACEHOLDER);
      setOpen(false);
      toast({ title: "Tool registered", description: `${name} is now available to the autopilot` });
      await load();
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (toolName: string, enabled: boolean) => {
    try {
      await api.tools.toggle(toolName, enabled);
      await load();
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    }
  };

  const handleDelete = async (toolName: string) => {
    try {
      await api.tools.delete(toolName);
      toast({ title: "Tool deleted" });
      await load();
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    }
  };

  const builtins = tools.filter((t) => t.isBuiltin);
  const dynamic = tools.filter((t) => !t.isBuiltin);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tools</h1>
          <p className="text-muted-foreground text-sm mt-1">Built-in tools and dynamic tools available to the autopilot</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1.5" /> Register Tool
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Register Dynamic Tool</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-3 mt-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Tool Name (snake_case)</Label>
                  <Input placeholder="e.g. count_words" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Description</Label>
                  <Input placeholder="What does this tool do?" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Input Schema (JSON)</Label>
                  <Textarea
                    value={inputSchemaStr}
                    onChange={(e) => setInputSchemaStr(e.target.value)}
                    rows={6}
                    className="font-mono text-xs resize-none"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Implementation (JavaScript)</Label>
                  <Textarea
                    value={implementation}
                    onChange={(e) => setImplementation(e.target.value)}
                    rows={8}
                    className="font-mono text-xs resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available: <code className="bg-muted px-1 rounded">input</code>, <code className="bg-muted px-1 rounded">WORKSPACE_ROOT</code>, <code className="bg-muted px-1 rounded">execSync</code>, <code className="bg-muted px-1 rounded">fs</code>, <code className="bg-muted px-1 rounded">path</code>
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={saving || !name.trim() || !description.trim()}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Register Tool
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {dynamic.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Dynamic Tools ({dynamic.length})</h3>
              <div className="space-y-2">
                {dynamic.map((tool) => (
                  <Card key={tool.name} className="border-border/50 bg-card/50">
                    <CardContent className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-mono font-medium">{tool.name}</span>
                          <Badge variant={tool.enabled ? "default" : "secondary"} className="text-xs">
                            {tool.enabled ? "enabled" : "disabled"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{tool.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={tool.enabled}
                          onCheckedChange={(v) => handleToggle(tool.name, v)}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(tool.name)}>
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Built-in Tools ({builtins.length})</h3>
            <div className="space-y-2">
              {builtins.map((tool) => (
                <Card key={tool.name} className="border-border/50 bg-card/50 opacity-80">
                  <CardContent className="px-4 py-3 flex items-center gap-3">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-mono">{tool.name}</span>
                        <Badge variant="outline" className="text-xs">builtin</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{tool.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
