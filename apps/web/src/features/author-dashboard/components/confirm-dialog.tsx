"use client";

import { Button } from "../../../components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--panel-strong)] p-5 shadow-2xl">
        <h3 className="text-lg font-semibold text-[var(--ink)]">{title}</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} disabled={busy}>
            {busy ? "Processing..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
