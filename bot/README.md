# Bot de SaludPlus

Servicio independiente que usa Telegram como interfaz, OpenAI como LLM y la API
existente de SaludPlus como única fuente de datos. No importa código de las carpetas
`backend/` o `frontend/`.

## Configuración

1. Crea un bot con `@BotFather` en Telegram y copia el token.
2. Copia `.env.example` a `.env`; los archivos `.env` reales no se versionan.
3. Configura `BOT_TOKEN`, `OPENAI_API_KEY`, `API_USERNAME` y `API_PASSWORD`.
4. Inicia el bot una primera vez y ejecuta `/start` en Telegram. El bot mostrará el
   ID del chat; agrégalo a `BOT_ALLOWED_CHAT_IDS`. Si usas Docker, recrea el
   contenedor para cargar el nuevo entorno.

La cuenta indicada en `API_USERNAME` y `API_PASSWORD` debe existir y estar activa en
la API de SaludPlus. El bot obtiene un JWT mediante `/auth/token` y lo renueva cuando
vence.

## Ejecución con Docker

El bot forma parte del `compose.yml` de la raíz. Configura
`API_BASE_URL=http://backend:4000` y ejecuta desde la raíz del repositorio:

```powershell
Copy-Item bot/.env.example bot/.env
# Edita bot/.env antes de continuar.
docker compose up --build -d bot
docker compose logs -f bot
```

Compose resuelve `backend` mediante su red interna y utiliza el puerto `4000` del
contenedor. Para ejecutar el proceso directamente en la máquina, cambia el valor a
`http://localhost:3000`.

Después de cambiar `bot/.env`, vuelve a crear el contenedor (un simple `restart` no
recarga `env_file`):

```powershell
docker compose up -d --force-recreate bot
```

## Ejecución local

```powershell
cd bot
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m src.main
```

## Comandos

- `/start`: muestra ayuda o el ID necesario para autorizar el chat.
- `/dashboard`: consulta las métricas del período configurado.
- `/pacientes`: lista pacientes obtenidos desde la API.
- `/buscar <texto>`: busca por nombre, documento, ciudad o EPS.
- Mensaje libre: combina dashboard y pacientes relevantes para responder con OpenAI.

El acceso es de solo lectura. Si `BOT_ALLOWED_CHAT_IDS` está vacío, el bot no entrega
información clínica o administrativa y únicamente muestra el ID del chat.
