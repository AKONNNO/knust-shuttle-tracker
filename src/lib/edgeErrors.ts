import { FunctionsHttpError } from "@supabase/supabase-js";

// Edge functions return useful error messages in their JSON body, but
// supabase.functions.invoke only surfaces a generic "non-2xx status code"
// message on its error. This reads the actual response body so the UI can
// show the real reason a request failed.
export async function edgeErrorMessage(
  error: unknown,
  fallback: string
): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) return String(body.error);
    } catch {
      // Body wasn't JSON or was empty - fall through to the generic message.
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
