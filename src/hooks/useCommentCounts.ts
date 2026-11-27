import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CountRow {
  bus_id: string;
  total: number;
}

/**
 * Live remark counts per bus, keyed by bus id. Refreshes on any
 * ride_comments insert/delete (realtime) plus a slow poll as a safety net.
 */
export function useCommentCounts(busIds: string[]): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const idsRef = useRef<string[]>(busIds);
  const idsKey = busIds.join(",");

  const fetchCounts = useCallback(async () => {
    const ids = idsRef.current;
    if (!ids.length) {
      setCounts({});
      return;
    }
    const { data } = await supabase.rpc("comment_counts", { target_bus_ids: ids });
    const next: Record<string, number> = {};
    for (const row of (data ?? []) as CountRow[]) {
      next[row.bus_id] = Number(row.total) || 0;
    }
    setCounts(next);
  }, []);

  useEffect(() => {
    idsRef.current = busIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  useEffect(() => {
    if (!idsKey) return;
    fetchCounts();
    const chan = supabase
      .channel("ride-comment-counts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ride_comments" },
        () => fetchCounts()
      )
      .subscribe();
    const timer = window.setInterval(fetchCounts, 15_000);
    return () => {
      supabase.removeChannel(chan);
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, fetchCounts]);

  return counts;
}
