import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";

type Dataset = "keys" | "history" | "audit";
type Format = "json" | "csv";

const datasets: { id: Dataset; label: string; desc: string; formats: Format[] }[] = [
  { id: "keys", label: "API Keys", desc: "Semua key milik akun ini.", formats: ["json", "csv"] },
  { id: "history", label: "Validation History", desc: "10 ribu riwayat validasi terakhir.", formats: ["json", "csv"] },
  { id: "audit", label: "Audit Log", desc: "Audit log akun ini (CSV).", formats: ["csv"] },
];

function buildUrl(ds: Dataset, fmt: Format) {
  const qs = fmt === "csv" ? "?format=csv" : "";
  return `/api/export/${ds}${qs}`;
}

export default function Export() {
  const [busy, setBusy] = useState<string | null>(null);

  async function download(ds: Dataset, fmt: Format) {
    setBusy(`${ds}.${fmt}`);
    try {
      const url = buildUrl(ds, fmt);
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const filename = `${ds}-${new Date().toISOString().slice(0, 10)}.${fmt}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(`Gagal export: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Data Export</h1>
        <p className="text-sm text-muted-foreground">
          Unduh data Anda dalam format JSON atau CSV. File diunduh langsung lewat browser.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {datasets.map((ds) => (
            <div key={ds.id} className="p-5 border rounded-md bg-card space-y-3">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                <h2 className="font-medium">{ds.label}</h2>
              </div>
              <p className="text-xs text-muted-foreground">{ds.desc}</p>
              <div className="flex gap-2">
                {ds.formats.includes("json") && (
                  <Button
                    size="sm" variant="outline"
                    disabled={busy === `${ds.id}.json`}
                    onClick={() => download(ds.id, "json")}
                  >
                    <FileJson className="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                )}
                {ds.formats.includes("csv") && (
                  <Button
                    size="sm"
                    disabled={busy === `${ds.id}.csv`}
                    onClick={() => download(ds.id, "csv")}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
