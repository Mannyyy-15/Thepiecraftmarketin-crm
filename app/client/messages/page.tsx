"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Send, MessageSquare, Loader2, ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  sendMessage, getConversations, getConversationMessages, markConversationRead,
  getClientMessagingContacts,
} from "@/app/actions/crm";

interface Contact { id: number; name: string; email: string; role: string; }

export default function ClientMessagesPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [active, setActive] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [cr] = await Promise.all([getClientMessagingContacts()]);
      if (cr.success) {
        setContacts(cr.data as Contact[]);
        // Auto-open the first contact (usually the agency admin).
        if (cr.data.length > 0) setActive(cr.data[0] as Contact);
      }
      setLoading(false);
    })();
    loadConversations();
    const iv = setInterval(loadConversations, 6000);
    return () => clearInterval(iv);
  }, []);

  const loadConversations = async () => {
    const r = await getConversations();
    if (r.success) setConversations(r.data);
  };

  useEffect(() => {
    if (!active) return;
    markConversationRead(active.id).catch(() => {});
    const load = async () => {
      const r = await getConversationMessages(active.id);
      if (r.success && r.data) setMessages(r.data);
    };
    load();
    const iv = setInterval(load, 3500);
    return () => clearInterval(iv);
  }, [active]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const t = text.trim();
    if (!t || !active) return;
    setText("");
    setMessages((m) => [...m, { id: Date.now(), senderId: -1, receiverId: active.id, message: t, createdAt: new Date().toISOString() }]);
    try { await sendMessage(active.id, t); } catch {}
  };

  const unreadFor = (id: number) => {
    const conv = conversations.find((c) => (c.otherId ?? c.otherUser?.id) === id);
    return conv?.unread || 0;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-portal-500" /></div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Support" title="Messages" description="Chat directly with your ThePieCraft account team." />

      <div className="flex gap-4 h-[calc(100vh-15rem)] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 overflow-hidden">
        {/* Contacts */}
        <aside className={`w-full sm:w-64 shrink-0 border-r border-slate-100 dark:border-slate-800/80 overflow-y-auto ${active ? "hidden sm:block" : ""}`}>
          <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Team</p>
          </div>
          {contacts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No contacts available.</p>
          ) : contacts.map((c) => (
            <button key={c.id} onClick={() => setActive(c)}
              className={`w-full flex items-center gap-3 p-3 text-left transition-colors cursor-pointer ${active?.id === c.id ? "bg-portal-50 dark:bg-portal-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-900/40"}`}>
              <Avatar name={c.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                <p className="text-[10px] text-slate-400 truncate capitalize">{c.role === "admin" ? "Agency Admin" : c.role}</p>
              </div>
              {unreadFor(c.id) > 0 && <span className="h-2 w-2 rounded-full bg-portal-500 shrink-0" />}
            </button>
          ))}
        </aside>

        {/* Chat */}
        <div className={`flex-1 flex flex-col ${active ? "" : "hidden sm:flex"}`}>
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-sm text-slate-400">Select a contact to start chatting</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 border-b border-slate-100 dark:border-slate-800/80">
                <button onClick={() => setActive(null)} className="sm:hidden h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><ArrowLeft className="h-4 w-4" /></button>
                <Avatar name={active.name} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{active.name}</p>
                  <p className="text-[10px] text-slate-400">{active.role === "admin" ? "Agency Admin" : active.role}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No messages yet — say hello 👋</p>
                ) : messages.map((m) => {
                  const mine = m.senderId === -1 || (active && m.senderId !== active.id);
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-portal-600 text-white" : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200"}`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 flex items-end gap-2">
                <textarea value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  rows={1} placeholder="Type a message…"
                  className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-portal-500/40 text-slate-800 dark:text-white max-h-32" />
                <button onClick={send} disabled={!text.trim()}
                  className="h-10 w-10 rounded-xl bg-portal-600 text-white flex items-center justify-center shrink-0 hover:bg-portal-700 disabled:opacity-40 cursor-pointer">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
