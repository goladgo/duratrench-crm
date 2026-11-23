"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  applyOdisImport,
  previewOdisImport,
  type OdisApplyInput,
} from "@/lib/actions/odis-import";
import { formatMoney, type ImportItem } from "@/lib/odis/diff";

// Per-row choice. "apply" = write the matched row; "skip" = leave it out;
// "create" = add as a new CRM project; "link:<id>" = attach to an existing CRM project.
type Choice = string;

const selectClass =
  "h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Defaults: a project that isn't in the CRM yet is added. A project already in the CRM is left
// alone (unchecked) unless the user opts in to refreshing it. A "new" row that looks like an
// existing CRM project (similar name) defaults to Skip so it can't create a duplicate by accident.
function defaultChoice(item: ImportItem): Choice {
  if (item.kind === "new") return item.candidates.length > 0 ? "skip" : "create";
  return "skip";
}

export function OdisImportCard() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [items, setItems] = useState<ImportItem[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setText("");
    setItems(null);
    setWarnings([]);
    setChoices({});
    setError(null);
  }

  function runPreview() {
    setError(null);
    startTransition(async () => {
      const result = await previewOdisImport(text);
      if ("error" in result) {
        setError(result.error);
        setItems(null);
        return;
      }
      setItems(result.items);
      setWarnings(result.warnings);
      setChoices(Object.fromEntries(result.items.map((i) => [i.odis.odisId, defaultChoice(i)])));
    });
  }

  function buildPayload(): OdisApplyInput {
    const payload: OdisApplyInput = [];
    for (const item of items ?? []) {
      const choice = choices[item.odis.odisId];
      if (!choice || choice === "skip" || item.kind === "unchanged") continue;
      if (choice === "apply" && item.project) {
        payload.push({
          odis: item.odis,
          decision: { type: item.kind === "link" ? "link" : "update", projectId: item.project.id },
        });
      } else if (choice === "create") {
        payload.push({ odis: item.odis, decision: { type: "create" } });
      } else if (choice.startsWith("link:")) {
        payload.push({ odis: item.odis, decision: { type: "link", projectId: choice.slice(5) } });
      }
    }
    return payload;
  }

  function runApply() {
    const payload = buildPayload();
    if (payload.length === 0) {
      toast("Nothing selected to import.");
      return;
    }
    startTransition(async () => {
      const result = await applyOdisImport(payload);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      const parts = [
        result.updated && `${result.updated} updated`,
        result.linked && `${result.linked} linked`,
        result.created && `${result.created} added`,
      ].filter(Boolean);
      toast.success(parts.length ? `ODIS import done: ${parts.join(", ")}.` : "ODIS import done.");
      if (result.failures.length) toast.error(`${result.failures.length} row(s) failed. ${result.failures[0]}`);
      reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Import from ODIS
      </Button>
    );
  }

  const selectedCount = buildPayload().length;
  const unchangedCount = items?.filter((i) => i.kind === "unchanged").length ?? 0;
  const newRows = items?.filter((i) => i.kind === "new" || i.kind === "ambiguous") ?? [];
  const existingRows = items?.filter((i) => i.kind === "update" || i.kind === "link") ?? [];
  const newItems = newRows.filter((i) => i.kind === "new");
  const willAddCount = newRows.filter((i) => choices[i.odis.odisId] === "create").length;

  return (
    <section className="w-full space-y-4 rounded-xl border bg-card p-4 text-card-foreground">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Import from ODIS</h2>
          <p className="text-sm text-muted-foreground">
            In ODIS Project Search, select the table rows (with the ID column), copy, and paste below. You review
            everything before anything is saved.
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
            rows={8}
            placeholder="Paste the ODIS table here"
            className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={runPreview} disabled={pending || !text.trim()}>
            {pending ? "Reading…" : "Preview import"}
          </Button>
        </div>
      )}

      {items && (
        <div className="space-y-5">
          <p className="text-sm">
            Found {items.length} ODIS project{items.length === 1 ? "" : "s"}: {newRows.length} not in the CRM yet,{" "}
            {existingRows.length + unchangedCount} already in the CRM.
          </p>
          {warnings.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">Not in the CRM yet ({newRows.length})</h3>
              {newItems.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setChoices((c) => ({
                        ...c,
                        ...Object.fromEntries(newItems.map((i) => [i.odis.odisId, "create"])),
                      }))
                    }
                  >
                    Add all
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setChoices((c) => ({
                        ...c,
                        ...Object.fromEntries(newItems.map((i) => [i.odis.odisId, "skip"])),
                      }))
                    }
                  >
                    Skip all
                  </Button>
                </div>
              )}
            </div>
            {newRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Everything you pasted is already in the CRM.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {newRows.map((item) => {
                  const id = item.odis.odisId;
                  const choice = choices[id] ?? "skip";
                  return (
                    <li key={id} className="space-y-1 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{item.odis.name}</span>
                            <Badge variant="secondary">{item.kind === "ambiguous" ? "Pick one" : "New"}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            ODIS #{id} · {item.odis.status ?? "no status"} · {formatMoney(item.odis.price)}
                          </p>
                        </div>
                        <select
                          className={selectClass}
                          value={choice}
                          onChange={(e) => setChoices((c) => ({ ...c, [id]: e.target.value }))}
                          aria-label={`What to do with ${item.odis.name}`}
                        >
                          {item.kind === "new" && <option value="create">Add as new project</option>}
                          <option value="skip">Skip</option>
                          {item.candidates.map((c) => (
                            <option key={c.id} value={`link:${c.id}`}>
                              Link to “{c.name}”
                            </option>
                          ))}
                        </select>
                      </div>
                      {item.kind === "new" && item.candidates.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Similar to “{item.candidates[0].name}” already in the CRM, so this is set to Skip. Link it
                          instead, or choose Add as new project if it&apos;s a different job.
                        </p>
                      )}
                      {item.flags.map((f, i) => (
                        <p key={i} className="text-xs font-medium text-amber-700 dark:text-amber-400">
                          {f}
                        </p>
                      ))}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {existingRows.length > 0 && (
            <details className="rounded-lg border">
              <summary className="cursor-pointer select-none p-3 text-sm font-medium">
                Already in the CRM ({existingRows.length}). Left alone unless you tick them
              </summary>
              <div className="space-y-2 border-t p-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setChoices((c) => ({
                        ...c,
                        ...Object.fromEntries(existingRows.map((i) => [i.odis.odisId, "apply"])),
                      }))
                    }
                  >
                    Update all from ODIS
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setChoices((c) => ({
                        ...c,
                        ...Object.fromEntries(existingRows.map((i) => [i.odis.odisId, "skip"])),
                      }))
                    }
                  >
                    Leave all alone
                  </Button>
                </div>
                <ul className="divide-y rounded-lg border">
                  {existingRows.map((item) => {
                    const id = item.odis.odisId;
                    const included = choices[id] === "apply";
                    return (
                      <li key={id} className="space-y-1 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{item.odis.name}</span>
                              <Badge variant="outline">In CRM</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              ODIS #{id} · {item.odis.status ?? "no status"} · {formatMoney(item.odis.price)}
                              {item.project && item.project.name !== item.odis.name ? ` · CRM: ${item.project.name}` : ""}
                            </p>
                          </div>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={included}
                              onChange={(e) =>
                                setChoices((c) => ({ ...c, [id]: e.target.checked ? "apply" : "skip" }))
                              }
                            />
                            Update from ODIS
                          </label>
                        </div>
                        {included && item.changes.length > 0 && (
                          <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                            {item.changes.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        )}
                        {item.flags.map((f, i) => (
                          <p key={i} className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            {f}
                          </p>
                        ))}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </details>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={runApply} disabled={pending || selectedCount === 0}>
              {pending
                ? "Saving…"
                : willAddCount === selectedCount
                  ? `Add ${willAddCount} project${willAddCount === 1 ? "" : "s"} to the CRM`
                  : `Save ${selectedCount} change${selectedCount === 1 ? "" : "s"}`}
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
