// Admin-only: update a user's role (student / driver / admin) in profiles.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

const ROLES = ["student", "driver", "admin"];

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
      console.error("[set-role] invalid token", { error: userErr?.message });
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

    const body = await req.json();
    const user_id: string | undefined = body?.user_id;
    const role: string | undefined = body?.role;

    if (!user_id || !role || !ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: "user_id and a valid role are required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    if (user.id === user_id) {
      return new Response(JSON.stringify({ error: "You cannot change your own role" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", user_id);

    if (updateErr) {
      console.error("[set-role] update failed", { error: updateErr.message });
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    console.log("[set-role] updated", { user_id, role });
    return new Response(JSON.stringify({ ok: true, user_id, role }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("[set-role] unexpected", { error: String(err) });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
