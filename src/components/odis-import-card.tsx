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

function defaultChoice(item: ImportItem): Choice {
  return item.kind === "update" || item.kind === "link" ? "apply" : "skip";
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
  const actionable = items?.filter((i) => i.kind !== "unchanged") ?? [];
  const newItems = actionable.filter((i) => i.kind === "new");

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
        <div className="space-y-4">
          <p className="text-sm">
            Found {items.length} ODIS project{items.length === 1 ? "" : "s"}: {actionable.length} need a decision or
            update, {unchangedCount} already up to date.
          </p>
          {warnings.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {newItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">{newItems.length} not in the CRM yet:</span>
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
                Add all as new
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

          <ul className="divide-y rounded-lg border">
            {actionable.map((item) => {
              const id = item.odis.odisId;
              const choice = choices[id] ?? "skip";
              const matched = item.kind === "update" || item.kind === "link";
              return (
                <li key={id} className="space-y-2 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.odis.name}</span>
                        <Badge variant="secondary">
                          {item.kind === "update" && "Update"}
                          {item.kind === "link" && "Match by name"}
                          {item.kind === "new" && "New"}
                          {item.kind === "ambiguous" && "Pick one"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ODIS #{id} · {item.odis.status ?? "no status"} · {formatMoney(item.odis.price)}
                        {item.project && item.project.name !== item.odis.name ? ` · CRM: ${item.project.name}` : ""}
                      </p>
                    </div>

                    {matched ? (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={choice === "apply"}
                          onChange={(e) => setChoices((c) => ({ ...c, [id]: e.target.checked ? "apply" : "skip" }))}
                        />
                        Include
                      </label>
                    ) : (
                      <select
                        className={selectClass}
                        value={choice}
                        onChange={(e) => setChoices((c) => ({ ...c, [id]: e.target.value }))}
                        aria-label={`What to do with ${item.odis.name}`}
                      >
                        <option value="skip">Skip</option>
                        {item.kind === "new" && <option value="create">Add as new project</option>}
                        {item.candidates.map((c) => (
                          <option key={c.id} value={`link:${c.id}`}>
                            Link to “{c.name}”
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {item.changes.length > 0 && (
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

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={runApply} disabled={pending || selectedCount === 0}>
              {pending ? "Saving…" : `Import ${selectedCount} project${selectedCount === 1 ? "" : "s"}`}
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
