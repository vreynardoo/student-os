"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createCourseAction, updateCourseAction } from "@/lib/actions/courses";
import type { Course } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";

export function CourseForm({ course, onSuccess }: { course?: Course; onSuccess: () => void }) {
  const router = useRouter();

  const [name, setName] = useState(course?.name ?? "");
  const [code, setCode] = useState(course?.code ?? "");
  const [term, setTerm] = useState(course?.term ?? "");
  const [color, setColor] = useState(course?.color ?? "");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const input = { name, code, color, term };
    const result = course ? await updateCourseAction(course.id, input) : await createCourseAction(input);

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }

    router.refresh();
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="code">Code (optional)</Label>
        <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CS301" />
        {fieldErrors.code && <p className="text-sm text-destructive">{fieldErrors.code[0]}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="term">Term (optional)</Label>
        <Input id="term" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. Fall 2026" />
        {fieldErrors.term && <p className="text-sm text-destructive">{fieldErrors.term[0]}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="color">Color (optional)</Label>
        <Input id="color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. #2563eb" />
        {fieldErrors.color && <p className="text-sm text-destructive">{fieldErrors.color[0]}</p>}
      </div>
      {error && !Object.keys(fieldErrors).length && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : course ? "Save changes" : "Create course"}
        </Button>
      </DialogFooter>
    </form>
  );
}
