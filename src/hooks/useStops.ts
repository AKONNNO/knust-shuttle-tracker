import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Stop } from "@/lib/types";

export function useStops() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const { data, error: err } = await supabase
      .from("stops")
      .select("id, name, lat, lng, created_by, created_at")
      .order("name");
    if (err) setError(err.message);
    else setStops((data ?? []) as Stop[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return { stops, loading, error, reload: load };
}
