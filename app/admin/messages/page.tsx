"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Send, Search, Plus, ArrowLeft, MessageSquare, X, Building2, Users, Shield, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { sendMessage, getConversations, getConversationMessages, markConversationRead, getMessagingContacts } from "@/app/actions/crm";

interface Contact {
  id: number;
  name: string;
  email: string;
  role: "admin" | "employee" | "client";
  systemRole?: string | null;
  jobTitle?: string;
  clientName?: string;
  industry?: string;
  status?: string;
  assignedTo?: string;
}

const STORAGE_KEY = "admin_chat_ids";

function loadChatIds(): number[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveChatIds(ids: number[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch {} }

const sectionIcons = { admins: Shield, employees: Users, clients: Building2 } as const;
type SectionKey = keyof typeof sectionIcons;

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [search, setSearch] = useState("");
  const [chatIds, setChatIds] = useState<number[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({ admins: true, employees: true, clients: true });
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChatIds(loadChatIds());
    getMessagingContacts().then((res) => {
      if (res.success && res.data) setAllContacts(res.data as Contact[]);
    });
  }, []);

  const contacts = useMemo(() => ({
    admins: allContacts.filter((c) => c.role === "admin"),
    employees: allContacts.filter((c) => c.role === "employee"),
    clients: allContacts.filter((c) => c.role === "client"),
  }), [allContacts]);

  const allMap = useMemo(() => {
    const m = new Map<number, Contact>();
    for (const c of allContacts) m.set(c.id, c);
    return m;
  }, [allContacts]);

  const chatContacts = useMemo(() => {
    const ordered: number[] = [];
    const seen = new Set<number>();
    for (const conv of conversations) {
      const id = conv.otherId ?? conv.otherUser?.id;
      if (id && !seen.has(id)) { seen.add(id); ordered.push(id); }
    }
    for (const id of chatIds) {
      if (!seen.has(id)) { seen.add(id); ordered.push(id); }
    }
    return ordered
      .map((id) => allMap.get(id) || (() => {
        const conv = conversations.find((c) => (c.otherId ?? c.otherUser?.id) === id);
        return conv?.otherUser
          ? { id, name: conv.otherUser.name, email: conv.otherUser.email, role: conv.otherUser.role } as Contact
          : null;
      })())
      .filter(Boolean) as Contact[];
  }, [conversations, chatIds, allMap]);

  const filteredList = useMemo(() => {
    if (!search) return chatContacts;
    const q = search.toLowerCase();
    return chatContacts.filter((c) =>
      (c.clientName || c.name).toLowerCase().includes(q),
    );
  }, [chatContacts, search]);

  // Filter for contact picker
  const pickerFiltered = useMemo(() => {
    if (!pickerSearch) {
      return {
        admins: contacts.admins,
        employees: contacts.employees,
        clients: contacts.clients,
      };
    }
    const q = pickerSearch.toLowerCase();
    return {
      admins: contacts.admins.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)),
      employees: contacts.employees.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)),
      clients: contacts.clients.filter((c) => c.clientName?.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q)),
    };
  }, [contacts, pickerSearch]);

  const loadConversations = async () => {
    const res = await getConversations();
    if (res.success) setConversations(res.data);
  };

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeContact) {
      markConversationRead(activeContact.id).catch(() => {});
      const load = async () => {
        try {
          const res = await getConversationMessages(activeContact.id);
          if (res.success && res.data.length > 0) setMessages(res.data);
        } catch {}
      };
      load();
      const interval = setInterval(load, 3000);
      return () => clearInterval(interval);
    }
  }, [activeContact]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const addChatContact = (contact: Contact) => {
    if (!chatIds.includes(contact.id)) {
      const updated = [contact.id, ...chatIds];
      setChatIds(updated);
      saveChatIds(updated);
    }
    setActiveContact(contact);
    setShowContactPicker(false);
    setPickerSearch("");
  };

  const handleSend = async () => {
    if (!newMsg.trim() || !activeContact) return;
    const text = newMsg.trim();
    const optimisticMsg = { id: Date.now(), senderId: -1, receiverId: activeContact.id, message: text, read: 0, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMsg("");
    if (!chatIds.includes(activeContact.id)) {
      const updated = [activeContact.id, ...chatIds];
      setChatIds(updated);
      saveChatIds(updated);
    }
    try { await sendMessage(activeContact.id, text); } catch {}
  };

  const statusDot = (s?: string) => {
    const colors: Record<string, string> = { online: "bg-emerald-500", away: "bg-amber-400", offline: "bg-slate-400" };
    return <span className={`h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-950 ${colors[s as string] || "bg-emerald-500"}`} />;
  };

  // Conversation list component
  const conversationList = (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
        <button
          onClick={() => { setShowContactPicker(true); setPickerSearch(""); }}
          className="h-10 w-10 rounded-xl bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition-colors shrink-0 cursor-pointer"
          title="New conversation"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {filteredList.length === 0 && !search && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-xs text-slate-400">No conversations yet</p>
            <p className="text-[10px] text-slate-400 mt-1">Tap <strong>+</strong> to start a new chat</p>
          </div>
        )}
        {filteredList.length === 0 && search && (
          <p className="text-xs text-slate-400 text-center py-8">No matches</p>
        )}
        {filteredList.map((contact) => (
          <div
            key={contact.id}
            onClick={() => setActiveContact(contact)}
            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50 active:scale-[0.98]"
          >
            <div className="relative shrink-0">
              <Avatar name={contact.clientName || contact.name} size="sm" />
              <span className={`absolute -bottom-0.5 -right-0.5 ${statusDot(contact.status)}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{contact.clientName || contact.name}</p>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {contact.role === "client" ? `${contact.industry} · ${contact.assignedTo}` : (contact.jobTitle || contact.role)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Desktop sidebar with all contacts */}
      <Card className="w-80 shrink-0 hidden lg:flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">All Contacts</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {(Object.entries(contacts) as [SectionKey, Contact[]][]).map(([key, items]) => {
            if (items.length === 0) return null;
            const Icon = sectionIcons[key];
            const labels: Record<SectionKey, string> = { admins: "Admin", employees: "Team", clients: "Clients" };
            return (
              <div key={key}>
                <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  <Icon className="h-3 w-3" />
                  {labels[key]}
                  <span className="ml-auto text-[9px] font-bold text-slate-400">{items.length}</span>
                </div>
                {items.map((contact) => (
                  <div key={contact.id} onClick={() => addChatContact(contact)} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors active:scale-[0.98]">
                    <div className="relative shrink-0">
                      <Avatar name={contact.clientName || contact.name} size="sm" />
                      <span className={`absolute -bottom-0.5 -right-0.5 ${statusDot(contact.status)}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{contact.clientName || contact.name}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {contact.role === "client" ? `${contact.industry} · ${contact.assignedTo}` : (contact.jobTitle || contact.email)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Chat area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {activeContact ? (
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
              <button onClick={() => setActiveContact(null)} className="lg:hidden p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="relative">
                <Avatar name={activeContact.clientName || activeContact.name} size="sm" />
                <span className={`absolute -bottom-0.5 -right-0.5 ${statusDot(activeContact.status)}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{activeContact.clientName || activeContact.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{activeContact.role === "client" ? `${activeContact.industry} · ${activeContact.email}` : activeContact.email}</p>
              </div>
            </div>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && <p className="text-xs text-slate-400 text-center pt-8">No messages yet. Say hello!</p>}
              {messages.map((m: any) => {
                const isMine = m.senderId === activeContact.id;
                return (
                  <div key={m.id} className={`flex ${isMine ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isMine ? "bg-slate-100 dark:bg-slate-800 rounded-bl-sm" : "bg-brand-500 text-white rounded-br-sm"}`}>
                      <p className="text-sm leading-relaxed">{m.message}</p>
                      <p className={`text-[10px] mt-1 ${isMine ? "text-slate-400" : "text-white/70"}`}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </CardContent>
            <div className="border-t border-slate-100 dark:border-slate-800/80 p-4 shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                <input type="text" value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Type a message..." className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
                <button type="submit" className="h-11 w-11 rounded-xl bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition-colors cursor-pointer disabled:opacity-50" disabled={!newMsg.trim()}>
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <div className="lg:hidden flex-1 flex flex-col overflow-hidden">
              {conversationList}
            </div>
            <div className="hidden lg:flex flex-1 flex-col items-center justify-center text-center p-8">
              <MessageSquare className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Select a contact to start chatting</h3>
              <p className="text-sm text-slate-400 mt-2">Choose a person from the left sidebar</p>
            </div>
          </>
        )}
      </Card>

      {/* Contact picker (drawer/modal) */}
      {showContactPicker && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowContactPicker(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-950 rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">New Conversation</h3>
              <button onClick={() => setShowContactPicker(false)} className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input type="text" value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} placeholder="Search contacts..." className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pl-9 pr-4 text-xs focus:outline-none" />
            </div>

            {([["admins", "Admin", pickerFiltered.admins], ["employees", "Team", pickerFiltered.employees], ["clients", "Clients", pickerFiltered.clients]] as const).map(([key, label, items]) => {
              if (items.length === 0) return null;
              const Icon = sectionIcons[key as SectionKey];
              const isExpanded = expandedSections[key as SectionKey];
              return (
                <div key={key} className="mb-2">
                  <button onClick={() => setExpandedSections((p) => ({ ...p, [key]: !p[key as SectionKey] }))} className="flex items-center gap-2 w-full px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer">
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <Icon className="h-3 w-3" />
                    {label}
                    <span className="ml-auto text-[9px] font-bold text-slate-400">{items.length}</span>
                  </button>
                  {isExpanded && (
                    <div className="space-y-0.5">
                      {items.map((contact) => (
                        <div key={contact.id} onClick={() => addChatContact(contact)} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors active:scale-[0.98]">
                          <Avatar name={contact.clientName || contact.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{contact.clientName || contact.name}</p>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {contact.role === "client" ? `${contact.industry} · ${contact.assignedTo}` : (contact.jobTitle || contact.email)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
