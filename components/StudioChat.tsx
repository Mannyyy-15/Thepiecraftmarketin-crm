"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles, Send, Plus, Trash2, MessageSquare, Loader2, Bot, User as UserIcon,
  PanelLeft, X,
} from "lucide-react";
import {
  sendChatMessage, listAiChats, getAiChat, deleteAiChat,
} from "@/app/actions/aiChat";

interface Msg { role: "user" | "model"; content: string; }
interface ChatRow { id: number; title: string; updatedAt: string | Date; }

// Lightweight markdown → HTML for chat replies (bold, headings, lists, code).
function renderMarkdown(src: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = src.split("\n");
  let html = "";
  let inList = false;
  const inline = (t: string) =>
    esc(t)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/60 text-[0.85em]">$1</code>');
  for (let raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*]\s+(.*)/);
    const heading = line.match(/^(#{1,3})\s+(.*)/);
    if (bullet) {
      if (!inList) { html += '<ul class="list-disc pl-5 space-y-0.5 my-1.5">'; inList = true; }
      html += `<li>${inline(bullet[1])}</li>`;
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      if (heading) {
        const lvl = heading[1].length;
        const cls = lvl === 1 ? "text-sm font-extrabold mt-2 mb-1" : "text-[13px] font-bold mt-2 mb-1";
        html += `<p class="${cls}">${inline(heading[2])}</p>`;
      } else if (line === "") {
        html += '<div class="h-2"></div>';
      } else {
        html += `<p class="leading-relaxed">${inline(line)}</p>`;
      }
    }
  }
  if (inList) html += "</ul>";
  return html;
}

const SUGGESTIONS = [
  "Write 3 Meta ad copy variations for a new restaurant launch.",
  "Plan a 7-page website structure for a dental clinic.",
  "Draft a polite follow-up email for an overdue invoice.",
  "Suggest a ₹30,000/month ad budget split for an e-commerce client.",
];

export default function StudioChat() {
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const refreshChats = useCallback(async () => {
    const res = await listAiChats();
    if (res.success) setChats(res.data as ChatRow[]);
  }, []);

  useEffect(() => { refreshChats(); }, [refreshChats]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, sending]);

  const openChat = async (id: number) => {
    setActiveId(id);
    setSidebarOpen(false);
    const res = await getAiChat(id);
    if (res.success) setMessages(res.data as Msg[]);
  };

  const newChat = () => { setActiveId(null); setMessages([]); setInput(""); setSidebarOpen(false); };

  const removeChat = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteAiChat(id);
    if (activeId === id) newChat();
    refreshChats();
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setSending(true);
    try {
      const res = await sendChatMessage(msg, activeId ?? undefined);
      if (res.success && res.reply) {
        setMessages((m) => [...m, { role: "model", content: res.reply! }]);
        if (res.chatId && res.chatId !== activeId) { setActiveId(res.chatId); }
        refreshChats();
      } else {
        setMessages((m) => [...m, { role: "model", content: res.error || "Sorry, something went wrong." }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "model", content: "Sorry, something went wrong." }]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };
  const autoGrow = () => {
    const ta = taRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 160) + "px"; }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-9rem)]">
      {/* ── History sidebar (desktop) ── */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 overflow-hidden">
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
          <button onClick={newChat} className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-colors cursor-pointer">
            <Plus className="h-4 w-4" /> New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chats.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-6">No conversations yet</p>
          ) : chats.map((c) => (
            <button key={c.id} onClick={() => openChat(c.id)}
              className={`group w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${activeId === c.id ? "bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300" : "hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-600 dark:text-slate-300"}`}>
              <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
              <span className="flex-1 text-xs font-medium truncate">{c.title}</span>
              <span onClick={(e) => removeChat(c.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all p-0.5">
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Chat panel ── */}
      <div className="flex-1 flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 dark:border-slate-800/80">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <PanelLeft className="h-4 w-4" />
          </button>
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Studio AI</p>
            <p className="text-[10px] text-slate-400">Your ThePieCraft agency assistant</p>
          </div>
          <button onClick={newChat} className="lg:hidden ml-auto h-8 px-2.5 rounded-lg text-xs font-bold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 cursor-pointer flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center mb-4">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">How can I help today?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Ask about ads, web, SEO, client emails, proposals, pricing — anything agency.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5 w-full max-w-xl">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    className="text-left text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 hover:border-brand-300 hover:text-brand-600 transition-all cursor-pointer">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-slate-200 dark:bg-slate-800" : "bg-gradient-to-br from-brand-500 to-indigo-600"}`}>
                  {m.role === "user" ? <UserIcon className="h-4 w-4 text-slate-500 dark:text-slate-300" /> : <Bot className="h-4 w-4 text-white" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === "user" ? "bg-brand-600 text-white" : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-800"}`}>
                  {m.role === "user"
                    ? <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    : <div className="space-y-0.5 [&_p]:text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="rounded-2xl px-3.5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500/40">
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoGrow(); }}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Ask Studio AI anything…"
              className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-800 dark:text-white placeholder:text-slate-400 max-h-40 leading-relaxed"
            />
            <button onClick={() => send()} disabled={!input.trim() || sending}
              className="h-9 w-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile sidebar drawer */}
        {sidebarOpen && (
          <div className="lg:hidden absolute inset-0 z-20 flex">
            <div className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                <button onClick={newChat} className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl bg-brand-600 text-white text-sm font-bold cursor-pointer"><Plus className="h-4 w-4" /> New</button>
                <button onClick={() => setSidebarOpen(false)} className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {chats.map((c) => (
                  <button key={c.id} onClick={() => openChat(c.id)}
                    className={`group w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left cursor-pointer ${activeId === c.id ? "bg-brand-50 dark:bg-brand-950/30 text-brand-700" : "hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-600 dark:text-slate-300"}`}>
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    <span className="flex-1 text-xs font-medium truncate">{c.title}</span>
                    <span onClick={(e) => removeChat(c.id, e)} className="text-slate-300 hover:text-rose-500 p-0.5"><Trash2 className="h-3.5 w-3.5" /></span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 bg-slate-950/40" onClick={() => setSidebarOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
