"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type LoginProps = {
  initialError?: string;
};

export default function Login({ initialError = "" }: LoginProps) {
  const router = useRouter();
  const [error, setError] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      });
      const payload: { error?: string } | null = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? "No fue posible iniciar sesión.");
        return;
      }

      router.replace("/menu");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-neutral-primary-soft block max-w-sm rounded-2xl border border-default p-2 shadow-xs">
      <Image
        className="rounded-3xl"
        src="/Image.png"
        alt="Acceso a DockerC"
        width={400}
        height={300}
        priority
      />
      <div className="p-6 text-center">
        <form
          action="/api/auth/login"
          method="post"
          className="mx-auto max-w-sm"
          onSubmit={handleSubmit}
        >
          <div className="mb-5 text-start">
            <label
              htmlFor="username"
              className="mb-2.5 block text-sm font-medium text-heading"
            >
              Correo electrónico
            </label>
            <input
              type="email"
              id="username"
              name="username"
              autoComplete="username"
              className="block w-full rounded-base border border-default-medium bg-neutral-secondary-medium px-3 py-2.5 text-sm text-heading shadow-xs placeholder:text-body focus:border-brand focus:ring-brand"
              placeholder="nombre@correo.com"
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="mb-5 text-start">
            <label
              htmlFor="password"
              className="mb-2.5 block text-sm font-medium text-heading"
            >
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="current-password"
              className="block w-full rounded-base border border-default-medium bg-neutral-secondary-medium px-3 py-2.5 text-sm text-heading shadow-xs placeholder:text-body focus:border-brand focus:ring-brand"
              placeholder="••••••••"
              disabled={isSubmitting}
              required
            />
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="box-border rounded-base border border-transparent bg-brand px-4 py-2.5 text-sm font-medium leading-5 text-white shadow-xs hover:bg-brand-strong focus:outline-none focus:ring-4 focus:ring-brand-medium disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
