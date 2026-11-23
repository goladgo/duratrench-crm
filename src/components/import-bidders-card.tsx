"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  applyBidders,
  previewBidders,
  readBiddersFromImage,
  type ApplyBiddersInput,
} from "@/lib/actions/project-bidders";
import { resizeImageToBase64 } from "@/lib/image-resize";
import { withTimeout } from "@/lib/with-timeout";
import type { BidderPlanItem } from "@/lib/bidders/match";
import type { BidderRow } from "@/lib/bidders/parse";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface RowState {
  choice: string; // "skip" | "loc:<id>" | "new-branch" | "new-company" | "" (not chosen yet)
  category: string; // "distributor" | "contractor" | ""
}

function isResolved(item: BidderPlanItem, s: RowState): boolean {
  if (s.choice === "skip") return true;
  if (s.choice === "") return false;
  if (s.choice === "new-company" && !s.category) return false;
  return true;
}

// Paste a project's bidders from ODIS (copied text or a screenshot), review, and save. Every new
// person is added to the CRM at their branch; the project page then lists them as bidders.
export function ImportBiddersCard({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [items, setItems] = useState<BidderPlanItem[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [already, setAlready] = useState<Set<string>>(new Set());
  const [state, setState] = useState<Record<string, RowState>>({});
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [pending, startTransition] = useTransition();

  function reset() {
    setText("");
    setItems(null);
    setWarnings([]);
    setAlready(new Set());
    setState({});
    setError(null);
    setReading(false);
  }

  function loadPreview(result: Awaited<ReturnType<typeof previewBidders>>) {
    if ("error" in result) {
      setError(result.error);
      setItems(null);
      return;
    }
    setError(null);
    setItems(result.items);
    setWarnings(result.warnings);
    setAlready(new Set(result.alreadyOnProject));
    setState(
      Object.fromEntries(
        result.items.map((i) => [i.key, { choice: i.defaultChoice, category: i.guessedCategory ?? "" }])
      )
    );
  }

  function previewFromText() {
    setError(null);
    startTransition(async () => {
      loadPreview(await previewBidders(projectId, { text }));
    });
  }

  async function previewFromImage(file: File) {
    setError(null);
    setReading(true);
    try {
      const { base64, mediaType } = await resizeImageToBase64(file, 1600, 0.9);
      const form = new FormData();
      form.append("photoBase64", base64);
      form.append("mediaType", mediaType);
      const read = await withTimeout(
        readBiddersFromImage(form),
        40000,
        "Reading the screenshot timed out. Check your connection and try again."
      );
      if ("error" in read) {
        setError(read.error);
        return;
      }
      const rows: BidderRow[] = read.rows;
      loadPreview(await previewBidders(projectId, { rows }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that screenshot.");
    } finally {
      setReading(false);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (file) {
      e.preventDefault();
      void previewFromImage(file);
    }
  }

  function set(key: string, patch: Partial<RowState>) {
    setState((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
  }

  const active = (items ?? []).filter((i) => (state[i.key]?.choice ?? "skip") !== "skip");
  const unresolved = (items ?? []).filter((i) => state[i.key] && !isResolved(i, state[i.key]));
  const internalItems = (items ?? []).filter((i) => i.internal);
  const mainItems = (items ?? []).filter((i) => !i.internal);

  function runApply() {
    const payload: ApplyBiddersInput = active.map((i) => ({
      row: i.row,
      choice: state[i.key].choice,
      companyId: i.company?.id ?? null,
      category: (state[i.key].category || null) as "distributor" | "contractor" | null,
    }));
    if (payload.length === 0) {
      toast("Nothing selected to add.");
      return;
    }
    startTransition(async () => {
      const result = await applyBidders(projectId, payload);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      const extra = [
        result.newContacts && `${result.newContacts} new contact${result.newContacts === 1 ? "" : "s"}`,
        result.newBranches && `${result.newBranches} new branch${result.newBranches === 1 ? "" : "es"}`,
        result.newCompanies && `${result.newCompanies} new compan${result.newCompanies === 1 ? "y" : "ies"}`,
      ].filter(Boolean);
      toast.success(`Added ${result.added} bidder${result.added === 1 ? "" : "s"}${extra.length ? ` (${extra.join(", ")})` : ""}.`);
      if (result.failures.length) toast.error(`${result.failures.length} failed. ${result.failures[0]}`);
      reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Import bidders from ODIS
      </Button>
    );
  }

  return (
    <section
      className="w-full space-y-4 rounded-xl border bg-card p-4 text-card-foreground"
      onPaste={handlePaste}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Import bidders from ODIS</h3>
          <p className="text-sm text-muted-foreground">
            In ODIS, open this project&apos;s Bidders window. Select the table and paste the text below, or paste a
            screenshot. Nothing is saved until you review it.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          Close
        </Button>
      </div>

      {!items && (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Click here, then paste the bidders text or a screenshot"
            className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={previewFromText} disabled={pending || reading || !text.trim()}>
              {pending ? "Reading…" : "Preview bidders"}
            </Button>
            <label className="text-sm text-muted-foreground">
              or upload a screenshot:{" "}
              <input
                type="file"
                accept="image/*"
                disabled={reading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void previewFromImage(f);
                }}
              />
            </label>
            {reading && <span className="text-sm text-muted-foreground">Reading screenshot…</span>}
          </div>
        </div>
      )}

      {items && (
        <div className="space-y-4">
          <p className="text-sm">
            Found {items.length} bidder{items.length === 1 ? "" : "s"}
            {internalItems.length > 0 ? `, ${internalItems.length} on your own team (skipped)` : ""}.
          </p>
          {warnings.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <ul className="divide-y rounded-lg border">
            {mainItems.map((item) => {
              const s = state[item.key] ?? { choice: "", category: "" };
              const needs = !isResolved(item, s);
              return (
                <li key={item.key} className="space-y-2 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.row.name}</span>
                    {item.existingContact ? (
                      <Badge variant="outline">Existing contact</Badge>
                    ) : (
                      <Badge variant="secondary">New contact</Badge>
                    )}
                    {already.has(item.key) && <Badge variant="outline">Already on this project</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.row.company || "No company"}
                    {item.row.phone ? ` · ${item.row.phone}` : ""}
                    {item.row.email ? ` · ${item.row.email}` : ""}
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      className={`${selectClass} ${needs && s.choice === "" ? "border-amber-500" : ""}`}
                      value={s.choice}
                      onChange={(e) => set(item.key, { choice: e.target.value })}
                      aria-label={`Branch for ${item.row.name}`}
                    >
                      {s.choice === "" && (
                        <option value="" disabled>
                          Choose a branch…
                        </option>
                      )}
                      {item.branches.map((b) => (
                        <option key={b.id} value={`loc:${b.id}`}>
                          {b.name}
                          {b.city ? ` (${b.city})` : ""}
                        </option>
                      ))}
                      {item.company && (
                        <option value="new-branch">
                          Add as new branch{item.branchHint ? `: ${item.branchHint}` : ""}
                        </option>
                      )}
                      {!item.company && <option value="new-company">Add “{item.newCompanyName}” as a new company</option>}
                      <option value="skip">Skip this person</option>
                    </select>

                    {s.choice === "new-company" && (
                      <select
                        className={`${selectClass} ${!s.category ? "border-amber-500" : ""}`}
                        value={s.category}
                        onChange={(e) => set(item.key, { category: e.target.value })}
                        aria-label={`Company type for ${item.row.name}`}
                      >
                        {!s.category && (
                          <option value="" disabled>
                            Distributor or contractor?
                          </option>
                        )}
                        <option value="distributor">Distributor</option>
                        <option value="contractor">Contractor</option>
                      </select>
                    )}
                    {s.choice === "new-company" && !s.category && (
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400 sm:col-span-2">
                        Couldn&apos;t tell from the name whether this is a distributor or a contractor. Pick one.
                      </p>
                    )}
                    {s.choice === "new-company" && item.guessedCategory && s.category === item.guessedCategory && (
                      <p className="text-xs text-muted-foreground sm:col-span-2">
                        Guessed {item.guessedCategory} from the company name. Change it if that&apos;s wrong.
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {internalItems.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Skipped (your team): {internalItems.map((i) => i.row.name).join(", ")}
            </p>
          )}

          {unresolved.length > 0 && (
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {unresolved.length} bidder{unresolved.length === 1 ? " needs" : "s need"} a choice above, or set{" "}
              {unresolved.length === 1 ? "it" : "them"} to Skip.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={runApply} disabled={pending || active.length === 0 || unresolved.length > 0}>
              {pending ? "Saving…" : `Add ${active.length} bidder${active.length === 1 ? "" : "s"} to this project`}
            </Button>
            <Button variant="ghost" onClick={reset} disabled={pending}>
              Start over
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
