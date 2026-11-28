import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bus,
  LoaderCircle,
  Search,
  ShieldCheck,
  UserRound,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { edgeErrorMessage } from "@/lib/edgeErrors";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_BADGE, ROLE_LABELS } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role } from "@/lib/types";

interface ManagedUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string | null;
}

export function DriversTab() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("list-users", {});
    if (error) {
      toast.error(await edgeErrorMessage(error, "Could not load users."));
    } else {
      setUsers((data?.users ?? []) as ManagedUser[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q) ||
        u.role.includes(q)
    );
  }, [users, query]);

  const createDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = fullName.trim();
    const mail = email.trim();
    if (!name || !mail || !password) {
      return toast.error("Name, email and password are required.");
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
      return toast.error("Please enter a valid email address.");
    }
    if (password.length < 6) {
      return toast.error("Temporary password must be at least 6 characters.");
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("create-driver", {
      body: { full_name: name, email: mail, password },
    });
    setCreating(false);
    if (error) {
      toast.error(await edgeErrorMessage(error, "Could not create the driver."));
      return;
    }
    toast.success(`${data?.email ?? "New driver"} added with the Driver role.`);
    setFullName("");
    setEmail("");
    setPassword("");
    await load();
  };

  const setRole = async (user: ManagedUser, role: Role) => {
    if (role === user.role) return;
    const { error } = await supabase.functions.invoke("set-role", {
      body: { user_id: user.id, role },
    });
    if (error)
      return toast.error(await edgeErrorMessage(error, "Could not update role."));
    toast.success(`Set ${user.full_name || user.email} to ${ROLE_LABELS[role]}.`);
    await load();
  };

  const resetPassword = async (user: ManagedUser) => {
    const resetUrl = new URL("/reset-password", window.location.origin).href;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: resetUrl,
    });
    if (error) return toast.error(error.message ?? "Could not send reset email.");
    toast.success(`Password reset email sent to ${user.email}.`);
  };

  const isSelf = (id: string) => profile?.id === id;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">People</h1>
          <p className="text-sm text-muted-foreground">Create driver accounts and manage roles.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />
          Refresh
        </Button>
      </div>

      {/* Create driver */}
      <form
        onSubmit={createDriver}
        className="rounded-2xl border border-primary/25 bg-card p-4 shadow-sm sm:p-5"
      >
        <p className="inline-flex items-center gap-1.5 text-sm font-extrabold text-primary">
          <Bus className="h-4 w-4" />
          Add a driver
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Creates a confirmed account and sets the Driver role. They'll get their own password to sign in.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <div className="space-y-1">
            <Label htmlFor="dv-name" className="text-xs">Full name</Label>
            <Input id="dv-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Kwame Mensah" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dv-email" className="text-xs">Email</Label>
            <Input id="dv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="driver@knust.edu.gh" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dv-pw" className="text-xs">Temporary password</Label>
            <Input id="dv-pw" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min 6 characters" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={creating} className="w-full sm:w-auto">
              {creating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bus className="h-4 w-4" />}
              {creating ? "Creating…" : "Create driver"}
            </Button>
          </div>
        </div>
      </form>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people…" className="pl-9" />
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <LoaderCircle className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
          <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <UserRound className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold">No people found</p>
          <p className="text-xs text-muted-foreground mt-0.5">Try a different search.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <div className="divide-y divide-border/60">
            {filtered.map((u) => (
              <div key={u.id} className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:gap-3">
                <span
                  className={"grid h-10 w-10 shrink-0 place-items-center rounded-xl " + (u.role === "driver" ? "bg-amber-100 text-amber-700" : u.role === "admin" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700")}
                >
                  {u.role === "driver" ? <Bus className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold">{u.full_name || "Unnamed"}</p>
                    {isSelf(u.id) && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">You</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => resetPassword(u)}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Reset password
                  </Button>
                  <Select value={u.role} disabled={isSelf(u.id)} onValueChange={(v) => setRole(u, v as Role)}>
                    <SelectTrigger className="w-32 h-9 text-xs">
                      <span className={"mr-1 h-1.5 w-1.5 shrink-0 rounded-full bg-current " + (ROLE_BADGE[u.role as Role]?.includes("amber") ? "text-amber-600" : ROLE_BADGE[u.role as Role]?.includes("violet") ? "text-violet-600" : "text-emerald-600")} />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="driver">Driver</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        Role changes run through a server-side admin check. You can't change your own role here.
      </p>
    </div>
  );
}
