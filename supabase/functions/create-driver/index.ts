// Admin-only: create a driver user account (email confirmed) and set role='driver'.
// verify_jwt is false, so we verify the caller's JWT + admin role ourselves.
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
      console.error("[create-driver] invalid token", { error: userErr?.message });
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
    const email: string | undefined = body?.email;
    const password: string | undefined = body?.password;
    const full_name: string | undefined = body?.full_name;

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "A valid email is required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    if (!password || String(password).length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name ?? null },
    });
    if (createErr) {
      console.error("[create-driver] createUser failed", { error: createErr.message });
      return new Response(JSON.stringify({ error: createErr.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // The handle_new_user trigger creates the profile as 'student'; promote to driver.
    const { error: roleErr } = await supabase
      .from("profiles")
      .update({ role: "driver", full_name: full_name ?? null })
      .eq("id", created.user.id);
    if (roleErr) {
      console.error("[create-driver] role update failed", { error: roleErr.message });
    }

    console.log("[create-driver] created", { id: created.user.id, email });
    return new Response(
      JSON.stringify({ ok: true, id: created.user.id, email: created.user.email }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("[create-driver] unexpected", { error: String(err) });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
