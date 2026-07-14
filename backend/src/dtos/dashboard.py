from datetime import date, datetime

from pydantic import BaseModel


class DashboardMeta(BaseModel):
    fecha_desde: date
    fecha_hasta: date
    timezone: str
    generado_en: datetime


class DashboardFiltros(BaseModel):
    ciudad: str | None
    eps_codigo: str | None
    estado: str | None
    prioridad: str | None
    genero: str | None


class DashboardMetrica(BaseModel):
    valor: int
    variacion_porcentual: float
    periodo_comparacion: str


class DashboardMetricas(BaseModel):
    pacientes_registrados: DashboardMetrica
    pacientes_pendientes: DashboardMetrica
    pacientes_en_atencion: DashboardMetrica
    pacientes_atendidos: DashboardMetrica
    pacientes_prioridad_alta: DashboardMetrica
    nuevos_registros_hoy: DashboardMetrica


class PacientesPorEstado(BaseModel):
    estado: str
    cantidad: int


class DistribucionPrioridad(BaseModel):
    prioridad: str
    cantidad: int
    porcentaje: float


class RegistroPorDia(BaseModel):
    fecha: date
    cantidad: int


class PacienteAtencionRapida(BaseModel):
    paciente_id: int
    nombre_completo: str
    tipo_documento: str
    documento: str
    prioridad: str
    estado: str
    fecha_creacion: datetime
    tiempo_espera_minutos: int
    tiempo_espera_texto: str
    tipo_alerta: str


class UltimoPaciente(BaseModel):
    paciente_id: int
    tipo_documento: str
    documento: str
    nombre_completo: str
    ciudad: str | None
    eps_codigo: str | None
    eps_nombre: str | None
    prioridad: str
    estado: str
    fecha_creacion: datetime


class EpsFiltro(BaseModel):
    codigo: str
    nombre: str


class OpcionesFiltros(BaseModel):
    ciudades: list[str]
    eps: list[EpsFiltro]
    estados: list[str]
    prioridades: list[str]
    generos: list[str]


class DashboardResponse(BaseModel):
    meta: DashboardMeta
    filtros_aplicados: DashboardFiltros
    metricas: DashboardMetricas
    pacientes_por_estado: list[PacientesPorEstado]
    distribucion_prioridad: list[DistribucionPrioridad]
    registros_por_dia: list[RegistroPorDia]
    atencion_rapida: list[PacienteAtencionRapida]
    ultimos_pacientes: list[UltimoPaciente]
    opciones_filtros: OpcionesFiltros
