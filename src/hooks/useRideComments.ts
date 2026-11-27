import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RideComment } from "@/lib/types";

const COMMENT_SELECT = "id, bus_id, user_id, author_name, body, created_at";

interface RideCommentsState {
  comments: RideComment[];
  loading: boolean;
  sending: boolean;
  addComment: (body: string, authorName: string | null) => Promise<boolean>;
  removeComment: (id: string) => Promise<void>;
}

/**
 * Live comment thread for a single ride (bus). Subscribes to realtime inserts
 * and deletes, so new remarks appear without a manual refresh.
 */
export function useRideComments(busId: string | null): RideCommentsState {
  const [comments, setComments] = useState<RideComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!busId) {
      setComments([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("ride_comments")
      .select(COMMENT_SELECT)
      .eq("bus_id", busId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setComments((data ?? []) as RideComment[]);
    setLoading(false);
  }, [busId]);

  useEffect(() => {
    load();
    if (!busId) return;

    const chan = supabase
      .channel(`ride-comments-${busId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ride_comments",
          filter: `bus_id=eq.${busId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as RideComment | null;
            if (!row) return;
            setComments((prev) =>
              [row, ...prev.filter((c) => c.id !== row.id)].slice(0, 50)
            );
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id?: string } | null;
            const id = old?.id;
            if (!id) return;
            setComments((prev) => prev.filter((c) => c.id !== id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chan);
    };
  }, [busId, load]);

  const addComment = useCallback(
    async (body: string, authorName: string | null): Promise<boolean> => {
      if (!busId || !body.trim()) return false;
      setSending(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSending(false);
        return false;
      }
      const { data, error } = await supabase
        .from("ride_comments")
        .insert({
          bus_id: busId,
          user_id: user.id,
          author_name: authorName,
          body: body.trim(),
        })
        .select(COMMENT_SELECT)
        .single();
      setSending(false);
      if (!error && data) {
        const row = data as RideComment;
        setComments((prev) =>
          [row, ...prev.filter((c) => c.id !== row.id)].slice(0, 50)
        );
      }
      return !error;
    },
    [busId]
  );

  const removeComment = useCallback(async (id: string) => {
    const { error } = await supabase.from("ride_comments").delete().eq("id", id);
    if (!error) setComments((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { comments, loading, sending, addComment, removeComment };
}
