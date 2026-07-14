"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Brand, Icon } from "@/components/icons";
import { Button, Input } from "@/components/ui";
import { api } from "@/lib/api";
import { getToken, saveToken } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

type TokenResponse = { access_token: string; token_type: string; expires_in: number };

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) return;
    api.get("/auth/me").then(() => router.replace("/dashboard")).catch(() => undefined);
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = new URLSearchParams({ username, password });
      const { data } = await api.post<TokenResponse>("/auth/token", body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      saveToken(data.access_token, data.expires_in);
      router.replace("/dashboard");
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && [400, 401, 403].includes(requestError.response?.status ?? 0)) {
        setError("Credenciales erróneas.");
      } else {
        setError("No fue posible conectar con el servidor. Inténtalo nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid h-dvh overflow-hidden bg-card lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 -top-28 size-80 rounded-full bg-primary-foreground/10" />
        <div className="absolute -bottom-52 -right-52 size-[32rem] rounded-full border-[5rem] border-primary-foreground opacity-10" />
        <div className="relative [&_small]:text-primary-foreground/70"><Brand /></div>
        <div className="relative z-10 max-w-xl space-y-6">
          <span className="grid size-16 place-items-center rounded-2xl bg-primary-foreground/15 backdrop-blur">
            <Icon name="heart" className="size-9" />
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">Cuidar mejor empieza con información clara.</h1>
          <p className="max-w-lg text-lg leading-8 text-primary-foreground/75">Consulta indicadores, prioriza la atención y administra la información de tus pacientes desde un único lugar.</p>
        </div>
        <p className="relative text-sm text-primary-foreground/60">Plataforma segura de gestión clínica</p>
      </section>

      <section className="relative flex h-dvh items-center justify-center overflow-y-auto bg-background px-5 py-8 sm:px-10">
        <ThemeToggle className="absolute right-4 top-4" />
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-10 lg:hidden"><Brand /></div>
          <div className="mb-8 space-y-2">
            <p className="text-sm font-semibold text-primary">BIENVENIDO</p>
            <h2 className="text-3xl font-bold tracking-tight">Inicia sesión</h2>
            <p className="text-muted-foreground">Ingresa tus credenciales para acceder a SaludPlus.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-semibold">Usuario</label>
              <div className="relative">
                <Icon name="user" className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input id="username" name="username" autoComplete="username" placeholder="Tu nombre de usuario" required value={username} onChange={(event) => setUsername(event.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold">Contraseña</label>
              <div className="relative">
                <Icon name="shield" className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Tu contraseña" required value={password} onChange={(event) => setPassword(event.target.value)} className="px-10" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  <Icon name="eye" className="size-5" />
                </button>
              </div>
            </div>

            {error && <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm font-medium text-destructive">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={loading || !username || !password}>
              {loading ? <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" /> : <Icon name="logout" className="size-4 rotate-180" />}
              {loading ? "Verificando…" : "Ingresar"}
            </Button>
          </form>
          <p className="mt-8 text-center text-xs text-muted-foreground">El acceso está protegido y sujeto a auditoría.</p>
        </div>
      </section>
    </main>
  );
}
