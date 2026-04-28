import { useLogin, useGetMe } from "@workspace/api-client-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Logo3D } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: isUserLoading } = useGetMe({ query: { retry: false } });
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const login = useLogin();

  if (isUserLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (user) {
    setLocation("/dashboard");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { data: { username, password } },
      {
        onSuccess: () => {
          toast.success("Logged in successfully");
          setLocation("/dashboard");
        },
        onError: () => {
          toast.error("Invalid credentials");
        }
      }
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>

      <Card className="w-full max-w-md relative z-10 border-border/50 shadow-2xl">
        <CardHeader className="space-y-3 text-center flex flex-col items-center">
          <Logo3D className="w-16 h-16 mb-2" />
          <CardTitle className="text-3xl font-bold tracking-tight">Ham Key Gen</CardTitle>
          <CardDescription className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
            Enterprise Key Infrastructure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                autoFocus
                className="font-mono bg-background/50 backdrop-blur-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="font-mono bg-background/50 backdrop-blur-sm"
              />
            </div>
            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={login.isPending}
            >
              {login.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Authenticate
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border/50 p-4">
          <p className="text-xs text-muted-foreground">Secure System Access</p>
        </CardFooter>
      </Card>
    </div>
  );
}
