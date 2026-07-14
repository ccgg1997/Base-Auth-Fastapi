import asyncio
from datetime import datetime, timedelta
from time import monotonic
from zoneinfo import ZoneInfo

import httpx

from src.config import Settings


class SaludPlusApiError(RuntimeError):
    """Error seguro para mostrar al usuario del bot."""


class SaludPlusApi:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._client = httpx.AsyncClient(
            base_url=settings.api_base_url,
            timeout=httpx.Timeout(20.0),
            headers={"Accept": "application/json"},
        )
        self._token: str | None = None
        self._token_expires_at = 0.0
        self._auth_lock = asyncio.Lock()

    async def close(self) -> None:
        await self._client.aclose()

    async def _authenticate(self, force: bool = False) -> None:
        if not force and self._token and monotonic() < self._token_expires_at:
            return

        async with self._auth_lock:
            if not force and self._token and monotonic() < self._token_expires_at:
                return
            try:
                response = await self._client.post(
                    "/auth/token",
                    data={
                        "username": self._settings.api_username,
                        "password": self._settings.api_password,
                    },
                )
            except httpx.RequestError as exc:
                raise SaludPlusApiError(
                    "No fue posible conectar con la API de SaludPlus."
                ) from exc

            if response.status_code >= 400:
                raise SaludPlusApiError(
                    "La API rechazó las credenciales configuradas para el bot."
                )

            try:
                payload = response.json()
                self._token = payload["access_token"]
                expires_in = int(payload.get("expires_in", 1800))
            except (KeyError, TypeError, ValueError) as exc:
                raise SaludPlusApiError(
                    "La API devolvió una autenticación inválida."
                ) from exc
            self._token_expires_at = monotonic() + max(30, expires_in - 30)

    async def _get(self, path: str, params: dict | None = None) -> dict | list:
        await self._authenticate()
        try:
            response = await self._client.get(
                path,
                params=params,
                headers={"Authorization": f"Bearer {self._token}"},
            )
            if response.status_code == 401:
                await self._authenticate(force=True)
                response = await self._client.get(
                    path,
                    params=params,
                    headers={"Authorization": f"Bearer {self._token}"},
                )
        except httpx.RequestError as exc:
            raise SaludPlusApiError(
                "No fue posible consultar la API de SaludPlus."
            ) from exc

        if response.status_code >= 400:
            raise SaludPlusApiError(
                f"La API no pudo completar la consulta ({response.status_code})."
            )
        try:
            return response.json()
        except ValueError as exc:
            raise SaludPlusApiError(
                "La API devolvió una respuesta que el bot no pudo interpretar."
            ) from exc

    async def get_dashboard(self) -> dict:
        today = datetime.now(ZoneInfo("America/Bogota")).date()
        start = today - timedelta(days=self._settings.bot_dashboard_days - 1)
        payload = await self._get(
            "/dashboard",
            params={
                "fecha_desde": start.isoformat(),
                "fecha_hasta": today.isoformat(),
                "timezone": "America/Bogota",
            },
        )
        if not isinstance(payload, dict):
            raise SaludPlusApiError("El dashboard devolvió un formato inesperado.")
        return payload

    async def get_patients(self) -> list[dict]:
        payload = await self._get(
            "/pacientes/",
            params={"limit": self._settings.bot_patient_limit},
        )
        if not isinstance(payload, list):
            raise SaludPlusApiError("Pacientes devolvió un formato inesperado.")
        return payload
