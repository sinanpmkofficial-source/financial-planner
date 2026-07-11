"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { User, Plus } from "lucide-react";
import type { Contact } from "@/types";

const MAX_SUGGESTIONS = 6;

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  contacts: Contact[];
  placeholder?: string;
  id?: string;
  /**
   * Create a brand-new contact from the typed query. Returns the created
   * contact (so it can be inserted) or null on failure. When omitted, the
   * "+ Add" affordance is hidden.
   */
  onCreateContact?: (name: string) => Promise<Contact | null>;
}

/**
 * A single-line text input that turns "@" into a contact autocomplete. Picking
 * a suggestion inserts "@Name " as plain text — a lightweight, human-readable
 * tag, not a structured reference. Also offers inline creation of a new contact.
 */
export function MentionInput({
  value,
  onChange,
  contacts,
  placeholder,
  id,
  onCreateContact,
}: MentionInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [caret, setCaret] = React.useState<number | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const pendingCaret = React.useRef<number | null>(null);

  // The active "@token" immediately before the caret, if any.
  const token = React.useMemo(() => {
    if (caret == null) return null;
    const before = value.slice(0, caret);
    const m = before.match(/@([^\s@]*)$/);
    if (!m) return null;
    return { query: m[1], start: caret - m[0].length };
  }, [value, caret]);

  const suggestions = React.useMemo(() => {
    if (!token) return [];
    const q = token.query.toLowerCase();
    return contacts
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [contacts, token]);

  const canAdd = !!(
    token &&
    token.query.trim() &&
    !contacts.some(
      (c) => c.name.toLowerCase() === token.query.trim().toLowerCase()
    ) &&
    onCreateContact
  );

  const open = !!token && (suggestions.length > 0 || canAdd);
  const optionCount = suggestions.length + (canAdd ? 1 : 0);

  // Restore the caret after a programmatic value change (insert/replace).
  React.useEffect(() => {
    if (pendingCaret.current != null && inputRef.current) {
      inputRef.current.setSelectionRange(
        pendingCaret.current,
        pendingCaret.current
      );
      inputRef.current.focus();
      pendingCaret.current = null;
    }
  });

  const insertName = (name: string) => {
    if (!token || caret == null) return;
    const before = value.slice(0, token.start);
    const after = value.slice(caret);
    const inserted = `@${name} `;
    const next = before + inserted + after;
    const newCaret = (before + inserted).length;
    pendingCaret.current = newCaret;
    setCaret(newCaret);
    setActiveIndex(0);
    onChange(next);
  };

  const addNew = async () => {
    if (!token || !onCreateContact) return;
    const created = await onCreateContact(token.query.trim());
    if (created) insertName(created.name);
  };

  const syncCaret = (el: HTMLInputElement) => setCaret(el.selectionStart);

  return (
    <div className="relative">
      <Input
        id={id}
        ref={inputRef}
        placeholder={placeholder}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setCaret(e.target.selectionStart);
          setActiveIndex(0);
        }}
        onKeyUp={(e) => syncCaret(e.currentTarget)}
        onClick={(e) => syncCaret(e.currentTarget)}
        onBlur={() => {
          // Delay so a mousedown on an option still registers.
          setTimeout(() => setCaret(null), 120);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % optionCount);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + optionCount) % optionCount);
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (activeIndex < suggestions.length) {
              insertName(suggestions[activeIndex].name);
            } else if (canAdd) {
              void addNew();
            }
          } else if (e.key === "Escape") {
            setCaret(null);
          }
        }}
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {suggestions.map((c, index) => (
            <button
              key={c._id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertName(c.name);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                index === activeIndex
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground"
              )}
            >
              <User className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
          {canAdd && token && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                void addNew();
              }}
              onMouseEnter={() => setActiveIndex(suggestions.length)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                activeIndex === suggestions.length
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Plus className="size-3.5 shrink-0" />
              <span className="truncate">
                Add &ldquo;{token.query.trim()}&rdquo; as contact
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
