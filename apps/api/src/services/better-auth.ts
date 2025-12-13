import { Effect, Runtime, Schema } from "effect";
import { auth } from "src/lib/auth.js";

export class BetterAuthApiError extends Schema.TaggedError<BetterAuthApiError>()(
  "@saturn/BetterAuthApiError",
  { cause: Schema.Unknown },
) {}

const ensureAbsoluteUrl = Effect.fn((input: string) => {
  try {
    return Effect.succeed(new URL(input).toString());
  } catch {
    const base = process.env.BETTER_AUTH_URL ?? "http://localhost:5000";
    return Effect.succeed(new URL(input, base).toString());
  }
});

export class BetterAuth extends Effect.Service<BetterAuth>()(
  "@saturn/api/better-auth",
  {
    effect: Effect.gen(function* () {
      const effectRuntime = yield* Effect.runtime<never>();
      const call = <Result>(
        f: (client: typeof auth, signal: AbortSignal) => Promise<Result>,
      ) =>
        Effect.tryPromise({
          try: (signal) => f(auth, signal),
          catch: (error) => {
            return new BetterAuthApiError({ cause: error });
          },
        });
      const handler = (request: Request) =>
        call((client) =>
          client.handler(
            new Request(
              Runtime.runSync(effectRuntime, ensureAbsoluteUrl(request.url)),
              request,
            ),
          ),
        );
      const getSession = (headers: Headers) =>
        call((client) => client.api.getSession({ headers }));

      const hasPermission = (
        parameters: Parameters<typeof auth.api.hasPermission>[0],
      ) => call((client) => client.api.hasPermission(parameters));
      return { handler, getSession, hasPermission };
    }),
  },
) {}
