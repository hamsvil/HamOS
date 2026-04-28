import { AppLayout } from "@/components/layout/app-layout";
import { useListNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Loader2, AlertCircle, Key, Clock } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const typeIcon: Record<string, React.ReactNode> = {
  validation_failed: <AlertCircle className="h-4 w-4 text-destructive" />,
  key_expiring: <Clock className="h-4 w-4 text-yellow-500" />,
  key_revoked: <Key className="h-4 w-4 text-orange-500" />,
};

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data: notifications, isLoading } = useListNotifications(
    {},
    { query: { enabled: true, refetchInterval: 60_000, refetchOnWindowFocus: true } },
  );
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();

  const unread = notifications?.filter(n => !n.isRead).length ?? 0;

  const handleMarkAll = () => {
    markAll.mutate(undefined, {
      onSuccess: () => {
        toast.success("Semua notifikasi ditandai sudah dibaca");
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    });
  };

  const handleMarkOne = (id: number) => {
    markOne.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
    });
  };

  return (
    <AppLayout>
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" /> Notifikasi
              {unread > 0 && <Badge className="bg-primary/20 text-primary border-primary/30">{unread} baru</Badge>}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Alert validasi, expiry, dan aktivitas key</p>
          </div>
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAll} disabled={markAll.isPending} className="gap-1.5">
              <CheckCheck className="h-4 w-4" /> Tandai Semua Dibaca
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !notifications?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground">Tidak ada notifikasi.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <Card
                key={n.id}
                className={`transition-colors ${!n.isRead ? "border-primary/30 bg-primary/5" : ""}`}
              >
                <CardContent className="py-3 px-4 flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {typeIcon[n.type] ?? <Bell className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{n.title}</p>
                      {!n.isRead && <Badge className="text-xs bg-primary/20 text-primary border-primary/30">Baru</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                  {!n.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() => handleMarkOne(n.id)}
                    >
                      Tandai dibaca
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
