import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { SiteMode } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { adminLogin, adminLogout, getAdminSession, getSiteMode, setSiteMode } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

const ADMIN_KEY = ["/api/site/admin/session"];
const MODE_KEY = ["/api/site/mode"];

export default function AdminPage() {
  const session = useQuery({ queryKey: ADMIN_KEY, queryFn: getAdminSession });

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {session.isLoading ? null : session.data?.isAdmin ? <AdminPanel /> : <AdminLogin />}
      </div>
    </div>
  );
}

function AdminLogin() {
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: adminLogin,
    onSuccess: (data) => queryClient.setQueryData(ADMIN_KEY, data),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (password) login.mutate(password);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">admin</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </div>
          <Button type="submit" className="w-full" disabled={!password || login.isPending}>
            {login.isPending ? "checking..." : "sign in"}
          </Button>
          {login.error && <p className="text-center text-sm text-red-500">{login.error.message}</p>}
        </form>
      </CardContent>
    </Card>
  );
}

function AdminPanel() {
  const { toast } = useToast();
  const { data } = useQuery({ queryKey: MODE_KEY, queryFn: getSiteMode });
  const mode = data?.mode ?? "app";

  const update = useMutation({
    mutationFn: setSiteMode,
    onSuccess: (result) => {
      queryClient.setQueryData(MODE_KEY, result);
      toast({ title: "site mode updated", description: `now showing: ${label(result.mode)}` });
    },
    onError: (error) => toast({ title: "couldn't update mode", description: error.message, variant: "destructive" }),
  });

  const logout = useMutation({
    mutationFn: adminLogout,
    onSuccess: (result) => queryClient.setQueryData(ADMIN_KEY, result),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">stylematch admin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-center">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">visitors currently see</p>
          <span className="inline-block rounded-full bg-white/10 px-4 py-2 text-sm font-medium">{label(mode)}</span>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          {(["app", "coming-soon"] as SiteMode[]).map((option) => (
            <Button
              key={option}
              variant={mode === option ? "default" : "outline"}
              disabled={update.isPending || mode === option}
              onClick={() => update.mutate(option)}
            >
              show {label(option)}
            </Button>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          coming-soon mode replaces every page with a waitlist signup. the setting is saved in the database, so it
          survives restarts.
        </p>

        <div className="flex justify-center gap-3 border-t pt-6">
          <Button variant="ghost" size="sm" asChild>
            <a href="/" target="_blank" rel="noreferrer">
              view site
            </a>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => logout.mutate()}>
            sign out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function label(mode: SiteMode) {
  return mode === "app" ? "full app" : "coming soon page";
}
