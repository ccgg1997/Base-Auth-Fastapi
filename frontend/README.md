# SaludPlus frontend

Interfaz Next.js para autenticación, dashboard y gestión de pacientes.

## Desarrollo

Con el backend disponible en `http://localhost:3000`:

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:3001`, puerto autorizado por el CORS del backend.

Para apuntar a otra API, define:

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
