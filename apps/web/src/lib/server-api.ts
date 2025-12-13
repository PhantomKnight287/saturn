import { cookies } from "next/headers";
import createFetchClient from "openapi-fetch";

import type { paths } from "./api";

// Server-side API client
export async function createServerApiClient() {
  const cookieStore = await cookies();

  const key =
    process.env.NODE_ENV === "development"
      ? "better-auth.session_token"
      : "token_vault_.session_token";
  // Get session cookie for authentication
  const sessionCookie = cookieStore.get(`${key}`);
  const secureSessionCookie = cookieStore.get(`__Secure-${key}`);

  return createFetchClient<paths>({
    baseUrl: `${process.env.NEXT_PUBLIC_API_URL}`,
    credentials: "include",
    headers: {
      Cookie: secureSessionCookie
        ? `__Secure-${key}=${secureSessionCookie.value}`
        : sessionCookie
        ? `${key}=${sessionCookie.value}`
        : "",
    },
  });
}

// Generic server-side data fetcher
export async function fetchServerData<T>(
  method: "get" | "post" | "put" | "delete" | "patch",
  path: any,
  options?: {
    params?: Record<string, any>;
    body?: Record<string, unknown>;
  }
): Promise<T | null> {
  try {
    const client = await createServerApiClient();
    // biome-ignore lint/suspicious/noImplicitAnyLet: Idk
    let response;
    const requestOptions = options || {};

    switch (method) {
      case "get":
        response = await client.GET(path, requestOptions);
        break;
      case "post":
        response = await client.POST(path, requestOptions);
        break;
      case "put":
        //@ts-expect-error shush
        response = await client.PUT(path, requestOptions);
        break;
      case "delete":
        response = await client.DELETE(path, requestOptions);
        break;
      case "patch":
        response = await client.PATCH(path, requestOptions);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    if (response.error) {
      console.error(`Server API error for ${method} ${path}:`, response.error);
      return null;
    }

    return response.data as T;
  } catch (error) {
    console.error(`Server API error for ${method} ${path}:`, error);
    return null;
  }
}