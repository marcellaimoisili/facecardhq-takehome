"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  clearHistory,
  deleteHistory,
  readHistory,
  renameHistory,
  subscribeToHistory,
  type HistoryItem,
} from "@/lib/history";
import { readCollapsed, setCollapsed, subscribeToSidebar } from "@/lib/sidebar";
import { ConfirmDialog } from "./ConfirmDialog";

export function HistorySidebar() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [collapsed, setCollapsedState] = useState(false);
  const [mounted, setMounted] = useState(false);
  const params = useSearchParams();
  const currentQ = params.get("q") ?? "";

  useEffect(() => {
    setMounted(true);
    setItems(readHistory());
    setCollapsedState(readCollapsed());
    const unsubHistory = subscribeToHistory(() => setItems(readHistory()));
    const unsubSidebar = subscribeToSidebar(() => setCollapsedState(readCollapsed()));
    return () => {
      unsubHistory();
      unsubSidebar();
    };
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsedState(next);
    setCollapsed(next);
  }

  return (
    <aside
      className={`hidden shrink-0 border-r border-border transition-[width] duration-200 ease-out md:block ${
        collapsed ? "w-14" : "w-56"
      }`}
      aria-label="Search history"
    >
      <div className="sticky top-0 flex h-screen flex-col">
        {collapsed ? (
          <CollapsedView onExpand={toggle} />
        ) : (
          <ExpandedView
            items={items}
            mounted={mounted}
            currentQ={currentQ}
            onCollapse={toggle}
          />
        )}
      </div>
    </aside>
  );
}

function CollapsedView({ onExpand }: { onExpand: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 py-4">
      <button
        type="button"
        onClick={onExpand}
        aria-label="Expand sidebar"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <ChevronRight />
      </button>
      <Link
        href="/"
        aria-label="New search"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <PlusIcon />
      </Link>
    </div>
  );
}

function ExpandedView({
  items,
  mounted,
  currentQ,
  onCollapse,
}: {
  items: HistoryItem[];
  mounted: boolean;
  currentQ: string;
  onCollapse: () => void;
}) {
  const router = useRouter();
  const [editingTs, setEditingTs] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HistoryItem | null>(null);
  const [pendingClear, setPendingClear] = useState(false);

  const pendingDeleteLabel = pendingDelete?.label ?? pendingDelete?.query ?? "";

  return (
    <>
      <div className="flex items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="font-mono text-[12px] tabular text-ink-muted transition-colors hover:text-ink"
        >
          search
        </Link>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse sidebar"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <ChevronLeft />
        </button>
      </div>

      <div className="px-3 pb-4">
        <Link
          href="/"
          className="flex h-11 items-center gap-3 rounded-full border border-border px-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-surface"
        >
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-ink-muted">
            <PlusIcon />
          </span>
          <span className="truncate">New</span>
        </Link>
      </div>

      <div className="flex items-baseline justify-between px-4 pb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
          History
        </span>
        {mounted && items.length > 0 ? (
          <button
            type="button"
            onClick={() => setPendingClear(true)}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:text-ink"
          >
            Clear
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-6">
        {!mounted ? null : items.length === 0 ? (
          <p className="px-2 py-1 text-[13px] text-ink-muted">No past searches.</p>
        ) : (
          <ul className="space-y-0.5">
            {items.map((h) => {
              const isActive = h.query === currentQ;
              const display = h.label ?? h.query;
              if (editingTs === h.ts) {
                return (
                  <li key={h.ts}>
                    <RenameInput
                      initialValue={display}
                      onSave={(value) => {
                        renameHistory(h.ts, value);
                        setEditingTs(null);
                      }}
                      onCancel={() => setEditingTs(null)}
                    />
                  </li>
                );
              }
              return (
                <li key={h.ts}>
                  <HistoryRow
                    item={h}
                    display={display}
                    isActive={isActive}
                    onOpen={() =>
                      router.push(`/search?q=${encodeURIComponent(h.query)}`)
                    }
                    onRename={() => setEditingTs(h.ts)}
                    onDelete={() => setPendingDelete(h)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete search?"
        description={
          <>
            This will permanently delete:
            <span className="mt-1 block truncate font-medium text-ink">{pendingDeleteLabel}</span>
          </>
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) deleteHistory(pendingDelete.ts);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={pendingClear}
        title="Clear all history?"
        description="This will permanently delete every past search."
        confirmLabel="Clear all"
        destructive
        onConfirm={() => {
          clearHistory();
          setPendingClear(false);
        }}
        onCancel={() => setPendingClear(false)}
      />
    </>
  );
}

function HistoryRow({
  item,
  display,
  isActive,
  onOpen,
  onRename,
  onDelete,
}: {
  item: HistoryItem;
  display: string;
  isActive: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const baseColor = isActive
    ? "bg-surface text-ink"
    : "text-ink-muted hover:bg-surface hover:text-ink";
  return (
    <div className={`group relative flex items-stretch rounded-md ${baseColor}`}>
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-[13px]"
        title={item.query}
      >
        {display}
      </button>
      <div className="hidden items-center gap-0.5 pr-1 group-hover:flex group-focus-within:flex">
        <IconButton aria-label="Rename" onClick={onRename}>
          <PencilIcon />
        </IconButton>
        <IconButton aria-label="Delete" onClick={onDelete}>
          <TrashIcon />
        </IconButton>
      </div>
    </div>
  );
}

function RenameInput({
  initialValue,
  onSave,
  onCancel,
}: {
  initialValue: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      type="text"
      defaultValue={initialValue}
      onBlur={(e) => onSave(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSave(e.currentTarget.value);
        else if (e.key === "Escape") onCancel();
      }}
      className="w-full rounded-md bg-surface px-2 py-1.5 text-[13px] text-ink outline-none ring-2 ring-accent/30"
    />
  );
}

function IconButton({
  children,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-6 w-6 items-center justify-center rounded text-ink-muted transition-colors hover:bg-bg hover:text-ink"
      {...rest}
    >
      {children}
    </button>
  );
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M4 20l4-1 11-11-3-3L5 16l-1 4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
