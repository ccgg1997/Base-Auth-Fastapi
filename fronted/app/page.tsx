import { redirect } from "next/navigation";

import Login from "./components/login";
import { getCurrentUser } from "@/lib/auth";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_request: "Ingresa un correo y una contraseña válidos.",
  invalid_credentials: "Correo o contraseña incorrectos.",
  account_inactive: "La cuenta está inactiva.",
  timeout: "El servidor tardó demasiado en responder. Intenta nuevamente.",
  service_unavailable: "El servicio de autenticación no está disponible.",
};

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);

  if ("username" in query || "password" in query) {
    redirect("/");
  }

  if (user) {
    redirect("/menu");
  }

  const errorCode =
    typeof query.auth_error === "string" ? query.auth_error : "";

  return (
    <div className="flex h-dvh flex-col items-center justify-center">
      <Login initialError={AUTH_ERROR_MESSAGES[errorCode]} />
    </div>
  );
}
