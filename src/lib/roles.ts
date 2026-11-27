import type { Role } from "./types";

/** Role-aware landing path for a signed-in user. */
export function roleHome(role: Role | null | undefined): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "driver":
      return "/driver";
    default:
      return "/tracker";
  }
}

export const ROLE_LABELS: Record<Role, string> = {
  student: "Student",
  driver: "Driver",
  admin: "Admin",
};

export const ROLE_BADGE: Record<Role, string> = {
  student: "bg-emerald-100 text-emerald-800",
  driver: "bg-amber-100 text-amber-800",
  admin: "bg-violet-100 text-violet-800",
};
