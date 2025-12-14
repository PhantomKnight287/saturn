"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
  useState,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createProject } from "../action";
import { useRouter } from "next/navigation";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
});

type ProjectFormData = z.infer<typeof projectSchema>;
type CreateProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
};

export function CreateProjectDialog({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: CreateProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formId = useId();

  const router = useRouter();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (data: ProjectFormData) => {
    try {
      setIsSubmitting(true);

      const result = await createProject({
        name: data.name,
        organizationId,
      });

      if (result?.success === false) {
        toast.error(result.message);
        return;
      }

      toast.success("Project created successfully!");
      form.reset();
      onOpenChange(false);
      router.refresh();
      onSuccess?.();
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a new project for your organization.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Project Name</FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    placeholder="My Project"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isSubmitting} form={formId} type="submit">
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating...
              </>
            ) : (
              "Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type CreateProjectButtonProps = {
  organizationId: string;
  onSuccess?: () => void;
};

export function CreateProjectButton({
  organizationId,
  onSuccess,
}: CreateProjectButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Create project</Button>
      <CreateProjectDialog
        onOpenChange={setOpen}
        onSuccess={onSuccess}
        open={open}
        organizationId={organizationId}
      />
    </>
  );
}

type CreateProjectTriggerProps = {
  organizationId: string;
  onSuccess?: () => void;
  children: ReactNode;
};

export function CreateProjectTrigger({
  organizationId,
  onSuccess,
  children,
}: CreateProjectTriggerProps) {
  const [open, setOpen] = useState(false);
  const handleClick = () => {
    setOpen(true);
  };

  return (
    <>
      {isValidElement(children) ? (
        cloneElement(children as ReactElement<{ onClick?: () => void }>, {
          onClick: handleClick,
        })
      ) : (
        <button onClick={handleClick} type="button">
          {children}
        </button>
      )}
      <CreateProjectDialog
        onOpenChange={setOpen}
        onSuccess={onSuccess}
        open={open}
        organizationId={organizationId}
      />
    </>
  );
}
