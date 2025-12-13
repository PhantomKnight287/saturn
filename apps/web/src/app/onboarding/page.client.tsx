"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { onboardingSchema } from "./common";

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const generateSlug = (orgName: string): string => {
  if (!orgName.trim()) {
    return "";
  }

  const slug = orgName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const timestamp = Date.now();
  return `${slug}-${timestamp}`;
};

export default function OnboardingClient() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const orgNameId = useId();
  const router = useRouter();

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    mode: "onChange",
    defaultValues: {
      orgName: "",
    },
  });

  const { control } = form;

  const onSubmit = async (data: OnboardingFormData) => {
    try {
      setIsSubmitting(true);

      // Auto-generate slug from org name + timestamp
      const slug = generateSlug(data.orgName);

      // Create organization using better-auth
      const orgResult = await authClient.organization.create({
        name: data.orgName,
        slug,
      });

      if (orgResult.error) {
        toast.error(
          orgResult.error.message || "Failed to create organization"
        );
        return;
      }

      toast.success("Organization created successfully!");
      router.replace("/dashboard");
    } catch (error) {
      console.error("Error during onboarding:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-3xl">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Create Your Organization</CardTitle>
            <CardDescription className="text-base">
              Set up your organization to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={control}
                  name="orgName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className="font-medium text-base"
                        htmlFor={orgNameId}
                      >
                        Organization Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          id={orgNameId}
                          placeholder="Enter your organization name"
                          {...field}
                          className="h-11"
                          required
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription>
                        This will be the name of your organization that appears
                        to your team and customers. A unique slug will be
                        automatically generated.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-end pt-6">
                  <Button
                    className="px-8"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Creating...
                      </>
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
