from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import Date, case, cast, func, or_
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.dependencies.auth import get_current_user
from src.dtos.dashboard import DashboardResponse
from src.models.patient import Paciente


router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(get_current_user)],
)

ESTADOS = ("Pendiente", "En atención", "Atendido", "Cancelado", "Inactivo")
PRIORIDADES = ("Alta", "Media", "Baja")


def _limites_periodo(fecha_desde: date, fecha_hasta: date, zona: ZoneInfo):
    inicio = datetime.combine(fecha_desde, time.min, tzinfo=zona)
    fin = datetime.combine(fecha_hasta + timedelta(days=1), time.min, tzinfo=zona)
    return inicio, fin


def _aplicar_filtros(query, filtros: dict[str, str | None]):
    for campo, valor in filtros.items():
        if valor is not None:
            query = query.filter(getattr(Paciente, campo) == valor)
    return query


def _query_periodo(
    db: Session,
    fecha_desde: date,
    fecha_hasta: date,
    zona: ZoneInfo,
    filtros: dict[str, str | None],
):
    inicio, fin = _limites_periodo(fecha_desde, fecha_hasta, zona)
    query = db.query(Paciente).filter(
        Paciente.fecha_creacion >= inicio,
        Paciente.fecha_creacion < fin,
    )
    return _aplicar_filtros(query, filtros)


def _variacion(actual: int, anterior: int) -> float:
    if anterior == 0:
        return 0.0 if actual == 0 else 100.0
    return round(((actual - anterior) / anterior) * 100, 1)


def _metrica(actual: int, anterior: int, periodo: str = "periodo_anterior"):
    return {
        "valor": actual,
        "variacion_porcentual": _variacion(actual, anterior),
        "periodo_comparacion": periodo,
    }


def _conteos_metricas(query) -> dict[str, int]:
    fila = query.with_entities(
        func.count(Paciente.paciente_id),
        func.count(case((Paciente.estado == "Pendiente", 1))),
        func.count(case((Paciente.estado == "En atención", 1))),
        func.count(case((Paciente.estado == "Atendido", 1))),
        func.count(case((Paciente.prioridad == "Alta", 1))),
    ).one()
    return {
        "registrados": fila[0],
        "pendientes": fila[1],
        "en_atencion": fila[2],
        "atendidos": fila[3],
        "prioridad_alta": fila[4],
    }


def _conteo_dia(
    db: Session, fecha: date, zona: ZoneInfo, filtros: dict[str, str | None]
) -> int:
    return _query_periodo(db, fecha, fecha, zona, filtros).count()


def _texto_espera(minutos: int) -> str:
    if minutos >= 1440:
        dias = minutos // 1440
        return f"Pendiente desde hace {dias} {'día' if dias == 1 else 'días'}"
    if minutos >= 60:
        horas = minutos // 60
        return f"Pendiente desde hace {horas} {'hora' if horas == 1 else 'horas'}"
    return f"Pendiente desde hace {minutos} {'minuto' if minutos == 1 else 'minutos'}"


def _opciones_filtros(db: Session):
    def distintos(columna):
        return [
            valor
            for (valor,) in db.query(columna)
            .filter(columna.is_not(None))
            .distinct()
            .order_by(columna)
            .all()
        ]

    eps = (
        db.query(Paciente.eps_codigo, Paciente.eps_nombre)
        .filter(Paciente.eps_codigo.is_not(None), Paciente.eps_nombre.is_not(None))
        .distinct()
        .order_by(Paciente.eps_nombre)
        .all()
    )
    return {
        "ciudades": distintos(Paciente.ciudad),
        "eps": [{"codigo": codigo, "nombre": nombre} for codigo, nombre in eps],
        "estados": distintos(Paciente.estado),
        "prioridades": distintos(Paciente.prioridad),
        "generos": distintos(Paciente.genero),
    }


@router.get("", response_model=DashboardResponse)
def obtener_dashboard(
    fecha_desde: date,
    fecha_hasta: date,
    timezone_nombre: str = Query(default="America/Bogota", alias="timezone"),
    ciudad: str | None = None,
    eps_codigo: str | None = None,
    estado: str | None = None,
    prioridad: str | None = None,
    genero: str | None = None,
    db: Session = Depends(get_db),
):
    if fecha_desde > fecha_hasta:
        raise HTTPException(
            status_code=400, detail="fecha_desde no puede ser posterior a fecha_hasta"
        )
    try:
        zona = ZoneInfo(timezone_nombre)
    except ZoneInfoNotFoundError as exc:
        raise HTTPException(status_code=400, detail="Timezone no reconocido") from exc

    filtros = {
        "ciudad": ciudad,
        "eps_codigo": eps_codigo,
        "estado": estado,
        "prioridad": prioridad,
        "genero": genero,
    }
    generado_en = datetime.now(zona)
    duracion = (fecha_hasta - fecha_desde).days + 1
    anterior_hasta = fecha_desde - timedelta(days=1)
    anterior_desde = anterior_hasta - timedelta(days=duracion - 1)

    query_actual = _query_periodo(db, fecha_desde, fecha_hasta, zona, filtros)
    query_anterior = _query_periodo(
        db, anterior_desde, anterior_hasta, zona, filtros
    )
    actual = _conteos_metricas(query_actual)
    anterior = _conteos_metricas(query_anterior)
    registros_fecha_hasta = _conteo_dia(db, fecha_hasta, zona, filtros)
    registros_dia_anterior = _conteo_dia(
        db, fecha_hasta - timedelta(days=1), zona, filtros
    )

    estados_db = dict(
        query_actual.with_entities(Paciente.estado, func.count(Paciente.paciente_id))
        .group_by(Paciente.estado)
        .all()
    )
    pacientes_por_estado = [
        {"estado": item, "cantidad": estados_db.get(item, 0)} for item in ESTADOS
    ]

    prioridades_db = dict(
        query_actual.with_entities(
            Paciente.prioridad, func.count(Paciente.paciente_id)
        )
        .group_by(Paciente.prioridad)
        .all()
    )
    total = actual["registrados"]
    distribucion_prioridad = [
        {
            "prioridad": item,
            "cantidad": prioridades_db.get(item, 0),
            "porcentaje": round((prioridades_db.get(item, 0) / total) * 100, 1)
            if total
            else 0.0,
        }
        for item in PRIORIDADES
    ]

    primer_dia_grafica = fecha_hasta - timedelta(days=6)
    fecha_local = cast(
        func.timezone(timezone_nombre, Paciente.fecha_creacion), Date
    )
    query_grafica = _query_periodo(
        db, primer_dia_grafica, fecha_hasta, zona, filtros
    )
    conteos_dia = dict(
        query_grafica.with_entities(fecha_local, func.count(Paciente.paciente_id))
        .group_by(fecha_local)
        .all()
    )
    registros_por_dia = [
        {
            "fecha": primer_dia_grafica + timedelta(days=indice),
            "cantidad": conteos_dia.get(
                primer_dia_grafica + timedelta(days=indice), 0
            ),
        }
        for indice in range(7)
    ]

    _, fin_periodo = _limites_periodo(fecha_desde, fecha_hasta, zona)
    referencia = min(generado_en, fin_periodo)
    espera_limite = referencia - timedelta(hours=24)
    orden_prioridad = case((Paciente.prioridad == "Alta", 0), else_=1)
    alertas = (
        query_actual.filter(
            Paciente.estado == "Pendiente",
            or_(
                Paciente.prioridad == "Alta",
                Paciente.fecha_creacion <= espera_limite,
            ),
        )
        .order_by(orden_prioridad, Paciente.fecha_creacion)
        .limit(10)
        .all()
    )
    atencion_rapida = []
    for paciente in alertas:
        fecha_creacion = paciente.fecha_creacion.astimezone(zona)
        minutos = max(0, int((referencia - fecha_creacion).total_seconds() // 60))
        atencion_rapida.append(
            {
                "paciente_id": paciente.paciente_id,
                "nombre_completo": paciente.nombre_completo,
                "tipo_documento": paciente.tipo_documento,
                "documento": paciente.documento,
                "prioridad": paciente.prioridad,
                "estado": paciente.estado,
                "fecha_creacion": fecha_creacion,
                "tiempo_espera_minutos": minutos,
                "tiempo_espera_texto": _texto_espera(minutos),
                "tipo_alerta": "prioridad_alta"
                if paciente.prioridad == "Alta"
                else "espera_prolongada",
            }
        )

    ultimos = query_actual.order_by(Paciente.fecha_creacion.desc()).limit(10).all()
    ultimos_pacientes = [
        {
            "paciente_id": paciente.paciente_id,
            "tipo_documento": paciente.tipo_documento,
            "documento": paciente.documento,
            "nombre_completo": paciente.nombre_completo,
            "ciudad": paciente.ciudad,
            "eps_codigo": paciente.eps_codigo,
            "eps_nombre": paciente.eps_nombre,
            "prioridad": paciente.prioridad,
            "estado": paciente.estado,
            "fecha_creacion": paciente.fecha_creacion.astimezone(zona),
        }
        for paciente in ultimos
    ]

    return {
        "meta": {
            "fecha_desde": fecha_desde,
            "fecha_hasta": fecha_hasta,
            "timezone": timezone_nombre,
            "generado_en": generado_en,
        },
        "filtros_aplicados": filtros,
        "metricas": {
            "pacientes_registrados": _metrica(
                actual["registrados"], anterior["registrados"]
            ),
            "pacientes_pendientes": _metrica(
                actual["pendientes"], anterior["pendientes"]
            ),
            "pacientes_en_atencion": _metrica(
                actual["en_atencion"], anterior["en_atencion"]
            ),
            "pacientes_atendidos": _metrica(
                actual["atendidos"], anterior["atendidos"]
            ),
            "pacientes_prioridad_alta": _metrica(
                actual["prioridad_alta"], anterior["prioridad_alta"]
            ),
            "nuevos_registros_hoy": _metrica(
                registros_fecha_hasta, registros_dia_anterior, "dia_anterior"
            ),
        },
        "pacientes_por_estado": pacientes_por_estado,
        "distribucion_prioridad": distribucion_prioridad,
        "registros_por_dia": registros_por_dia,
        "atencion_rapida": atencion_rapida,
        "ultimos_pacientes": ultimos_pacientes,
        "opciones_filtros": _opciones_filtros(db),
    }
