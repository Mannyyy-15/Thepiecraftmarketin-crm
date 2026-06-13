// Switch-based status helpers — no bracket-notation object lookups on user input.
// Used across admin, employee, and client portals.

// ── Project status (admin/employee portal — brand as primary colour) ──────────
export function getProjectStatusVariant(status: string): "brand" | "info" | "success" | "warning" | "neutral" {
  switch (status) {
    case "in_progress": case "in-progress": case "active": case "development": case "design": return "brand";
    case "review": case "in_review": case "in-review": case "qa": return "warning";
    case "completed": case "live": return "success";
    case "planning": case "discovery": return "info";
    case "paused": case "on-hold": case "on_hold": return "neutral";
    default: return "neutral";
  }
}

// ── Project status (client portal — portal as primary colour) ────────────────
export function getClientProjectStatusVariant(status: string): "portal" | "info" | "success" | "warning" | "neutral" {
  switch (status) {
    case "in_progress": case "in-progress": return "portal";
    case "review": case "in_review": return "warning";
    case "completed": return "success";
    case "planning": return "info";
    default: return "neutral";
  }
}

// ── Project status label (shared across all portals) ─────────────────────────
export function getProjectStatusLabel(status: string): string {
  switch (status) {
    case "in_progress": case "in-progress": return "In Progress";
    case "review": case "in_review": return "In Review";
    case "completed": return "Completed";
    case "planning": return "Planning";
    case "on-hold": case "on_hold": return "On Hold";
    case "active": return "Active";
    case "paused": return "Paused";
    case "discovery": return "Discovery";
    case "design": return "Design";
    case "development": return "Development";
    case "qa": return "QA";
    case "live": return "Live";
    default: return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
  }
}

// ── Client/brand account status ───────────────────────────────────────────────
export function getClientStatusVariant(status: string): "success" | "info" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "active": return "success";
    case "onboarding": return "info";
    case "paused": return "warning";
    case "churned": return "danger";
    default: return "neutral";
  }
}

export function getClientStatusLabel(status: string): string {
  switch (status) {
    case "active": return "Active";
    case "onboarding": return "Onboarding";
    case "paused": return "Paused";
    case "churned": return "Churned";
    default: return status;
  }
}

// ── Team member online/offline status ────────────────────────────────────────
export function getMemberStatusVariant(status: string): "success" | "warning" | "neutral" {
  switch (status) {
    case "online": return "success";
    case "away": return "warning";
    default: return "neutral";
  }
}

export function getMemberStatusLabel(status: string): string {
  switch (status) {
    case "online": return "Online";
    case "away": return "Away";
    default: return "Offline";
  }
}

// ── Campaign/Ads status ───────────────────────────────────────────────────────
export function getCampaignStatusVariant(status: string): "success" | "warning" | "neutral" {
  switch (status) {
    case "active": return "success";
    case "paused": return "warning";
    default: return "neutral";
  }
}

export function getCampaignStatusLabel(status: string): string {
  switch (status) {
    case "active": return "Active";
    case "paused": return "Paused";
    case "draft": return "Draft";
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

// ── Website dev task status ───────────────────────────────────────────────────
export function getTaskStatusVariant(status: string): "neutral" | "brand" | "warning" | "danger" | "success" {
  switch (status) {
    case "in-progress": return "brand";
    case "in-review": return "warning";
    case "blocked": return "danger";
    case "done": return "success";
    default: return "neutral";
  }
}

// ── Invoice status ────────────────────────────────────────────────────────────
export function getInvoiceStatusVariant(status: string): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "paid": return "success";
    case "pending": return "warning";
    case "sent": return "warning";
    case "overdue": return "danger";
    default: return "neutral";
  }
}

export function getInvoiceStatusLabel(status: string): string {
  switch (status) {
    case "paid": return "Paid";
    case "pending": return "Pending";
    case "sent": return "Unpaid";
    case "overdue": return "Overdue";
    case "draft": return "Draft";
    default: return status;
  }
}
