# Documentación del proyecto DockerC

Este documento reúne las fuentes oficiales relacionadas con la estructura y las tecnologías utilizadas en el proyecto. Su objetivo es indicar dónde consultar cada concepto y qué parte del backend se relaciona con esa documentación.

## Mapa de archivos y documentación

| Archivo o sección | Responsabilidad | Documentación oficial |
|---|---|---|
| `backend/src/main.py` | Crear la aplicación e incluir routers | [Aplicaciones grandes con varios archivos](https://fastapi.tiangolo.com/tutorial/bigger-applications/) |
| `backend/src/routers/auth.py` | Registro, login y consulta del usuario actual | [OAuth2 con contraseña y JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/) |
| `backend/src/dependencies/auth.py` | Validar el Bearer token y obtener el usuario autenticado | [Sistema de dependencias de FastAPI](https://fastapi.tiangolo.com/tutorial/dependencies/) y [herramientas de seguridad](https://fastapi.tiangolo.com/reference/security/) |
| `backend/src/core/security.py` | Hash de contraseñas y creación/validación de JWT | [PyJWT](https://pyjwt.readthedocs.io/en/stable/usage.html) y [pwdlib](https://frankie567.github.io/pwdlib/) |
| `backend/src/core/config.py` | Variables de entorno y configuración | [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) |
| `backend/src/db/base.py` | Base declarativa y metadatos de SQLAlchemy | [Mapeo declarativo](https://docs.sqlalchemy.org/en/20/orm/declarative_mapping.html) y [MetaData](https://docs.sqlalchemy.org/en/20/core/metadata.html) |
| `backend/src/db/session.py` | Engine, conexión y sesiones de base de datos | [Configuración del Engine](https://docs.sqlalchemy.org/en/20/core/engines.html) y [uso de Session](https://docs.sqlalchemy.org/en/20/orm/session_basics.html) |
| `backend/src/models/` | Tablas y columnas de PostgreSQL | [Mapeo de clases ORM](https://docs.sqlalchemy.org/en/20/orm/declarative_mapping.html) |
| `backend/src/dtos/` | DTOs para validación de entrada y serialización de salida | [Modelos de Pydantic](https://docs.pydantic.dev/latest/concepts/models/) |
| `backend/src/routers/producto.py` | Endpoints CRUD de productos | [APIRouter y aplicaciones con varios archivos](https://fastapi.tiangolo.com/tutorial/bigger-applications/) |
| `backend/requirements.txt` | Dependencias Python | [Instalación de FastAPI](https://fastapi.tiangolo.com/#installation) |
| `backend/backend.Dockerfile` | Construcción de la imagen del backend | [Referencia de Dockerfile](https://docs.docker.com/reference/dockerfile/) |
| `compose.yml` | Servicios, variables, red y volúmenes | [Referencia de Docker Compose](https://docs.docker.com/reference/compose-file/) |

## FastAPI

FastAPI es el framework que recibe las solicitudes HTTP, valida los parámetros, ejecuta las dependencias y genera la documentación OpenAPI. La introducción general se encuentra en la [documentación oficial de FastAPI](https://fastapi.tiangolo.com/).

La separación entre `main.py`, `routers`, `dependencies`, `dtos` y otros módulos sigue la guía de [aplicaciones grandes con múltiples archivos](https://fastapi.tiangolo.com/tutorial/bigger-applications/).

Los routers de autenticación y productos utilizan `APIRouter`. Su funcionamiento, prefijos, tags, dependencias e inclusión dentro de la aplicación se explica en la [guía de APIRouter](https://fastapi.tiangolo.com/tutorial/bigger-applications/#apirouter).

El uso de `Depends()` para proporcionar una sesión de base de datos o un usuario autenticado se basa en el [sistema de inyección de dependencias de FastAPI](https://fastapi.tiangolo.com/tutorial/dependencies/).

Las excepciones como `HTTPException(status_code=401)` o `HTTPException(status_code=404)` se documentan en el apartado de [manejo de errores de FastAPI](https://fastapi.tiangolo.com/tutorial/handling-errors/).

## Autenticación y JWT

La implementación de registro, login, Bearer tokens y usuario actual sigue la [documentación actual de OAuth2 con JWT de FastAPI](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/).

### `POST /auth/register`

Este endpoint recibe un modelo de Pydantic con `username` y `password`. La contraseña se transforma en un hash antes de almacenarse. La definición y validación del body se basa en la documentación de [cuerpos de solicitud de FastAPI](https://fastapi.tiangolo.com/tutorial/body/) y en los [modelos de Pydantic](https://docs.pydantic.dev/latest/concepts/models/).

El hash recomendado se genera con `PasswordHash.recommended()` de pwdlib. La librería y sus algoritmos se encuentran en la [documentación oficial de pwdlib](https://frankie567.github.io/pwdlib/).

### `POST /auth/token`

Este endpoint recibe `username` y `password` con `OAuth2PasswordRequestForm`. FastAPI exige que estos campos se envíen como formulario `application/x-www-form-urlencoded`, no como JSON. El flujo se explica en [OAuth2 simple con contraseña y Bearer](https://fastapi.tiangolo.com/tutorial/security/simple-oauth2/) y en la documentación para [recibir formularios](https://fastapi.tiangolo.com/tutorial/request-forms/).

`python-multipart` es necesario para que FastAPI pueda procesar datos de formulario. Su necesidad está indicada en la guía de [formularios de FastAPI](https://fastapi.tiangolo.com/tutorial/request-forms/).

Cuando las credenciales son correctas, el backend genera un access token. La creación mediante `jwt.encode()`, la lectura mediante `jwt.decode()` y la validación de `exp`, `iat` y otros claims se encuentran en los [ejemplos oficiales de PyJWT](https://pyjwt.readthedocs.io/en/stable/usage.html).

### `GET /auth/me`

Este endpoint utiliza `Depends(get_current_user)` para obtener el usuario identificado por el JWT. El patrón completo está explicado en [obtener el usuario actual con FastAPI](https://fastapi.tiangolo.com/tutorial/security/get-current-user/) y en la guía de [OAuth2 con JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/).

`/auth/me` es el nombre elegido dentro de este proyecto. Su equivalente conceptual en la documentación de FastAPI es la operación que obtiene el usuario actual mediante la dependencia `get_current_user`.

El token debe enviarse así:

```http
Authorization: Bearer <access_token>
```

`OAuth2PasswordBearer` extrae el token del header y registra el esquema de seguridad dentro de OpenAPI. Su API se encuentra en la [referencia de herramientas de seguridad de FastAPI](https://fastapi.tiangolo.com/reference/security/#fastapi.security.OAuth2PasswordBearer).

### `core/security.py`

Las funciones `hash_password()` y `verify_password()` se basan en la [documentación de pwdlib](https://frankie567.github.io/pwdlib/).

Las funciones `create_access_token()` y `decode_access_token()` se basan en la [documentación de uso de PyJWT](https://pyjwt.readthedocs.io/en/stable/usage.html) y en su [referencia de API](https://pyjwt.readthedocs.io/en/stable/api.html).

Los JWT están firmados, pero su contenido no está cifrado. La explicación de esta diferencia y el uso del claim `sub` están incluidos en el [tutorial JWT de FastAPI](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/#about-jwt).

## Base de datos y SQLAlchemy

SQLAlchemy es la capa utilizada para definir tablas como clases de Python, abrir sesiones y ejecutar operaciones contra PostgreSQL. La entrada principal está en la [documentación oficial de SQLAlchemy ORM](https://docs.sqlalchemy.org/en/20/orm/).

### `db/base.py`

La base declarativa registra los modelos y mantiene el objeto `MetaData`. El patrón se explica en [mapeo declarativo con SQLAlchemy](https://docs.sqlalchemy.org/en/20/orm/declarative_mapping.html).

`Base.metadata.create_all()` crea las tablas que todavía no existen. Su comportamiento está documentado en [crear y eliminar tablas con MetaData](https://docs.sqlalchemy.org/en/20/core/metadata.html#creating-and-dropping-database-tables).

`create_all()` no sustituye un sistema de migraciones para modificar columnas existentes. Para versionar cambios de esquema, la herramienta oficial del ecosistema SQLAlchemy es [Alembic](https://alembic.sqlalchemy.org/en/latest/).

### `db/session.py`

`create_engine()` interpreta la URL de conexión y selecciona el dialecto y driver de la base de datos. El formato `dialect+driver://...` está explicado en [configuración del Engine de SQLAlchemy](https://docs.sqlalchemy.org/en/20/core/engines.html#database-urls).

`sessionmaker()` crea las sesiones utilizadas en cada solicitud. El ciclo `add`, `commit`, `rollback`, `refresh` y `close` se explica en [Session Basics](https://docs.sqlalchemy.org/en/20/orm/session_basics.html).

La función `get_db()` es una dependencia con `yield`. FastAPI documenta este patrón en [dependencias con yield](https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/).

### PostgreSQL y psycopg2

La URL `postgresql://...` hace que SQLAlchemy seleccione su dialecto de PostgreSQL. Las opciones específicas, tipos y drivers compatibles se encuentran en la [documentación del dialecto PostgreSQL de SQLAlchemy](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html).

`psycopg2-binary` proporciona el driver Python que establece la conexión real con PostgreSQL. Su instalación está documentada en la [guía oficial de instalación de Psycopg2](https://www.psycopg.org/docs/install.html#quick-install) y su API en la [documentación oficial de Psycopg](https://www.psycopg.org/docs/).

Los tipos, consultas y características propias del servidor se encuentran en la [documentación oficial de PostgreSQL](https://www.postgresql.org/docs/current/).

### Modelos ORM

Las clases `Producto`, `City` y `User` representan tablas mediante el mapeo declarativo. Las columnas, claves primarias, claves foráneas y restricciones se documentan en [mapeo declarativo](https://docs.sqlalchemy.org/en/20/orm/declarative_mapping.html) y en [tipos de columnas](https://docs.sqlalchemy.org/en/20/core/type_basics.html).

Las relaciones entre tablas mediante `ForeignKey` y `relationship()` se explican en los [patrones básicos de relaciones de SQLAlchemy](https://docs.sqlalchemy.org/en/20/orm/basic_relationships.html).

El campo `tags` utiliza el tipo genérico `JSON`. Los tipos genéricos y su adaptación según el motor están descritos en la [jerarquía de tipos de SQLAlchemy](https://docs.sqlalchemy.org/en/20/core/type_basics.html).

`MutableList.as_mutable(JSON)` permite detectar modificaciones realizadas dentro de una lista JSON. Este comportamiento está documentado en [Mutation Tracking de SQLAlchemy](https://docs.sqlalchemy.org/en/20/orm/extensions/mutable.html).

Las operaciones modernas de consulta mediante `select()` y `Session.execute()` se explican en la [guía de selección de datos del ORM](https://docs.sqlalchemy.org/en/20/orm/queryguide/select.html).

## DTOs y Pydantic

Los archivos dentro de `backend/src/dtos/` describen los datos que entran y salen de la API. En este proyecto se llaman DTOs, pero técnicamente son modelos de Pydantic. Su funcionamiento se basa en los [modelos de Pydantic](https://docs.pydantic.dev/latest/concepts/models/).

`Field(default_factory=list)` crea una lista nueva para cada instancia y se documenta en los [campos de Pydantic](https://docs.pydantic.dev/latest/concepts/fields/#default-values).

`ConfigDict(from_attributes=True)` permite construir una respuesta de Pydantic a partir de un objeto ORM. Esta opción está explicada en la [referencia de configuración de Pydantic](https://docs.pydantic.dev/latest/api/config/#pydantic.config.ConfigDict.from_attributes).

La validación mediante `response_model` y la exclusión de campos sensibles, como `password_hash`, se explican en la documentación de [modelos de respuesta de FastAPI](https://fastapi.tiangolo.com/tutorial/response-model/).

## Configuración y variables de entorno

`pydantic-settings` permite cargar `database_url`, `jwt_secret_key` y otras opciones desde variables de entorno. Su comportamiento está documentado en [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/).

La clave JWT debe proporcionarse mediante el entorno y no escribirse directamente en el código. El tutorial de FastAPI muestra cómo [generar y usar una clave secreta](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/#handle-jwt-tokens).

Docker Compose lee valores del archivo `.env` y los sustituye en `compose.yml`. Las reglas están descritas en [interpolación de variables de Docker Compose](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/).

## Docker y Docker Compose

El archivo `backend/backend.Dockerfile` sigue las instrucciones descritas en la [referencia oficial de Dockerfile](https://docs.docker.com/reference/dockerfile/).

El archivo `compose.yml` define los servicios `backend`, `bd` y `bdcli`. La estructura de servicios, puertos, dependencias y volúmenes se encuentra en la [referencia del archivo Compose](https://docs.docker.com/reference/compose-file/).

La opción `build` y la reconstrucción de imágenes se explican en la documentación de [docker compose build](https://docs.docker.com/reference/cli/docker/compose/build/) y [docker compose up](https://docs.docker.com/reference/cli/docker/compose/up/).

El volumen `pgdata` conserva la información de PostgreSQL aunque se eliminen los contenedores. El funcionamiento de los volúmenes se encuentra en [volúmenes de Docker Compose](https://docs.docker.com/reference/compose-file/volumes/).

`docker compose down` conserva los volúmenes nombrados. `docker compose down -v` también los elimina y, por tanto, borra los datos persistidos. Este comportamiento se documenta en [docker compose down](https://docs.docker.com/reference/cli/docker/compose/down/).

El `healthcheck` de PostgreSQL y las condiciones de `depends_on` se documentan en la referencia de [servicios de Docker Compose](https://docs.docker.com/reference/compose-file/services/).

## Uvicorn

Uvicorn es el servidor ASGI que ejecuta la aplicación FastAPI. Sus opciones `--host`, `--port` y `--reload` se encuentran en la [documentación de configuración de Uvicorn](https://www.uvicorn.org/settings/).

La ejecución de FastAPI dentro de contenedores está explicada en la guía oficial de [FastAPI en contenedores Docker](https://fastapi.tiangolo.com/deployment/docker/).

## CORS y el futuro frontend Next.js

Cuando Next.js y FastAPI se ejecutan en orígenes diferentes, el navegador aplica CORS. FastAPI explica cómo configurar `CORSMiddleware` y por qué conviene declarar explícitamente los orígenes permitidos en la [documentación oficial de CORS](https://fastapi.tiangolo.com/tutorial/cors/).

Para el futuro frontend, Next.js documenta el manejo de autenticación del lado del servidor en su [guía de autenticación](https://nextjs.org/docs/app/guides/authentication).

El almacenamiento de un token en una cookie con `HttpOnly`, `Secure` y `SameSite` se explica en la [API de cookies de Next.js](https://nextjs.org/docs/app/api-reference/functions/cookies).

Los endpoints intermedios que comuniquen Next.js con FastAPI pueden implementarse mediante [Route Handlers de Next.js](https://nextjs.org/docs/app/getting-started/route-handlers).

## Referencias rápidas

- Estas son las librerías utilizadas por la [documentación actual de FastAPI para OAuth2 y JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/). `python-multipart` es necesario para [recibir formularios](https://fastapi.tiangolo.com/tutorial/request-forms/).
- La autenticación con `OAuth2PasswordBearer` se encuentra en las [herramientas de seguridad de FastAPI](https://fastapi.tiangolo.com/reference/security/).
- La generación y validación del token se encuentra en la [documentación de PyJWT](https://pyjwt.readthedocs.io/en/stable/usage.html).
- El hash Argon2id se gestiona mediante la [documentación de pwdlib](https://frankie567.github.io/pwdlib/).
- La conexión y las sesiones de base de datos se explican en [Engine](https://docs.sqlalchemy.org/en/20/core/engines.html) y [Session](https://docs.sqlalchemy.org/en/20/orm/session_basics.html).
- Los modelos y las tablas se explican en el [mapeo declarativo de SQLAlchemy](https://docs.sqlalchemy.org/en/20/orm/declarative_mapping.html).
- Los DTOs se basan en los [modelos de Pydantic](https://docs.pydantic.dev/latest/concepts/models/).
- La configuración mediante entorno se basa en [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/).
- Los contenedores y volúmenes se configuran con la [documentación de Docker Compose](https://docs.docker.com/reference/compose-file/).
