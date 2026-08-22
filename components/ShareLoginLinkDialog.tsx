"use client";

import { useMemo, useState } from "react";
import { Check, Clock3, Copy, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

interface ShareLoginLinkDialogProps {
  open: boolean;
  onClose: () => void;
  loginLink: string;
  personName: string;
  email?: string | null;
  phone?: string | null;
  expiresAt?: string | Date | null;
}

export function ShareLoginLinkDialog({
  open,
  onClose,
  loginLink,
  personName,
  email,
  phone,
  expiresAt,
}: ShareLoginLinkDialogProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const message = useMemo(
    () =>
      `Hi ${personName}, here is your private one-time link to access Irani Koyla OS:\n\n${loginLink}\n\nOpen it only on your own device. It expires automatically.`,
    [loginLink, personName]
  );

  const expiryLabel = useMemo(() => {
    if (!expiresAt) return "This link expires automatically.";
    const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
    if (Number.isNaN(date.getTime())) return "This link expires automatically.";
    return `Expires ${new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date)}.`;
  }, [expiresAt]);

  const phoneDigits = phone?.replace(/\D/g, "") ?? "";
  const whatsAppUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
  const emailUrl = `mailto:${email ?? ""}?subject=${encodeURIComponent(
    "Your secure Irani Koyla OS access"
  )}&body=${encodeURIComponent(message)}`;

  async function copyLink() {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(loginLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError(true);
    }
  }

  function openWhatsApp() {
    const popup = window.open(whatsAppUrl, "_blank", "noopener,noreferrer");
    if (popup) popup.opener = null;
  }

  function closeDialog() {
    setCopied(false);
    setCopyError(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && closeDialog()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle>Share secure access</DialogTitle>
          <DialogDescription>
            Send {personName} this private, one-time sign-in link. They can open it and
            continue without entering their password.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-[#38383f] dark:bg-[#28282d]">
            <div className="min-w-0 flex-1 px-2">
              <p className="truncate text-sm text-slate-600 dark:text-slate-300">
                {loginLink}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={copyLink}
              aria-live="polite"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copy
                </>
              )}
            </Button>
          </div>
          {copyError && (
            <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-300">
              Copy was blocked by this browser. Use WhatsApp or email instead.
            </p>
          )}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{expiryLabel} Creating another link will revoke this one.</span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={openWhatsApp}>
            <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            WhatsApp
          </Button>
          <a
            href={emailUrl}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-[#2a2a30] dark:bg-[#28282d] dark:text-[#9999a8] dark:hover:border-[#38383f] dark:hover:bg-[#38383f]"
          >
            <Mail className="h-4 w-4 text-blue-500" aria-hidden="true" />
            Email
          </a>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={closeDialog}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
