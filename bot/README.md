# Bot de SaludPlus

Servicio independiente que usa Telegram como interfaz, OpenAI como LLM y la API
existente de SaludPlus como única fuente de datos. No importa código de las carpetas
`backend/` o `frontend/`.

## Configuración

1. Crea un bot con `@BotFather` en Telegram y copia el token.
2. Copia `.env.example` a `.env` (el repositorio ya incluye un `.env` vacío para completar).
3. Configura `BOT_TOKEN`, `OPENAI_API_KEY`, `API_USERNAME` y `API_PASSWORD`.
4. Inicia el bot una primera vez y ejecuta `/start` en Telegram. El bot mostrará el
   ID del chat; agrégalo a `BOT_ALLOWED_CHAT_IDS` y reinicia el servicio.

La cuenta indicada en `API_USERNAME` y `API_PASSWORD` debe existir y estar activa en
la API de SaludPlus. El bot obtiene un JWT mediante `/auth/token` y lo renueva cuando
vence.

## Ejecución con Docker

Con el backend principal disponible en `http://localhost:3000`:

```powershell
cd bot
docker compose up --build -d
docker compose logs -f bot
```

`API_BASE_URL=http://host.docker.internal:3000` permite que el contenedor aislado
consuma el puerto publicado por el backend. Para ejecutar el proceso directamente en
la máquina, cambia el valor a `http://localhost:3000`.

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
