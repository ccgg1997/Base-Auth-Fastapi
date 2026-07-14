import { cookies } from "next/headers";

import {
  AUTH_COOKIE_NAME,
  AUTH_REQUEST_TIMEOUT_MS,
  getBackendUrl,
} from "@/lib/auth-config";

export type CurrentUser = {
  id: number;
  username: string;
  is_active: boolean;
};

export class AuthenticationServiceError extends Error {
  constructor() {
    super("El servicio de autenticación no está disponible.");
    this.name = "AuthenticationServiceError";
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${getBackendUrl()}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
    });

    if (response.status === 401 || response.status === 403) {
      return null;
    }

    if (!response.ok) {
      throw new AuthenticationServiceError();
    }

    const user: unknown = await response.json();

    if (
      typeof user !== "object" ||
      user === null ||
      !("id" in user) ||
      !("username" in user) ||
      !("is_active" in user) ||
      typeof user.id !== "number" ||
      typeof user.username !== "string" ||
      typeof user.is_active !== "boolean"
    ) {
      throw new AuthenticationServiceError();
    }

    if (!user.is_active) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      is_active: user.is_active,
    };
  } catch (error) {
    if (error instanceof AuthenticationServiceError) {
      throw error;
    }

    throw new AuthenticationServiceError();
  }
}
