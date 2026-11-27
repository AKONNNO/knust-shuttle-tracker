// Admin-only: list every auth user joined with their profile role + name.
// Emails live in auth.users (not exposed via the Data API), so we list them
// with the service role and only after verifying the caller is an admin.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/+esm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      console.error("[list-users] invalid token", { error: userErr?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const { data: authData, error: listErr } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listErr) {
      console.error("[list-users] listUsers failed", { error: listErr.message });
      return new Response(JSON.stringify({ error: listErr.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, role, created_at");
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    const users = (authData.users ?? []).map((u) => {
      const prof = byId.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        full_name: prof?.full_name ?? u.user_metadata?.full_name ?? null,
        role: prof?.role ?? "student",
        created_at: u.created_at ?? prof?.created_at ?? null,
      };
    });

    console.log("[list-users] returned", { count: users.length });
    return new Response(JSON.stringify({ users }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("[list-users] unexpected", { error: String(err) });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
