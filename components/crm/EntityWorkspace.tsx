"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  createAccount,
  createContact,
  createDeal,
  getMyOrganizations,
  listAccounts,
  listContacts,
  listDeals,
} from "@/app/actions/domain";

type EntityKind = "accounts" | "contacts" | "deals";
type Organization = { id: number; name: string; role: string };
type EntityRecord = {
  id: number;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  website?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
};

const copy = {
  accounts: {
    title: "Accounts",
    description: "Companies and commercial relationships, separate from people.",
    empty: "No accounts in this organization.",
  },
  contacts: {
    title: "Contacts",
    description: "People associated with accounts, leads and deals.",
    empty: "No contacts in this organization.",
  },
  deals: {
    title: "Deals",
    description: "Qualified revenue opportunities with attribution and pipeline stages.",
    empty: "No deals in this organization.",
  },
} as const;

export default function EntityWorkspace({ kind }: { kind: EntityKind }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState(0);
  const [rows, setRows] = useState<EntityRecord[]>([]);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const loadRows = useCallback(async (selectedId: number) => {
    if (!selectedId) return;
    const result =
      kind === "accounts"
        ? await listAccounts(selectedId)
        : kind === "contacts"
          ? await listContacts(selectedId)
          : await listDeals(selectedId);
    if (result.success) setRows(result.data as EntityRecord[]);
    else setMessage(result.error || "Could not load records.");
  }, [kind]);

  useEffect(() => {
    getMyOrganizations().then((result) => {
      if (!result.success || !result.data.length) {
        setMessage(result.error || "No organization membership is available.");
        return;
      }
      setOrganizations(result.data);
      setOrganizationId(result.data[0].id);
      void loadRows(result.data[0].id);
    });
  }, [loadRows]);

  const submit = (formData: FormData) =>
    startTransition(async () => {
      const name = String(formData.get("name") || "").trim();
      let result: { success: boolean; error?: string };
      if (kind === "accounts") {
        result = await createAccount(organizationId, {
          name,
          website: String(formData.get("website") || ""),
        });
      } else if (kind === "contacts") {
        result = await createContact(organizationId, {
          firstName: name,
          lastName: String(formData.get("lastName") || ""),
          email: String(formData.get("email") || ""),
        });
      } else {
        result = await createDeal(organizationId, {
          name,
          amount: Math.round(Number(formData.get("amount") || 0)),
          currency: "INR",
        });
      }
      setMessage(result.success ? `${copy[kind].title.slice(0, -1)} created.` : result.error || "Could not create record.");
      if (result.success) await loadRows(organizationId);
    });

  return (
    <main className="space-y-6 pb-12">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Tenant CRM</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{copy[kind].title}</h1>
          <p className="mt-1 text-sm text-slate-500">{copy[kind].description}</p>
        </div>
        <select aria-label="Organization" value={organizationId} onChange={(event) => { const id = Number(event.target.value); setOrganizationId(id); void loadRows(id); }} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-[#303030] dark:bg-[#1f1f1f]">
          {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name} Â· {organization.role}</option>)}
        </select>
      </header>

      {message && <div role="status" className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200">{message}</div>}

      <form action={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4 dark:border-[#303030] dark:bg-[#1f1f1f]">
        <input required name="name" maxLength={255} placeholder={kind === "contacts" ? "First name" : `${copy[kind].title.slice(0, -1)} name`} className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-[#303030]" />
        {kind === "accounts" && <input name="website" type="url" placeholder="https://company.com" className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-[#303030]" />}
        {kind === "contacts" && <>
          <input name="lastName" placeholder="Last name" className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-[#303030]" />
          <input name="email" type="email" placeholder="Email" className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-[#303030]" />
        </>}
        {kind === "deals" && <input name="amount" type="number" min="0" step="1" placeholder="Value (INR)" className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-[#303030]" />}
        <button disabled={pending || !organizationId} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-start-4">Add {copy[kind].title.slice(0, -1).toLowerCase()}</button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#303030] dark:bg-[#1f1f1f]">
        <div className="divide-y divide-slate-200 dark:divide-[#303030]">
          {rows.map((row) => (
            <article key={row.id} className="flex flex-col justify-between gap-2 p-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-semibold">{row.name || [row.firstName, row.lastName].filter(Boolean).join(" ")}</h2>
                <p className="text-sm text-slate-500">{row.email || row.website || (row.amount != null ? `${row.currency || "INR"} ${row.amount.toLocaleString()}` : "No secondary details")}</p>
              </div>
              {row.status && <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium dark:bg-[#303030]">{row.status}</span>}
            </article>
          ))}
          {!rows.length && <p className="p-8 text-center text-sm text-slate-500">{copy[kind].empty}</p>}
        </div>
      </section>
    </main>
  );
}
