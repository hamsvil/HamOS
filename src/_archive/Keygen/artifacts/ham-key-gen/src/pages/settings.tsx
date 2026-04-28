import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/lib/theme";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sun, Moon, Monitor, Trash2, UserPlus } from "lucide-react";

type SessionInfo = {
  userId: number; username: string; role: string;
  ipAddress: string; userAgent: string;
  cookieMaxAge: number | null; expiresAt: string | null;
};

type AdminUser = {
  id: number; username: string; displayName: string; role: string; createdAt: string;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export default function Settings() {
  const { data: user } = useGetMe({ query: { enabled: true } });
  const { mode, setMode } = useTheme();
  const qc = useQueryClient();

  const session = useQuery({
    queryKey: ["auth", "session"],
    queryFn: () => api<SessionInfo>("/api/auth/session"),
  });

  const isAdmin = user?.role === "admin";

  const users = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => api<AdminUser[]>("/api/admin/users"),
    enabled: isAdmin,
  });

  // Change password
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const changePwMut = useMutation({
    mutationFn: () =>
      api("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      }),
    onSuccess: () => {
      setPwMsg({ kind: "ok", text: "Password berhasil diganti." });
      setCurPw(""); setNewPw("");
    },
    onError: (e: Error) => setPwMsg({ kind: "err", text: e.message }),
  });

  // Create user (admin)
  const [nu, setNu] = useState({ username: "", displayName: "", password: "", role: "user" });
  const [nuMsg, setNuMsg] = useState<string | null>(null);
  const createUserMut = useMutation({
    mutationFn: () =>
      api("/api/admin/users", { method: "POST", body: JSON.stringify(nu) }),
    onSuccess: () => {
      setNuMsg("User dibuat.");
      setNu({ username: "", displayName: "", password: "", role: "user" });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => setNuMsg(e.message),
  });

  const deleteUserMut = useMutation({
    mutationFn: (id: number) => api(`/api/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

        {/* Profile */}
        <section className="p-6 border rounded-md bg-card space-y-3">
          <h2 className="text-lg font-medium">Profil</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Username</div>
            <div className="font-medium">{user?.username}</div>
            <div className="text-muted-foreground">Display name</div>
            <div className="font-medium">{user?.displayName}</div>
            <div className="text-muted-foreground">Role</div>
            <div className="font-medium capitalize">{user?.role}</div>
          </div>
        </section>

        {/* Theme */}
        <section className="p-6 border rounded-md bg-card space-y-3">
          <h2 className="text-lg font-medium">Tampilan</h2>
          <div className="flex gap-2">
            {(["light", "dark", "auto"] as const).map((m) => {
              const Icon = m === "light" ? Sun : m === "dark" ? Moon : Monitor;
              return (
                <Button
                  key={m}
                  variant={mode === m ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode(m)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {m === "light" ? "Terang" : m === "dark" ? "Gelap" : "Auto"}
                </Button>
              );
            })}
          </div>
        </section>

        {/* Session */}
        <section className="p-6 border rounded-md bg-card space-y-3">
          <h2 className="text-lg font-medium">Session aktif</h2>
          {session.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : session.data ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">IP Address</div>
              <div className="font-mono">{session.data.ipAddress}</div>
              <div className="text-muted-foreground">User Agent</div>
              <div className="truncate">{session.data.userAgent}</div>
              <div className="text-muted-foreground">Berlaku sampai</div>
              <div>{session.data.expiresAt ? new Date(session.data.expiresAt).toLocaleString() : "-"}</div>
            </div>
          ) : (
            <div className="text-sm text-destructive">Tidak dapat memuat session.</div>
          )}
        </section>

        {/* Change password */}
        <section className="p-6 border rounded-md bg-card space-y-3">
          <h2 className="text-lg font-medium">Ganti password</h2>
          <p className="text-xs text-muted-foreground">
            Minimal 10 karakter, mengandung huruf besar, kecil, dan angka.
          </p>
          <div className="space-y-2 max-w-md">
            <div>
              <Label>Password lama</Label>
              <Input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
            </div>
            <div>
              <Label>Password baru</Label>
              <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            </div>
            <Button
              size="sm"
              disabled={!curPw || !newPw || changePwMut.isPending}
              onClick={() => { setPwMsg(null); changePwMut.mutate(); }}
            >
              {changePwMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Simpan
            </Button>
            {pwMsg && (
              <div className={`text-xs ${pwMsg.kind === "ok" ? "text-green-600" : "text-destructive"}`}>
                {pwMsg.text}
              </div>
            )}
          </div>
        </section>

        {/* Admin users */}
        {isAdmin && (
          <section className="p-6 border rounded-md bg-card space-y-3">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Manajemen User (admin)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 max-w-3xl">
              <Input placeholder="username" value={nu.username} onChange={(e) => setNu({ ...nu, username: e.target.value })} />
              <Input placeholder="display name" value={nu.displayName} onChange={(e) => setNu({ ...nu, displayName: e.target.value })} />
              <Input type="password" placeholder="password" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} />
              <select
                className="border rounded-md px-2 text-sm bg-background"
                value={nu.role}
                onChange={(e) => setNu({ ...nu, role: e.target.value })}
              >
                <option value="admin">admin</option>
                <option value="user">user</option>
                <option value="viewer">viewer</option>
              </select>
            </div>
            <Button size="sm" disabled={createUserMut.isPending} onClick={() => { setNuMsg(null); createUserMut.mutate(); }}>
              Tambah user
            </Button>
            {nuMsg && <div className="text-xs text-muted-foreground">{nuMsg}</div>}

            <div className="border rounded-md overflow-hidden mt-4">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Username</th>
                    <th className="px-3 py-2">Display name</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.data?.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="px-3 py-2 font-mono">{u.id}</td>
                      <td className="px-3 py-2">{u.username}</td>
                      <td className="px-3 py-2">{u.displayName}</td>
                      <td className="px-3 py-2 capitalize">{u.role}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">
                        {u.id !== user?.id && (
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => {
                              if (confirm(`Hapus user "${u.username}"?`)) deleteUserMut.mutate(u.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.data?.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Belum ada user.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
