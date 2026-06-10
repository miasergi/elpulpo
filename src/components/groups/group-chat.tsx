"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author?: { display_name: string; avatar_url: string | null } | null;
}

export function GroupChat({
  groupId,
  currentUserId,
}: {
  groupId: string;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient()).current;
  const authors = useRef(new Map<string, { display_name: string; avatar_url: string | null }>());

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabase
        .from("messages")
        .select("id,user_id,body,created_at, author:profiles(display_name,avatar_url)")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (!active || !data) return;
      for (const m of data) {
        const a = Array.isArray(m.author) ? m.author[0] : m.author;
        if (a) authors.current.set(m.user_id, a);
      }
      setMessages(data.map((m) => ({ ...m, author: authors.current.get(m.user_id) })) as ChatMessage[]);
    }
    load();

    const channel = supabase
      .channel(`chat:${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${groupId}` },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev
              : [...prev, { ...m, author: authors.current.get(m.user_id) }]
          );
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [groupId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    const { error } = await supabase.from("messages").insert({
      group_id: groupId,
      user_id: currentUserId,
      body,
    });
    setSending(false);
    if (error) setText(body);
  }

  return (
    <div className="flex h-[calc(100dvh-13rem)] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Sé el primero en escribir. ¡Pica a tus amigos!
          </p>
        )}
        {messages.map((m) => {
          const mine = m.user_id === currentUserId;
          return (
            <div key={m.id} className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
              {!mine && <Avatar src={m.author?.avatar_url} name={m.author?.display_name} size={28} />}
              <div className={cn("max-w-[75%]", mine && "items-end")}>
                {!mine && (
                  <p className="mb-0.5 ml-1 text-[11px] text-muted-foreground">
                    {m.author?.display_name ?? "Jugador"}
                  </p>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2 text-sm",
                    mine
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-surface-3"
                  )}
                >
                  {m.body}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex items-center gap-2 border-t border-border pt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un mensaje…"
          maxLength={2000}
          className="h-11 flex-1 rounded-full border border-border bg-surface-2 px-4 text-sm focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          aria-label="Enviar"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
