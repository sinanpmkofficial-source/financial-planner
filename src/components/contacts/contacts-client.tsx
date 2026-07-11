"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  backfillContactsFromRecords,
} from "@/actions/contact";
import { PageHeader } from "@/components/layout/header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  Pencil,
  Check,
  X,
  Phone,
  Loader2,
  DownloadCloud,
} from "lucide-react";
import { toast } from "sonner";
import type { Contact } from "@/types";

export function ContactsClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setContacts(await getContacts());
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    try {
      const res = await createContact({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      if (res.success) {
        toast.success("Contact saved");
        setName("");
        setPhone("");
        fetchData();
      } else {
        toast.error(res.error);
      }
    } finally {
      setAdding(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await backfillContactsFromRecords();
      if (res.success) {
        toast.success(
          res.added > 0
            ? `Imported ${res.added} contact${res.added === 1 ? "" : "s"} from history`
            : "No new contacts to import"
        );
        fetchData();
      } else {
        toast.error(res.error);
      }
    } finally {
      setSeeding(false);
    }
  };

  const startEdit = (c: Contact) => {
    setEditingId(c._id);
    setEditName(c.name);
    setEditPhone(c.phone ?? "");
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    const res = await updateContact(id, {
      name: editName.trim(),
      phone: editPhone.trim() || undefined,
    });
    if (res.success) {
      toast.success("Contact updated");
      setEditingId(null);
      fetchData();
    } else {
      toast.error(res.error);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteContact(id);
    if (res.success) {
      setContacts((prev) => prev.filter((c) => c._id !== id));
      toast.success("Contact deleted");
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="People you transact with — reused across borrow/lend, splits and notes"
        action={
          <Button
            onClick={handleSeed}
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={seeding}
          >
            {seeding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <DownloadCloud className="w-3.5 h-3.5" />
            )}
            Import from history
          </Button>
        }
      />

      {/* Add form */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              className="sm:flex-1"
            />
            <Input
              placeholder="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              className="sm:w-48"
            />
            <Button
              onClick={handleAdd}
              className="gap-1.5 shrink-0"
              disabled={adding || !name.trim()}
            >
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-xl border border-border/20 bg-card animate-pulse"
            />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add someone above, or import the people already in your borrow/lend history."
          actionLabel="Import from history"
          onAction={handleSeed}
        />
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <Card key={c._id} className="border border-border/50 bg-card">
              <CardContent className="p-3 sm:p-4">
                {editingId === c._id ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Name"
                      className="sm:flex-1"
                    />
                    <Input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Phone (optional)"
                      className="sm:w-48"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-emerald-600"
                        onClick={() => saveEdit(c._id)}
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-muted-foreground"
                        onClick={() => setEditingId(null)}
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Users className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {c.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {c.phone && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {c.phone}
                            </span>
                          )}
                          {c.usageCount > 0 && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] uppercase tracking-wider px-1.5 py-0"
                            >
                              used {c.usageCount}×
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
                        onClick={() => startEdit(c)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <ConfirmDelete
                        title="Delete contact?"
                        description="This removes the saved contact. Existing records keep their names."
                        onConfirm={() => handleDelete(c._id)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
