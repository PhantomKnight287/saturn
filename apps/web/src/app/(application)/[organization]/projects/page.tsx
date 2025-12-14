import type { Metadata } from "next";
import { RpcClient } from "@effect/rpc";
import { Folder01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Headers } from "@mcrovero/effect-nextjs/Headers";
import { decodeParamsUnknown } from "@mcrovero/effect-nextjs/Params";
import { ProjectsRPCContract } from "@saturn/contracts";
import { Effect, Schema } from "effect";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { InternalError } from "@/effect/errors";
import { ProtocolLive } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { BasePage } from "@/lib/runtime";
import {
  CreateProjectButton,
  CreateProjectTrigger,
} from "./_components/create-project-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/utils/date";

export const metadata: Metadata = {
  title: "Projects",
  description: "View and create projects",
};

const ProjectsPage = Effect.fn("ProjectsPage")((props) =>
  Effect.gen(function* () {
    const params = yield* decodeParamsUnknown(
      Schema.Struct({ organization: Schema.String }),
    )(props.params);

    const client = yield* RpcClient.make(ProjectsRPCContract);

    const requestHeaders = yield* Headers;
    const organization = yield* Effect.tryPromise({
      try: () =>
        authClient.organization.getFullOrganization({
          query: { organizationSlug: params.organization },
          fetchOptions: { headers: requestHeaders },
        }),
      catch: () =>
        new InternalError({ internalMessage: "Unable to fetch organization" }),
    });
    if (organization.error) {
      return yield* Effect.fail(
        new InternalError({
          internalMessage:
            organization.error.message ?? "Unable to fetch organization",
        }),
      );
    }
    const projects = yield* client.ListProjects(
      { organizationId: organization.data?.id },
      { headers: requestHeaders },
    );
    if (projects.length === 0) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              You haven&apos;t created any projects yet. Get started by creating
              your first project.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex gap-2">
              <CreateProjectTrigger organizationId={organization.data.id}>
                <Button nativeButton={false}>Create project</Button>
              </CreateProjectTrigger>
            </div>
          </EmptyContent>
        </Empty>
      );
    }
    return (
      <div className="w-full">
        <div className="flex flex-row items-center justify-between">
          <h1 className="font-bold text-3xl">Projects</h1>
          <CreateProjectButton organizationId={organization.data.id} />
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="flex flex-col transition-all hover:shadow-lg"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-balance text-xl">
                    {project.name}
                  </CardTitle>
                </div>
                {project.description && (
                  <CardDescription className="text-pretty">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="mt-auto">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" x2="16" y1="2" y2="6" />
                    <line x1="8" x2="8" y1="2" y2="6" />
                    <line x1="3" x2="21" y1="10" y2="10" />
                  </svg>
                  <time dateTime={project.createdAt.toISOString()}>
                    {formatDate(project.createdAt)}
                  </time>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }).pipe(
    Effect.catchTags({
      "@saturn/BetterAuthApiError": () =>
        Effect.succeed(<div>Internal Server Error</div>),
      ParseError: () => Effect.succeed(<div>Error decoding params</div>),
      "@saturn/Unauthorized": () => Effect.succeed(<div>Unauthorized</div>),
      "@saturn/InternalServerError": () =>
        Effect.succeed(<div>Internal server error</div>),
      RpcClientError: () => Effect.succeed(<div>RPC client error</div>),
      InternalError: (error) =>
        Effect.succeed(
          <div>
            Error decoding params:{" "}
            {process.env.NODE_ENV === "development"
              ? error.internalMessage
              : ""}
          </div>,
        ),
    }),
    Effect.scoped,
    Effect.provide(ProtocolLive),
  ),
);

export default BasePage.build(ProjectsPage);
