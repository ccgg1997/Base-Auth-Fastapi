import { NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  AUTH_REQUEST_TIMEOUT_MS,
  getBackendUrl,
} from "@/lib/auth-config";

type Credentials = {
  username: string;
  password: string;
};

function isHtmlForm(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  return (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  );
}

async function readCredentials(
  request: Request,
  htmlForm: boolean,
): Promise<Credentials | null> {
  try {
    if (htmlForm) {
      const formData = await request.formData();
      const username = formData.get("username");
      const password = formData.get("password");

      return {
        username: typeof username === "string" ? username.trim() : "",
        password: typeof password === "string" ? password : "",
      };
    }

    const payload: unknown = await request.json();

    if (typeof payload !== "object" || payload === null) {
      return null;
    }

    return {
      username:
        "username" in payload && typeof payload.username === "string"
          ? payload.username.trim()
          : "",
      password:
        "password" in payload && typeof payload.password === "string"
          ? payload.password
          : "",
    };
  } catch {
    return null;
  }
}

function errorResponse(
  request: Request,
  htmlForm: boolean,
  error: string,
  status: number,
  code: string,
) {
  if (htmlForm) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("auth_error", code);
    return NextResponse.redirect(loginUrl, 303);
  }

  return NextResponse.json({ error }, { status });
}

function getBackendError(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "detail" in payload &&
    typeof payload.detail === "string"
  ) {
    return payload.detail;
  }

  return "No fue posible iniciar sesión.";
}

export async function POST(request: Request) {
  const htmlForm = isHtmlForm(request);
  const credentials = await readCredentials(request, htmlForm);

  if (!credentials?.username || !credentials.password) {
    return errorResponse(
      request,
      htmlForm,
      "Ingresa tu correo y contraseña.",
      400,
      "invalid_request",
    );
  }

  if (credentials.username.length > 254 || credentials.password.length > 100) {
    return errorResponse(
      request,
      htmlForm,
      "El correo o la contraseña superan la longitud permitida.",
      400,
      "invalid_request",
    );
  }

  const formData = new URLSearchParams(credentials);
  let backendResponse: Response;

  try {
    backendResponse = await fetch(`${getBackendUrl()}/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
      cache: "no-store",
      signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");

    return errorResponse(
      request,
      htmlForm,
      timedOut
        ? "El servidor de autenticación tardó demasiado en responder."
        : "No se pudo conectar con el servidor de autenticación.",
      timedOut ? 504 : 503,
      timedOut ? "timeout" : "service_unavailable",
    );
  }

  const backendPayload: unknown = await backendResponse
    .json()
    .catch(() => null);

  if (!backendResponse.ok) {
    const errorCode =
      backendResponse.status === 403
        ? "account_inactive"
        : backendResponse.status < 500
          ? "invalid_credentials"
          : "service_unavailable";

    return errorResponse(
      request,
      htmlForm,
      getBackendError(backendPayload),
      backendResponse.status === 400 ? 401 : backendResponse.status,
      errorCode,
    );
  }

  if (
    typeof backendPayload !== "object" ||
    backendPayload === null ||
    !("access_token" in backendPayload) ||
    typeof backendPayload.access_token !== "string" ||
    !("expires_in" in backendPayload) ||
    typeof backendPayload.expires_in !== "number" ||
    !Number.isFinite(backendPayload.expires_in) ||
    backendPayload.expires_in <= 0
  ) {
    return errorResponse(
      request,
      htmlForm,
      "El servidor devolvió una sesión inválida.",
      502,
      "service_unavailable",
    );
  }

  const response = htmlForm
    ? NextResponse.redirect(new URL("/menu", request.url), 303)
    : NextResponse.json({ ok: true });

  response.cookies.set(AUTH_COOKIE_NAME, backendPayload.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(backendPayload.expires_in),
  });

  return response;
}
