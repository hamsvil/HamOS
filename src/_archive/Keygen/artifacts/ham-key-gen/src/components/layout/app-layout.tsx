import { useState, useEffect, useCallback } from "react";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Link, useLocation, Redirect } from "wouter";
import { Logo3D } from "../logo";
import {
  Loader2, KeyRound, Shield, Search, CheckCircle, Database,
  History, Bell, Calendar, Download, Settings, Webhook, LogOut, Menu, X, Server,
  Sun, Moon, Monitor, Wifi, WifiOff, MessageSquare,
} from "lucide-react";
import { Button } from "../ui/button";
import { useTheme } from "../../lib/theme";

function initials(name: string | undefined | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function useBackendStatus() {
  const [status, setStatus] = useState<"online" | "offline" | "checking">("checking");
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const r = await fetch("/api/readyz", { credentials: "include" });
        if (!cancelled) setStatus(r.ok ? "online" : "offline");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    };
    check();
    const id = setInterval(check, 30_000);
    const onOnline = () => check();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", () => setStatus("offline"));
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("online", onOnline);
    };
  }, []);
  return status;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Shield },
  { href: "/keys", label: "API Keys", icon: KeyRound },
  { href: "/validate", label: "Validation", icon: CheckCircle },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/providers", label: "Providers", icon: Database },
  { href: "/environments", label: "Environments", icon: Database },
  { href: "/audit", label: "Audit Log", icon: History },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/scheduled", label: "Scheduled", icon: Calendar },
  { href: "/export", label: "Export", icon: Download },
  { href: "/search", label: "Search", icon: Search },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/system", label: "System", icon: Server },
];

function useBreakpoint() {
  const [bp, setBp] = useState<"mobile" | "tablet" | "desktop">(() => {
    if (typeof window === "undefined") return "desktop";
    if (window.innerWidth < 640) return "mobile";
    if (window.innerWidth < 1024) return "tablet";
    return "desktop";
  });
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth < 640) setBp("mobile");
      else if (window.innerWidth < 1024) setBp("tablet");
      else setBp("desktop");
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return bp;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useGetMe({ query: { retry: false } });
  const logout = useLogout();
  const [location, setLocation] = useLocation();
  const bp = useBreakpoint();
  const isOverlay = bp === "mobile" || bp === "tablet";
  const { mode: themeMode, cycle: cycleTheme } = useTheme();
  const ThemeIcon = themeMode === "light" ? Sun : themeMode === "dark" ? Moon : Monitor;
  const backendStatus = useBackendStatus();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(bp === "desktop");
  }, [bp]);

  const close = useCallback(() => { if (isOverlay) setSidebarOpen(false); }, [isOverlay]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">

      {/* Overlay backdrop — mobile/tablet only */}
      {isOverlay && sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "flex flex-col flex-shrink-0 bg-sidebar border-r border-border transition-all duration-200 z-30",
          isOverlay
            ? `fixed inset-y-0 left-0 ${sidebarOpen ? "translate-x-0 w-[179px]" : "-translate-x-full w-[179px]"}`
            : `relative ${sidebarOpen ? "w-[179px]" : "w-0 overflow-hidden border-r-0"}`,
        ].join(" ")}
      >
        {/* Header */}
        <div className="p-3 flex items-center gap-2 border-b border-border min-w-[179px]">
          <Logo3D />
          <span className="font-bold text-sm text-sidebar-foreground truncate flex-1">Ham Key Gen</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0"
            onClick={() => setSidebarOpen(false)}
            title="Tutup menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 min-w-[179px]">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={close}>
                <div
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-border min-w-[179px]">
          <div className="flex items-center justify-between gap-1">
            <div className="text-xs font-medium truncate text-sidebar-foreground">
              {user.displayName || user.username}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={() => logout.mutate(undefined, { onSuccess: () => setLocation("/login") })}
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-background shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? "Tutup menu" : "Buka menu"}
          >
            {sidebarOpen && !isOverlay ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <span className="text-sm font-medium text-muted-foreground hidden sm:block">
            {navItems.find((n) => location.startsWith(n.href))?.label ?? "Ham Key Gen"}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <div
              className="hidden sm:flex items-center gap-1.5 px-2 h-7 rounded-md border border-border bg-background"
              title={
                backendStatus === "online" ? "Backend reachable"
                : backendStatus === "offline" ? "Backend unreachable"
                : "Checking backend..."
              }
              data-testid="status-backend"
            >
              {backendStatus === "online" ? (
                <Wifi className="h-3.5 w-3.5 text-green-500" />
              ) : backendStatus === "offline" ? (
                <WifiOff className="h-3.5 w-3.5 text-destructive" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">
                {backendStatus === "online" ? "online" : backendStatus === "offline" ? "offline" : "..."}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={cycleTheme}
              title={`Theme: ${themeMode} (klik untuk ganti)`}
            >
              <ThemeIcon className="h-4 w-4" />
            </Button>
            <div
              className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold select-none"
              title={user.displayName || user.username}
              data-testid="avatar-user"
            >
              {initials(user.displayName || user.username)}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
