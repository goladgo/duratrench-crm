"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateProjectDetails, type FormState } from "@/lib/actions/projects";
import type { Company, ProjectDetail } from "@/lib/types";

const initialState: FormState = {};

export function ProjectDetailsForm({
  project,
  designFirms,
}: {
  project: ProjectDetail;
  designFirms: Pick<Company, "id" | "name">[];
}) {
  const [state, formAction, pending] = useActionState(updateProjectDetails, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={project.id} />
      <div className="space-y-2">
        <Label htmlFor="project-name">Project name</Label>
        <Input id="project-name" name="name" required defaultValue={project.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="project-firm">Specified by</Label>
        <Select name="specifying_company_id" defaultValue={project.specifying_company_id ?? undefined}>
          <SelectTrigger id="project-firm" className="w-full">
            <SelectValue placeholder="No design firm set" />
          </SelectTrigger>
          <SelectContent>
            {designFirms.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="project-notes">Notes</Label>
        <Textarea id="project-notes" name="notes" rows={4} defaultValue={project.notes ?? undefined} />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
      {state.success && !pending && <span className="ml-2 text-sm text-muted-foreground">Saved</span>}
    </form>
  );
}
