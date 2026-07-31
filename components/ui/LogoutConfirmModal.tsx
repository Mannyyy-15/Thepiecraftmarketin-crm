"use client";

import { LogOut } from "lucide-react";
import { Button } from "./Button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./Dialog";

interface Props {
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutConfirmModal({ isOpen, isLoading = false, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isLoading) onCancel(); }}>
      <DialogContent className="max-w-sm" hideClose={isLoading}>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/40 flex items-center justify-center">
                <LogOut className="h-6 w-6 text-rose-500" />
              </div>
              <div>
                <DialogHeader className="text-center">
                <DialogTitle>Sign out?</DialogTitle>
                <DialogDescription>
                  Are you sure you want to sign out of your account?
                </DialogDescription>
                </DialogHeader>
              </div>
              <DialogFooter className="grid w-full grid-cols-2">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={onConfirm}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" /> Signing out…</>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
      </DialogContent>
    </Dialog>
  );
}
