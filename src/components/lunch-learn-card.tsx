"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { updateLunchLearn } from "@/lib/actions/locations";

const today = () => new Date().toISOString().slice(0, 10);

export function LunchLearnCard({
  locationId,
  completedAt,
  scheduledAt,
}: {
  locationId: string;
  completedAt: string | null;
  scheduledAt: string | null;
}) {
  const [completed, setCompleted] = useState(!!completedAt);
  const [completedDate, setCompletedDate] = useState(completedAt ?? today());
  const [scheduled, setScheduled] = useState(!!scheduledAt);
  const [scheduledDate, setScheduledDate] = useState(scheduledAt ?? today());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateLunchLearn(
        locationId,
        completed ? completedDate || today() : null,
        scheduled ? scheduledDate || today() : null
      );
      if (result?.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Lunch &amp; Learn</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4"
              checked={completed}
              onChange={(e) => {
                setCompleted(e.target.checked);
                setSaved(false);
              }}
            />
            Completed
          </label>
          {completed && (
            <Input
              type="date"
              className="w-auto"
              value={completedDate}
              onChange={(e) => {
                setCompletedDate(e.target.value);
                setSaved(false);
              }}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4"
              checked={scheduled}
              onChange={(e) => {
                setScheduled(e.target.checked);
                setSaved(false);
              }}
            />
            Scheduled
          </label>
          {scheduled && (
            <Input
              type="date"
              className="w-auto"
              value={scheduledDate}
              onChange={(e) => {
                setScheduledDate(e.target.value);
                setSaved(false);
              }}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" type="button" onClick={handleSave} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
          {saved && !pending && <span className="text-sm text-muted-foreground">Saved</span>}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
