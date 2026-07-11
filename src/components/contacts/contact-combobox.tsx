"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import type { Contact } from "@/types";

const MAX_SUGGESTIONS = 6;

function matchContacts(contacts: Contact[], query: string): Contact[] {
  const q = query.trim().toLowerCase();
  if (!q) return contacts.slice(0, MAX_SUGGESTIONS);
  const starts: Contact[] = [];
  const includes: Contact[] = [];
  for (const c of contacts) {
    const n = c.name.toLowerCase();
    if (n.startsWith(q)) starts.push(c);
    else if (n.includes(q)) includes.push(c);
  }
  return [...starts, ...includes].slice(0, MAX_SUGGESTIONS);
}

interface ContactComboboxProps {
  value: string;
  onChange: (value: string) => void;
  contacts: Contact[];
  placeholder?: string;
  id?: string;
}

/**
 * A plain text input that suggests previously-used contacts as you type.
 * Free text is always allowed — an unmatched name simply becomes a new
 * contact when the record is saved.
 */
export function ContactCombobox({
  value,
  onChange,
  contacts,
  placeholder,
  id,
}: ContactComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const blurTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = React.useMemo(
    () => matchContacts(contacts, value),
    [contacts, value]
  );

  const exactMatch = React.useMemo(
    () =>
      contacts.some(
        (c) => c.name.toLowerCase() === value.trim().toLowerCase()
      ),
    [contacts, value]
  );

  const showList = open && suggestions.length > 0;
  const showNewHint =
    open && value.trim().length > 0 && !exactMatch;

  const select = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        id={id}
        placeholder={placeholder}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay so a mousedown on a suggestion still registers.
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex(
              (i) => (i - 1 + suggestions.length) % suggestions.length
            );
          } else if (e.key === "Enter") {
            e.preventDefault();
            select(suggestions[activeIndex].name);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {(showList || showNewHint) && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {suggestions.map((c, index) => (
            <button
              key={c._id}
              type="button"
              // onMouseDown fires before the input blur, so selection wins.
              onMouseDown={(e) => {
                e.preventDefault();
                select(c.name);
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
          {showNewHint && (
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
              &ldquo;{value.trim()}&rdquo; will be saved as a new contact
            </p>
          )}
        </div>
      )}
    </div>
  );
}
