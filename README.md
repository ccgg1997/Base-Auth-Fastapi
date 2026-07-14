# SaludPlus

Plataforma de gestión de pacientes compuesta por una API REST, una interfaz web y un bot de Telegram con asistencia de OpenAI. El repositorio incluye la infraestructura local necesaria para ejecutar PostgreSQL, pgAdmin, el backend y el bot mediante Docker Compose; el frontend se inicia por separado.

## Funcionalidades principales

- Autenticación con JWT, contraseñas con hash Argon2 y registro de intentos de acceso.
- Dashboard con métricas, filtros, tendencias y pacientes que requieren atención.
- Gestión de pacientes: búsqueda, paginación, creación, edición, baja lógica e importación CSV.
- Interfaz responsive con Next.js, TypeScript, Tailwind CSS y tema claro/oscuro.
- Bot de Telegram de solo lectura con comandos y preguntas en lenguaje natural.
- Datos de demostración opcionales para facilitar la ejecución local.
- Documentación interactiva de la API con Swagger UI y ReDoc.

## Vista previa

![Dashboard de pacientes de SaludPlus](mockups-data/mockup-fronted.png)

## Proyectos y servicios

| Componente | Ubicación | Responsabilidad | Ejecución | Puerto local |
| --- | --- | --- | --- | --- |
| Frontend | [`frontend/`](frontend/) | Login, dashboard y gestión de pacientes | Node.js, fuera de Compose | `3001` |
| Backend | [`backend/`](backend/) | API REST, autenticación, reglas de negocio y persistencia | Docker Compose o Python | `3000` → `4000` |
| Bot | [`bot/`](bot/) | Interfaz de Telegram y respuestas asistidas por OpenAI | Docker Compose o Python | No expone puerto |
| PostgreSQL | `bd` en [`compose.yml`](compose.yml) | Base de datos relacional | Docker Compose | `5432` |
| pgAdmin | `bdcli` en [`compose.yml`](compose.yml) | Administración local de PostgreSQL | Docker Compose | `8080` |

El frontend y el bot son clientes independientes del backend; no se comunican directamente entre sí.

## Arquitectura

```mermaid
flowchart LR
    Web[Usuario web] -->|HTTP :3001| Front[Next.js]
    Front -->|REST + JWT<br/>localhost:3000| API[FastAPI<br/>contenedor :4000]

    Telegram[Usuario de Telegram] <--> TG[Telegram Bot API]
    TG <--> Bot[Bot SaludPlus]
    Bot -->|REST + JWT<br/>backend:4000| API
    Bot -->|Preguntas en lenguaje natural| OpenAI[OpenAI API]

    API -->|SQLAlchemy| DB[(PostgreSQL :5432)]
    Admin[pgAdmin :8080] --> DB
```

### Capas del backend

```text
HTTP request
    │
    ▼
routers/        Endpoints de auth, dashboard, pacientes, productos y administración
    │
    ├── dependencies/   Validación del Bearer JWT y usuario actual
    ├── dtos/           Contratos de entrada y salida con Pydantic
    └── models/         Entidades y relaciones de SQLAlchemy
                         │
                         ▼
                    db/ + PostgreSQL
```

Al iniciar, el backend crea las tablas faltantes con SQLAlchemy y, si `SEED_DEMO_DATA=true`, agrega los roles y usuarios demo que aún no existan. El proyecto no incluye migraciones de base de datos.

## Tecnologías

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4 y Axios.
- **Backend:** Python 3.10, FastAPI, SQLAlchemy, Pydantic, PyJWT y Argon2.
- **Bot:** Python 3.12, `python-telegram-bot`, OpenAI SDK y HTTPX.
- **Infraestructura:** Docker Compose, PostgreSQL 16 y pgAdmin 4.

## Requisitos previos

Para la ejecución recomendada se necesita:

- Git.
- Docker Engine o Docker Desktop con Docker Compose v2.
- Node.js `20.9` o superior y npm para el frontend.
- Un token de Telegram y una API key de OpenAI únicamente si se va a iniciar el bot.

Python solo es necesario cuando se ejecuta el backend o el bot fuera de Docker.

## Inicio rápido

### 1. Clonar el repositorio

```bash
git clone https://github.com/ccgg1997/docker-c.git
cd docker-c
```

### 2. Crear los archivos de entorno

Los archivos `.env` reales están ignorados por Git. Copia las plantillas y edita únicamente las copias.

PowerShell:

```powershell
if (-not (Test-Path .env)) { Copy-Item .envexample .env }
if (-not (Test-Path bot/.env)) { Copy-Item bot/.env.example bot/.env }
if (-not (Test-Path frontend/.env.local)) { Copy-Item frontend/.env.example frontend/.env.local }
```

macOS o Linux:

```bash
cp -n .envexample .env
cp -n bot/.env.example bot/.env
cp -n frontend/.env.example frontend/.env.local
```

Para generar `JWT_SECRET_KEY` puede usarse, por ejemplo:

```bash
openssl rand -hex 32
```

### 3. Levantar la API y la infraestructura

Levantar todos los servicios:

```bash
docker compose up --build -d 
docker compose ps
```

### 4. Ejecutar el frontend

El frontend **no forma parte de `compose.yml`**. En otra terminal:

```bash
cd frontend
npm ci
npm run dev
```

Abre [http://localhost:3001](http://localhost:3001).

Para comprobar el build de producción local:

```bash
npm run build
npm run start
```

### 5. Iniciar el bot opcional

Completa como mínimo `BOT_TOKEN`, `OPENAI_API_KEY`, `API_USERNAME` y `API_PASSWORD` en `bot/.env`. Después ejecuta desde la raíz:

```bash
docker compose up --build -d bot
docker compose logs -f bot
```

También se puede levantar todo el Compose de una vez cuando el bot ya está configurado:

```bash
docker compose up --build -d
```

En Telegram, envía `/start`. Si `BOT_ALLOWED_CHAT_IDS` está vacío, el bot mostrará el ID del chat sin revelar datos. Agrégalo a `bot/.env` —varios IDs se separan con comas— y recrea el contenedor para cargar el nuevo entorno:

```bash
docker compose up -d --force-recreate bot
```

## URLs locales

| Servicio | URL |
| --- | --- |
| Aplicación web | [http://localhost:3001](http://localhost:3001) |
| API | [http://localhost:3000](http://localhost:3000) |
| Swagger UI | [http://localhost:3000/docs](http://localhost:3000/docs) |
| ReDoc | [http://localhost:3000/redoc](http://localhost:3000/redoc) |
| pgAdmin | [http://localhost:8080](http://localhost:8080) |
| PostgreSQL | `localhost:5432` |

Para registrar el servidor en pgAdmin desde su contenedor usa `bd` como host, `5432` como puerto y las credenciales definidas en `.env`.

## Variables de entorno

### Infraestructura y backend — `.env`

La plantilla versionada es [`.envexample`](.envexample).

| Variable | Requerida | Valor de ejemplo/default | Propósito |
| --- | --- | --- | --- |
| `POSTGRES_USER` | Sí | `saludplus` | Usuario de PostgreSQL. |
| `POSTGRES_PASSWORD` | Sí | `change-this-password` | Contraseña de PostgreSQL. Debe cambiarse. |
| `POSTGRES_DB` | No | `fsdb` | Base creada y utilizada por el backend. |
| `PGADMIN_DEFAULT_EMAIL` | Sí | `admin@saludplus.local` | Usuario de acceso a pgAdmin. |
| `PGADMIN_DEFAULT_PASSWORD` | Sí | `change-this-password` | Contraseña de acceso a pgAdmin. Debe cambiarse. |
| `JWT_SECRET_KEY` | Sí | Sin valor seguro predefinido | Firma los tokens JWT de la API. |
| `SEED_DEMO_DATA` | No | `true` en Compose | Crea roles y usuarios demo de forma idempotente. |

El backend también admite `JWT_ALGORITHM` (`HS256`) y `ACCESS_TOKEN_EXPIRE_MINUTES` (`30`) cuando se ejecuta directamente.

### Bot — `bot/.env`

La plantilla versionada es [`bot/.env.example`](bot/.env.example).

| Variable | Requerida | Valor de plantilla | Propósito |
| --- | --- | --- | --- |
| `BOT_TOKEN` | Sí | — | Token privado entregado por `@BotFather`. |
| `OPENAI_API_KEY` | Sí | — | Credencial privada de OpenAI. |
| `OPENAI_MODEL` | No | `gpt-5.4-mini` | Modelo usado para preguntas en lenguaje natural. |
| `API_BASE_URL` | No | `http://backend:4000` | Dirección interna del backend en Compose. |
| `API_USERNAME` | Sí | — | Usuario con el que el bot obtiene su JWT. |
| `API_PASSWORD` | Sí | — | Contraseña del usuario anterior. |
| `BOT_ALLOWED_CHAT_IDS` | Recomendado | Vacío | Lista de chats autorizados; vacío bloquea el acceso a datos. |
| `BOT_DASHBOARD_DAYS` | No | `30` | Días incluidos en las métricas (`1`–`365`). |
| `BOT_PATIENT_LIMIT` | No | `100` | Máximo de pacientes consultados (`1`–`500`). |
| `BOT_MAX_OUTPUT_TOKENS` | No | `700` | Límite de respuesta del modelo (`100`–`4000`). |

Al ejecutar el bot directamente en el host, cambia `API_BASE_URL` a `http://localhost:3000`.

### Frontend — `frontend/.env.local`

La plantilla versionada es [`frontend/.env.example`](frontend/.env.example).

| Variable | Requerida | Default | Propósito |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3000` | URL de la API consumida desde el navegador. |

Las variables que comienzan con `NEXT_PUBLIC_` son públicas y se incorporan al bundle del navegador. No guardes secretos en ellas.

## Usuarios de demostración

Con `SEED_DEMO_DATA=true` están disponibles únicamente para desarrollo:

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Administrador | `admin.demo` | `Demo2026*` |
| Operador | `operador.demo` | `Demo2026*` |

Estas credenciales no deben habilitarse en un entorno público. Para producción usa `SEED_DEMO_DATA=false` y crea usuarios con credenciales propias.

## API y flujos

Todos los módulos funcionales, excepto la obtención inicial de credenciales y el registro actual, utilizan autenticación Bearer JWT.

| Módulo | Rutas principales | Uso |
| --- | --- | --- |
| Autenticación | `/auth/token`, `/auth/me`, `/auth/register` | Login, sesión y alta de usuarios. |
| Dashboard | `/dashboard` | Métricas y filtros por período. |
| Pacientes | `/pacientes/`, `/pacientes/importar-csv` | CRUD, listado paginado e importación. |
| Administración | `/roles/`, `/usuarios/`, `/registros-login/` | Roles, usuarios y auditoría de accesos. |
| Productos | `/v2/` | Creación, consulta y eliminación autenticadas. |

El flujo web es: credenciales → `POST /auth/token` → cookie con JWT → interceptor Axios → rutas protegidas. El bot realiza el mismo login con su cuenta de API, renueva el token cuando es necesario y solo ejecuta consultas.

## Comandos del bot

| Comando | Acción |
| --- | --- |
| `/start` | Muestra la ayuda o el ID necesario para autorizar el chat. |
| `/dashboard` | Resume las métricas del período configurado. |
| `/pacientes` | Lista pacientes recientes. |
| `/buscar <texto>` | Busca por nombre, documento, ciudad o EPS. |
| Mensaje libre | Consulta dashboard y pacientes relevantes para responder con OpenAI. |

## Ejecución local sin Docker

### Backend

Inicia PostgreSQL, instala las dependencias y define las variables antes de levantar Uvicorn. Este ejemplo usa PowerShell y el puerto esperado por el frontend:

```powershell
docker compose up -d bd
Set-Location backend
py -3.10 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$settings = @{}
Get-Content ../.env | Where-Object { $_ -match '^[^#][^=]*=' } | ForEach-Object {
    $name, $value = $_ -split '=', 2
    $settings[$name.Trim()] = $value.Trim()
}
$dbUser = [uri]::EscapeDataString($settings['POSTGRES_USER'])
$dbPassword = [uri]::EscapeDataString($settings['POSTGRES_PASSWORD'])
$dbName = [uri]::EscapeDataString($settings['POSTGRES_DB'])
$env:DATABASE_URL = "postgresql://${dbUser}:${dbPassword}@localhost:5432/${dbName}"
$env:JWT_SECRET_KEY = $settings['JWT_SECRET_KEY']
$env:SEED_DEMO_DATA = $settings['SEED_DEMO_DATA']
uvicorn src.main:app --host 0.0.0.0 --port 3000 --reload
```

En macOS o Linux activa el entorno con `source .venv/bin/activate` y define las variables con `export`.

### Bot

Con la API disponible en `http://localhost:3000`:

```powershell
Set-Location bot
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Edita .env y usa API_BASE_URL=http://localhost:3000
python -m src.main
```

## Verificación y calidad

```bash
# Validar el Compose sin imprimir las variables resueltas
docker compose config --quiet

# Pruebas unitarias del bot (con su entorno virtual activo)
cd bot
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v

# Calidad y build del frontend
cd ../frontend
npm run lint
npm run build
```

Actualmente el repositorio contiene pruebas unitarias para los helpers del bot; el backend y el frontend aún no cuentan con suites automatizadas.

## Operación con Docker

```bash
# Estado
docker compose ps

# Logs de todos los servicios
docker compose logs -f

# Logs específicos
docker compose logs -f backend bot

# Reconstruir un servicio
docker compose up --build -d backend

# Detener y conservar los datos
docker compose down
```

`docker compose down -v` elimina permanentemente el volumen de PostgreSQL y todos sus datos. Úsalo solo cuando realmente quieras reinicializar la base.

## Estructura del repositorio

```text
.
├── backend/
│   ├── src/
│   │   ├── core/          # Configuración y seguridad
│   │   ├── db/            # Sesión, base y datos demo
│   │   ├── dependencies/  # Dependencias de autenticación
│   │   ├── dtos/          # Esquemas Pydantic
│   │   ├── models/        # Modelos SQLAlchemy
│   │   └── routers/       # Endpoints FastAPI
│   ├── backend.Dockerfile
│   └── requirements.txt
├── bot/
│   ├── src/               # Handlers, cliente API y asistente OpenAI
│   ├── tests/             # Pruebas unitarias
│   ├── .env.example
│   └── bot.Dockerfile
├── frontend/
│   ├── app/               # Rutas del App Router
│   ├── components/        # Shell, tema y componentes UI
│   ├── lib/               # Cliente API, auth y tipos
│   └── public/            # Recursos estáticos
├── mockups-data/          # Mockups, datos sintéticos y material de referencia
├── compose.yml
└── .envexample
```

## Solución de problemas

| Problema | Revisión recomendada |
| --- | --- |
| El frontend no conecta con la API | Confirma que el backend esté en `localhost:3000` y revisa `NEXT_PUBLIC_API_URL`. Reinicia el build si cambiaste una variable pública. |
| El bot no conecta con la API | Usa `http://backend:4000` dentro de Compose y `http://localhost:3000` al ejecutarlo directamente. |
| El bot rechaza las credenciales | Verifica `API_USERNAME`, `API_PASSWORD` y que el usuario exista y esté activo. |
| El bot solo muestra el chat ID | Es el comportamiento seguro esperado; agrega el ID a `BOT_ALLOWED_CHAT_IDS` y reinicia el bot. |
| PostgreSQL conserva credenciales anteriores | Las variables de inicialización no cambian un volumen ya creado. Conserva las credenciales originales o reinicializa el volumen sabiendo que se perderán los datos. |
| Un puerto ya está ocupado | Libera o cambia el mapeo de `3000`, `3001`, `5432` o `8080`, y ajusta las URLs/CORS cuando corresponda. |

## Seguridad y uso responsable

- No subas `.env`, tokens, contraseñas, API keys ni datos clínicos reales al repositorio.
- Cambia todos los valores de ejemplo, genera un `JWT_SECRET_KEY` robusto y desactiva `SEED_DEMO_DATA` fuera de desarrollo.
- Mantén `BOT_ALLOWED_CHAT_IDS` como lista explícita. El token de Telegram debe tratarse como una contraseña.
- Las preguntas libres del bot envían a OpenAI el contexto seleccionado del dashboard y de pacientes. Úsalo solo cuando las políticas, autorizaciones y acuerdos de tratamiento de datos aplicables lo permitan.
- El Compose incluido usa recarga automática, montaje del código y pgAdmin; está orientado al desarrollo local, no a un despliegue de producción.
- Antes de publicar la API, restringe CORS, protege el aprovisionamiento de usuarios, añade migraciones y revisa la exposición de puertos y logs.

## Documentación adicional

- [Documentación del bot](bot/README.md)
- [Documentación del frontend](frontend/README.md)

## Soporte y contribuciones

Para reportar un error o proponer una mejora, abre un [issue en GitHub](https://github.com/ccgg1997/docker-c/issues) con los pasos para reproducirlo. Antes de enviar un pull request, valida el Compose, ejecuta las pruebas del bot y comprueba `npm run lint` y `npm run build` en el frontend.

Como referencia para las herramientas utilizadas, consulta la documentación oficial de [Docker Compose](https://docs.docker.com/compose/), [Next.js](https://nextjs.org/docs/app/getting-started/installation), [FastAPI](https://fastapi.tiangolo.com/tutorial/), [Telegram Bots](https://core.telegram.org/bots/tutorial) y la [API de OpenAI](https://platform.openai.com/docs/quickstart).
