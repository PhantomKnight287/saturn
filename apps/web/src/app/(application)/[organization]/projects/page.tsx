import { RpcClient } from "@effect/rpc";
import { decodeParamsUnknown } from "@mcrovero/effect-nextjs/Params";
import { ProjectsRPCContract } from "@saturn/contracts";
import { Effect, Schema } from "effect";
import { headers } from "next/headers";
import { InternalError } from "@/effect/errors";
import { ProtocolLive } from "@/lib/api";
import { BasePage } from "@/lib/runtime";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Folder01Icon } from "@hugeicons/core-free-icons";
import { authClient } from "@/lib/auth-client";
import {
  CreateProjectButton,
  CreateProjectTrigger,
} from "./_components/create-project-dialog";
import { Headers } from "@mcrovero/effect-nextjs/Headers";

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
          <h1 className="text-3xl font-bold">Projects</h1>
          <CreateProjectButton organizationId={organization.data.id} />
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
