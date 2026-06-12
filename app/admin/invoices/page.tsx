"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "@/providers/ToastProvider";
import {
  Plus, Trash2, Download, Save, FileText, Loader2, Mail,
  MessageCircle, Check, IndianRupee, Megaphone, Code2, Search as SearchIcon,
  Palette, Globe2, Wrench, StickyNote, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getClients, createInvoiceFull, getInvoices, updateInvoiceStatus, deleteInvoice } from "@/app/actions/crm";
import logoImg from "@/assets/invoice-logo.png";

const COMPANY = {
  name: "ThePieCraft Marketing",
  email: "info@thepiecraftmarketing.com",
  tagline: "Performance Marketing & Web Development",
};

// Quick-add service presets (one tap to add a line for that service).
const SERVICE_PRESETS = [
  { label: "Web Development", icon: Code2,     details: "" },
  { label: "Meta Ads Management", icon: Megaphone, details: "Facebook & Instagram ad campaigns" },
  { label: "SEO", icon: SearchIcon, details: "On-page & technical SEO" },
  { label: "Branding & Design", icon: Palette, details: "" },
  { label: "Hosting & Maintenance", icon: Wrench, details: "Annual hosting + upkeep" },
  { label: "Social Media", icon: Globe2, details: "Content & management" },
];

interface Item { service: string; details: string; units: string; amount: number; note: string; }
const blankItem = (): Item => ({ service: "", details: "", units: "", amount: 0, note: "" });
const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

const INPUT = "h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white placeholder:text-slate-400";
const LABEL = "block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5";

export default function AdminInvoicesPage() {
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  const [clientId, setClientId] = useState<string>("");
  const [billToName, setBillToName] = useState("");
  const [billToEmail, setBillToEmail] = useState("");
  const [billToAddress, setBillToAddress] = useState("");
  const [items, setItems] = useState<Item[]>([blankItem()]);
  const [taxPercent, setTaxPercent] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [servicePeriod, setServicePeriod] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedNumber, setSavedNumber] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getClients().then((r) => { if (r.success) setClients(r.data || []); });
    refreshInvoices();
  }, []);

  const refreshInvoices = () => getInvoices().then((r) => { if (r.success) setInvoices(r.data || []); });

  const onPickClient = (id: string) => {
    setClientId(id);
    if (!id) return;
    const c = clients.find((x) => String(x.id) === id);
    if (c) {
      setBillToName(c.name || "");
      let details: any = {};
      try { details = JSON.parse(c.details || "{}"); } catch {}
      setBillToEmail(details.email || details.contactEmail || "");
      setBillToAddress(details.address || "");
    }
  };

  const subtotal = useMemo(() => items.reduce((s, i) => s + (Number(i.amount) || 0), 0), [items]);
  const taxAmount = useMemo(() => Math.round((subtotal * (Number(taxPercent) || 0)) / 100), [subtotal, taxPercent]);
  const total = useMemo(() => Math.max(0, subtotal + taxAmount - (Number(discount) || 0)), [subtotal, taxAmount, discount]);
  const previewNumber = savedNumber || "INV-DRAFT";

  const setItem = (idx: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItem = (preset?: { label: string; details: string }) =>
    setItems((prev) => {
      // Fill the first empty line if there is one, else append.
      const emptyIdx = prev.findIndex((i) => !i.service.trim() && !i.amount);
      const newItem = preset ? { ...blankItem(), service: preset.label, details: preset.details } : blankItem();
      if (preset && emptyIdx >= 0) return prev.map((it, i) => (i === emptyIdx ? newItem : it));
      return [...prev, newItem];
    });
  const removeItem = (idx: number) => setItems((prev) => prev.length === 1 ? [blankItem()] : prev.filter((_, i) => i !== idx));

  const resetForm = () => {
    setClientId(""); setBillToName(""); setBillToEmail(""); setBillToAddress("");
    setItems([blankItem()]); setTaxPercent(0); setDiscount(0);
    setServicePeriod(""); setPaymentTerms(""); setDueDate(""); setNotes(""); setSavedNumber(null);
  };

  const handleSave = async (status: "draft" | "sent") => {
    if (!billToName.trim()) { toast("Enter who the invoice is for.", "error"); return; }
    if (!items.some((i) => i.service.trim() && Number(i.amount) > 0)) { toast("Add at least one service with an amount.", "error"); return; }
    setSaving(true);
    try {
      const res = await createInvoiceFull({
        clientId: clientId ? Number(clientId) : null,
        billToName, billToEmail, billToAddress,
        items: items.map((i) => ({ service: i.service, details: i.details, units: i.units ? Number(i.units) : undefined, amount: Number(i.amount), note: i.note })),
        taxPercent: Number(taxPercent), discount: Number(discount),
        servicePeriod, paymentTerms, dueDate, notes, status,
      });
      if (res.success) {
        setSavedNumber(res.invoiceNumber || null);
        toast(`Invoice ${res.invoiceNumber} ${status === "sent" ? "created & marked sent" : "saved as draft"}.`, "success");
        refreshInvoices();
      } else {
        toast(res.error || "Could not save invoice.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const shareText = () => {
    const lines = [
      `Invoice ${previewNumber} from ${COMPANY.name}`,
      `Bill to: ${billToName}`,
      servicePeriod ? `Service period: ${servicePeriod}` : "",
      "",
      ...items.filter((i) => i.service.trim()).map((i) =>
        `• ${i.service}${i.details ? ` — ${i.details}` : ""}: ${fmt(i.amount)}${i.note ? `\n   (${i.note})` : ""}`),
      "",
      `Subtotal: ${fmt(subtotal)}`,
      taxPercent ? `Tax (${taxPercent}%): ${fmt(taxAmount)}` : "",
      discount ? `Discount: -${fmt(discount)}` : "",
      `Total: ${fmt(total)}`,
      dueDate ? `Due: ${dueDate}` : "",
      paymentTerms ? `Terms: ${paymentTerms}` : "",
    ].filter(Boolean);
    return lines.join("\n");
  };

  const handleLoadInvoice = (inv: any) => {
    try {
      let isOldFormat = true;
      try {
        const payload = JSON.parse(inv.notes);
        if (payload && payload.v === 2) {
          isOldFormat = false;
          setClientId(inv.clientId || "");
          setBillToName(payload.billTo?.name || "");
          setBillToEmail(payload.billTo?.email || "");
          setBillToAddress(payload.billTo?.address || "");
          if (payload.items && payload.items.length > 0) {
            setItems(payload.items.map((i: any) => ({ service: i.service || "", details: i.details || "", note: i.note || "", units: i.units?.toString() || "", amount: Number(i.amount) || 0 })));
          }
          setTaxPercent(Number(payload.taxPercent) || 0);
          setDiscount(Number(payload.discount) || 0);
          setServicePeriod(payload.servicePeriod || "");
          setPaymentTerms(payload.paymentTerms || "");
          setNotes(payload.note || "");
        }
      } catch (e) {
        // Not JSON, ignore and fallback to old format
      }

      if (isOldFormat) {
        // Fallback for older or auto-generated invoices
        setClientId(inv.clientId || "");
        setBillToName(inv.clientName || "");
        setBillToEmail("");
        setBillToAddress("");
        setItems([{ 
          service: "Services Rendered", 
          details: "Legacy invoice entry", 
          units: "1", 
          amount: Number(inv.amount) || 0,
          note: ""
        }]);
        setTaxPercent(0);
        setDiscount(0);
        setServicePeriod("");
        setPaymentTerms("");
        // If notes is valid text and doesn't look like JSON, use it
        setNotes(!inv.notes?.startsWith("{") ? (inv.notes || "") : "");
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
      toast(`Loaded ${inv.invoiceNumber}`, "success");
    } catch (e) {
      toast("Error loading invoice data.", "error");
    }
  };

  const handleDeleteInvoice = async (id: number) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    const res = await deleteInvoice(id);
    if (res.success) {
      toast("Invoice deleted.", "success");
      refreshInvoices();
    } else {
      toast(res.error || "Failed to delete", "error");
    }
  };

  const handlePrint = () => {
    const node = previewRef.current;
    if (!node) return;
    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) { toast("Allow pop-ups to download the PDF.", "error"); return; }
    w.document.write(`<!doctype html><html><head><title>${previewNumber}</title>
      <meta charset="utf-8" />
      <script src="https://cdn.tailwindcss.com"></script>
      <style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style>
      </head><body class="p-8 bg-white text-slate-900">${node.innerHTML}
      <script>window.onload=function(){setTimeout(function(){window.print();},400);}</script>
      </body></html>`);
    w.document.close();
  };

  const handleShareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, "_blank");
  const handleShareEmail = () => {
    const subject = `Invoice ${previewNumber} — ${COMPANY.name}`;
    window.location.href = `mailto:${billToEmail || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareText())}`;
  };

  const visibleItems = items.filter((i) => i.service.trim() || i.amount > 0);

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Finance</p>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Invoices</h1>
        </div>
        <Button variant="outline" size="sm" onClick={resetForm} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ── Form ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Bill to */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bill To</h3>
            <div>
              <label className={LABEL}>Existing client (optional)</label>
              <select value={clientId} onChange={(e) => onPickClient(e.target.value)} className={INPUT}>
                <option value="">— Manual / one-off —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Name *</label>
              <input value={billToName} onChange={(e) => setBillToName(e.target.value)} placeholder="Client or company name" className={INPUT} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Email</label>
                <input value={billToEmail} onChange={(e) => setBillToEmail(e.target.value)} placeholder="client@email.com" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Service period</label>
                <input value={servicePeriod} onChange={(e) => setServicePeriod(e.target.value)} placeholder="e.g. June 2026" className={INPUT} />
              </div>
            </div>
            <div>
              <label className={LABEL}>Address</label>
              <input value={billToAddress} onChange={(e) => setBillToAddress(e.target.value)} placeholder="Billing address" className={INPUT} />
            </div>
          </div>

          {/* Services */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Services</h3>

            {/* Quick-add presets */}
            <div className="flex flex-wrap gap-1.5">
              {SERVICE_PRESETS.map((p) => {
                const Icon = p.icon;
                return (
                  <button key={p.label} onClick={() => addItem(p)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 hover:border-brand-300 hover:text-brand-600 transition-all cursor-pointer">
                    <Icon className="h-3 w-3" />{p.label}
                  </button>
                );
              })}
            </div>

            {/* Service line items */}
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 p-3 space-y-2 bg-slate-50/40 dark:bg-slate-900/20">
                  <div className="flex items-center gap-2">
                    <input value={it.service} onChange={(e) => setItem(idx, { service: e.target.value })} placeholder="Service (e.g. Web Development)" className={`${INPUT} font-semibold`} />
                    <button onClick={() => removeItem(idx)}
                      className="h-10 w-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input value={it.details} onChange={(e) => setItem(idx, { details: e.target.value })} placeholder="Scope / description (e.g. 5-page responsive site)" className={`${INPUT} text-xs`} />
                  <div className="flex items-center gap-2">
                    <div className="w-24">
                      <input type="number" min={0} value={it.units} onChange={(e) => setItem(idx, { units: e.target.value })} placeholder="Units" className={`${INPUT} text-xs px-2`} title="Optional: months, posts, hours…" />
                    </div>
                    <div className="flex-1 relative">
                      <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <input type="number" min={0} value={it.amount || ""} onChange={(e) => setItem(idx, { amount: Number(e.target.value) })} placeholder="Amount" className={`${INPUT} pl-7 font-semibold`} />
                    </div>
                  </div>
                  <div className="relative">
                    <StickyNote className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input value={it.note} onChange={(e) => setItem(idx, { note: e.target.value })} placeholder="Note (e.g. Domain & hosting included for 1 year)" className={`${INPUT} pl-8 text-xs`} />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => addItem()} className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer">
              <Plus className="h-3.5 w-3.5" /> Add another service
            </button>

            {/* Tax / discount */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className={LABEL}>Tax / GST %</label>
                <input type="number" min={0} value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value))} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Discount (₹)</label>
                <input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className={INPUT} />
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Terms & Notes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Due date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Payment terms</label>
                <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. 50% advance" className={INPUT} />
              </div>
            </div>
            <div>
              <label className={LABEL}>Invoice note</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Bank details, thank-you, terms & conditions…" className={`${INPUT} h-auto py-2`} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleSave("draft")} disabled={saving} variant="outline" className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save draft
            </Button>
            <Button onClick={() => handleSave("sent")} disabled={saving} className="gap-1.5 bg-brand-600 text-white">
              <Check className="h-4 w-4" /> Save & mark sent
            </Button>
          </div>
        </div>

        {/* ── Live preview ─────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5"><Download className="h-3.5 w-3.5" /> Download / Print</Button>
            <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</Button>
            <Button variant="outline" size="sm" onClick={handleShareEmail} className="gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</Button>
          </div>

          <div ref={previewRef} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white text-slate-900 p-6 sm:p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <img src={logoImg.src} alt={COMPANY.name} className="h-32 w-auto mb-2 -mt-6 -ml-4 object-contain mix-blend-multiply" />
                <p className="text-xs text-slate-500">{COMPANY.tagline}</p>
                <p className="text-xs text-slate-500">{COMPANY.email}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black tracking-tight text-slate-900">INVOICE</p>
                <p className="text-xs font-bold text-slate-500 mt-1">{previewNumber}</p>
                <p className="text-xs text-slate-500">Date: {todayISO()}</p>
                {dueDate && <p className="text-xs text-slate-500">Due: {dueDate}</p>}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bill To</p>
                <p className="text-sm font-bold text-slate-800 mt-1">{billToName || "—"}</p>
                {billToEmail && <p className="text-xs text-slate-500">{billToEmail}</p>}
                {billToAddress && <p className="text-xs text-slate-500">{billToAddress}</p>}
              </div>
              {servicePeriod && (
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service Period</p>
                  <p className="text-sm font-semibold text-slate-700 mt-1">{servicePeriod}</p>
                </div>
              )}
            </div>

            {/* Service rows */}
            <table className="w-full mt-6 text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                  <th className="text-left font-bold py-2">Service</th>
                  <th className="text-right font-bold py-2 w-32">Amount</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.length === 0 ? (
                  <tr><td colSpan={2} className="py-6 text-center text-xs text-slate-400">Add services to see them here…</td></tr>
                ) : visibleItems.map((it, idx) => (
                  <tr key={idx} className="border-b border-slate-50 align-top">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-slate-800">{it.service || "—"}{it.units ? ` × ${it.units}` : ""}</p>
                      {it.details && <p className="text-xs text-slate-500 mt-0.5">{it.details}</p>}
                      {it.note && <p className="text-[11px] text-slate-500 mt-1 italic">↳ {it.note}</p>}
                    </td>
                    <td className="py-3 text-right font-semibold text-slate-800 tabular-nums">{fmt(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex justify-end">
              <div className="w-56 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
                {taxPercent > 0 && <div className="flex justify-between text-slate-600"><span>Tax / GST ({taxPercent}%)</span><span className="tabular-nums">{fmt(taxAmount)}</span></div>}
                {discount > 0 && <div className="flex justify-between text-slate-600"><span>Discount</span><span className="tabular-nums">-{fmt(discount)}</span></div>}
                <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-extrabold text-slate-900">
                  <span>Total</span><span className="tabular-nums">{fmt(total)}</span>
                </div>
              </div>
            </div>

            {(paymentTerms || notes) && (
              <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                {paymentTerms && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Terms</p>
                    <p className="text-xs text-slate-600 mt-0.5">{paymentTerms}</p>
                  </div>
                )}
                {notes && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notes</p>
                    <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-line">{notes}</p>
                  </div>
                )}
              </div>
            )}
            <p className="mt-6 text-center text-[10px] text-slate-400">Thank you for your business · {COMPANY.name}</p>
          </div>
        </div>
      </div>

      {/* ── Existing invoices ────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">All Invoices</h3>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">{invoices.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500 bg-slate-50/60 dark:bg-slate-900/40">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Invoice #</th>
                <th className="px-4 py-2.5 text-left font-semibold">Client</th>
                <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                <th className="px-4 py-2.5 text-left font-semibold hidden sm:table-cell">Due</th>
                <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-slate-400">No invoices yet — create one above.</td></tr>
              ) : invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{inv.clientName}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-white">{fmt(inv.amount)}</td>
                  <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{inv.dueDate || "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={inv.status}
                      onChange={async (e) => {
                        const s = e.target.value as any;
                        await updateInvoiceStatus(inv.id, s, s === "paid" ? todayISO() : undefined);
                        refreshInvoices();
                      }}
                      className={`text-[10px] font-bold uppercase tracking-wider rounded-lg px-2 py-1 border cursor-pointer ${
                        inv.status === "paid" ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20"
                        : inv.status === "overdue" ? "text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/20"
                        : inv.status === "sent" ? "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/20"
                        : "text-slate-500 border-slate-200 bg-slate-50 dark:bg-slate-900"}`}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="View / Download"
                        onClick={() => handleLoadInvoice(inv)}
                        className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-md transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        title="Delete Invoice"
                        onClick={() => handleDeleteInvoice(inv.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// force reload
