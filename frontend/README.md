# SaludPlus frontend

Interfaz Next.js para autenticación, dashboard y gestión de pacientes.

## Docker Compose

Desde la raíz del repositorio, el frontend se construye y levanta junto con los
demás servicios:

```bash
docker compose up -d
```

La aplicación queda disponible en `http://localhost:3001`. Compose espera a que
el backend esté saludable antes de iniciar el frontend.

`NEXT_PUBLIC_API_URL` se incorpora al bundle durante el build. Para usar una URL
distinta, defínela en el `.env` de la raíz y reconstruye el servicio:

```bash
docker compose up --build -d frontend
```

## Desarrollo

Con el backend disponible en `http://localhost:3000`:

```bash
cp .env.example .env.local
npm ci
npm run dev
```

La aplicación queda disponible en `http://localhost:3001`, puerto autorizado por el CORS del backend.

`npm run dev` limpia primero la caché regenerable de `.next` para evitar manifiestos de componentes desactualizados entre compilaciones de producción y desarrollo.

Para apuntar a otra API, define en `.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://api.ejemplo.com
```

## Usuarios demo

- `admin.demo` / `Demo2026*`
- `operador.demo` / `Demo2026*`

Estos usuarios solo se crean cuando el backend arranca con `SEED_DEMO_DATA=true`.

## Verificación

```bash
npm run lint
npm run build
```

Si un proceso de desarrollo anterior quedó abierto, ciérralo antes de ejecutar nuevamente `npm run dev`.
