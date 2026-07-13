"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject, type FormState } from "@/lib/actions/projects";
import { PlusCircle } from "lucide-react";

const initialState: FormState = {};

export function ProjectFormDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prevState: FormState, formData: FormData) => {
    const result = await createProject(prevState, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <PlusCircle className="size-4" />
        New Project
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="redirectTo" value="/projects/:id" />
          <div className="space-y-2">
            <Label htmlFor="project-name-new">Project name</Label>
            <Input id="project-name-new" name="name" required placeholder="e.g. Riverside Bridge Repair" autoFocus />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
