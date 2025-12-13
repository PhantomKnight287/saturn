import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import OnboardingClient from "./page.client"

export const metadata: Metadata = {
	title: "Onboarding",
	description: "Create a new organization and get started with token vault.",
};

export default async function OnboardingPage() {
	const session = await authClient.getSession(undefined, {
		headers: await headers(),
	});
	if (!session.data?.user) {
		redirect("/auth/sign-in");
	}
	return <OnboardingClient />;
}