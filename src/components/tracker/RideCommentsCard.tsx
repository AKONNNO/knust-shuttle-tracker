import { useState } from "react";
import { MessageSquare, Send, Trash2, LoaderCircle } from "lucide-react";
import { useRideComments } from "@/hooks/useRideComments";
import { useAuth } from "@/hooks/useAuth";
import type { LiveBusWithStops } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface RideCommentsCardProps {
  bus: LiveBusWithStops;
  onClose: () => void;
}

function initials(name: string | null | undefined): string {
  const s = (name || "Student").trim();
  const parts = s.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : s[0] ?? "S").toUpperCase();
}

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function RideCommentsCard({ bus, onClose }: RideCommentsCardProps) {
  const { session, profile } = useAuth();
  const { comments, loading, sending, addComment, removeComment } = useRideComments(bus.id);
  const [draft, setDraft] = useState("");

  const isAdmin = profile?.role === "admin";
  const meId = session?.user?.id ?? null;

  const submit = async () => {
    if (!draft.trim()) return;
    const ok = await addComment(draft, profile?.full_name ?? null);
    if (ok) setDraft("");
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          Ride remarks
        </p>
        <button
          onClick={onClose}
          className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Comment on {bus.name} — drivers and students can read these live.
      </p>

      {/* Thread */}
      <div className="mt-3 max-h-64 space-y-2.5 overflow-y-auto pr-1 scrollbar-none">
        {loading ? (
          <div className="grid place-items-center py-6 text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="rounded-xl bg-muted/50 px-3 py-4 text-center text-xs text-muted-foreground">
            No remarks yet — be the first to share a note about this ride.
          </p>
        ) : (
          comments.map((c) => {
            const own = c.user_id === meId;
            const canDelete = own || isAdmin;
            return (
              <div key={c.id} className="flex items-start gap-2.5">
                <Avatar className="h-8 w-8 shrink-0 border border-border/70">
                  <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-bold">
                    {initials(c.author_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 rounded-xl bg-background/60 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-bold truncate">
                      {c.author_name || "Student"}
                    </p>
                    <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                      {timeAgo(c.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm leading-snug text-foreground/90 break-words">
                    {c.body}
                  </p>
                  {canDelete && (
                    <button
                      onClick={() => removeComment(c.id)}
                      title={own ? "Remove your remark" : "Remove (admin)"}
                      className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="mt-3 flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="How's the ride? Traffic, delays, comfort…"
          rows={2}
          maxLength={280}
          className="min-h-0 resize-none rounded-xl bg-background/60 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <Button
          size="icon"
          onClick={submit}
          disabled={sending || !draft.trim()}
          className="h-10 w-10 shrink-0 rounded-xl"
          title="Post remark"
        >
          {sending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="mt-1.5 text-right text-[10px] text-muted-foreground">
        {draft.length}/280
      </p>
    </div>
  );
}
