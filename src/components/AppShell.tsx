import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bus, LayoutDashboard, LogOut, Radio, UserRound, Warehouse } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_BADGE, ROLE_LABELS } from "@/lib/roles";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/tracker", label: "Live Tracker", icon: Radio, roles: ["student", "driver", "admin"] },
  { to: "/driver", label: "Driver Console", icon: Warehouse, roles: ["driver", "admin"] },
  { to: "/admin", label: "Admin", icon: LayoutDashboard, roles: ["admin"] },
];

export function AppShell() {
  const { session, profile, role, loading } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabaseCleanup();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="mx-auto w-full max-w-6xl px-3 sm:px-5 h-16 flex items-center gap-2">
          <NavLink to="/" className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 shrink-0 grid place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Bus className="h-5 w-5" />
            </span>
            <span className="leading-tight min-w-0">
              <span className="block font-extrabold tracking-tight text-[15px] sm:text-base truncate">
                KNUST&nbsp;Shuttle
              </span>
              <span className="block text-[10px] sm:text-xs font-semibold text-secondary-foreground/70 uppercase tracking-widest hidden sm:block">
                Campus Transit Live
              </span>
            </span>
          </NavLink>

          <nav className="ml-2 sm:ml-6 flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-none">
            {NAV.filter((item) => item.roles.includes(role ?? "student")).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                  ].join(" ")
                }
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {!loading && session && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full p-0.5 pr-1.5 sm:pr-2 hover:bg-muted transition-colors outline-none">
                    <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {(profile?.full_name || "U")
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:block text-left leading-tight">
                      <span className="block text-[13px] font-bold max-w-[140px] truncate">
                        {profile?.full_name || "Student"}
                      </span>
                      <span
                        className={`block text-[10px] font-semibold uppercase tracking-wider ${ROLE_BADGE[role ?? "student"]}`}
                      >
                        {ROLE_LABELS[role ?? "student"]}
                      </span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                    {profile?.full_name || "Signed in"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {role && (
                    <>
                      {NAV.filter((i) => i.roles.includes(role)).map((item) => (
                        <DropdownMenuItem key={item.to} onSelect={() => navigate(item.to)}>
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={signOut}>
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-5 py-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}

async function supabaseCleanup() {
  const { supabase } = await import("@/integrations/supabase/client");
  await supabase.auth.signOut();
}
