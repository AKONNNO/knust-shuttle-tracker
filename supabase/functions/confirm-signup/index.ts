// Auto-confirm a freshly registered account so users never have to click an
// email confirmation link. The caller must prove they know the account's
// password; only then do we mark the email as confirmed via the admin API.
// verify_jwt is false, so we authenticate by credential check ourselves.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/+esm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const email: string | undefined = body?.email;
    const password: string | undefined = body?.password;

    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return new Response(JSON.stringify({ error: "email and password are required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Verify credentials. A correct password surfaces either as a live session
    // (when confirmation is already off) or an "email not confirmed" error.
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    const code = signInErr?.code ?? "";
    const msg = (signInErr?.message ?? "").toLowerCase();
    const passwordOk =
      !signInErr || code === "email_not_confirmed" || msg.includes("email not confirmed");
    if (!passwordOk) {
      console.warn("[confirm-signup] rejected", { email, reason: signInErr?.message });
      return new Response(JSON.stringify({ error: "Invalid email or password" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Mark the email as confirmed so the account can be used immediately.
    const { data: user, error: lookupErr } = await supabase.auth.admin.getUserByEmail(email);
    if (lookupErr || !user?.user) {
      console.error("[confirm-signup] lookup failed", { email, error: lookupErr?.message });
      return new Response(JSON.stringify({ error: "Account not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(user.user.id, {
      email_confirm: true,
    });
    if (updateErr) {
      console.error("[confirm-signup] updateUserById failed", { error: updateErr.message });
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    console.log("[confirm-signup] confirmed", { id: user.user.id, email });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("[confirm-signup] unexpected", { error: String(err) });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
