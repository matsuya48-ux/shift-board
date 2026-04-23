"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteAnnouncement } from "../actions";

export function AnnouncementDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("このお知らせを削除しますか？")) return;
    startTransition(async () => {
      await deleteAnnouncement(id);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[color:var(--ink-3)] transition-colors hover:bg-red-50 hover:text-[color:var(--danger)] disabled:opacity-50"
      aria-label="削除"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
      )}
    </button>
  );
}
