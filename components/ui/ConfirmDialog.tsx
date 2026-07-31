import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./Dialog";

export interface ConfirmDialogProps {
  id: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ id, message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <DialogHeader>
          <DialogTitle>Confirm action</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
