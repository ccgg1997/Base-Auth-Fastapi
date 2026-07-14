export type AuthUser = {
  usuario_id: number;
  usuario: string;
  nombre: string;
  rol_id: number;
  activo: boolean;
};

export type Patient = {
  paciente_id: number;
  tipo_documento: string;
  documento: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  genero: string;
  telefono: string | null;
  correo: string | null;
  eps_codigo: string | null;
  eps_nombre: string | null;
  ciudad: string | null;
  prioridad: string;
  estado: "Pendiente" | "En atención" | "Atendido";
  active: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
};

export type PatientPayload = Omit<
  Patient,
  "paciente_id" | "fecha_creacion" | "fecha_actualizacion"
>;

export type Metric = {
  valor: number;
  variacion_porcentual: number;
  periodo_comparacion: string;
};

export type DashboardData = {
  meta: {
    fecha_desde: string;
    fecha_hasta: string;
    timezone: string;
    generado_en: string;
  };
  filtros_aplicados: {
    ciudad: string | null;
    eps_codigo: string | null;
    estado: string | null;
    prioridad: string | null;
    genero: string | null;
  };
  metricas: {
    pacientes_registrados: Metric;
    pacientes_pendientes: Metric;
    pacientes_en_atencion: Metric;
    pacientes_atendidos: Metric;
    pacientes_prioridad_alta: Metric;
    nuevos_registros_hoy: Metric;
  };
  pacientes_por_estado: { estado: string; cantidad: number }[];
  distribucion_prioridad: { prioridad: string; cantidad: number; porcentaje: number }[];
  registros_por_dia: { fecha: string; cantidad: number }[];
  atencion_rapida: {
    paciente_id: number;
    nombre_completo: string;
    tipo_documento: string;
    documento: string;
    prioridad: string;
    estado: string;
    fecha_creacion: string;
    tiempo_espera_minutos: number;
    tiempo_espera_texto: string;
    tipo_alerta: string;
  }[];
  ultimos_pacientes: {
    paciente_id: number;
    tipo_documento: string;
    documento: string;
    nombre_completo: string;
    ciudad: string | null;
    eps_codigo: string | null;
    eps_nombre: string | null;
    prioridad: string;
    estado: string;
    fecha_creacion: string;
  }[];
  opciones_filtros: {
    ciudades: string[];
    eps: { codigo: string; nombre: string }[];
    estados: string[];
    prioridades: string[];
    generos: string[];
  };
};
