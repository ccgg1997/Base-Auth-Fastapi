"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Button, Card, Input, Select, StatusBadge } from "@/components/ui";
import { api, getApiError } from "@/lib/api";
import type { DashboardData, Metric } from "@/lib/types";

type Filters = {
  ciudad: string;
  eps_codigo: string;
  estado: string;
  prioridad: string;
  genero: string;
};

const emptyFilters: Filters = { ciudad: "", eps_codigo: "", estado: "", prioridad: "", genero: "" };

function inputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function initialDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return { start: inputDate(start), end: inputDate(end) };
}

function number(value: number) {
  return new Intl.NumberFormat("es-CO").format(value);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`));
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

const metricDefinitions: { metricKey: keyof DashboardData["metricas"]; label: string; icon: IconName; tone: string }[] = [
  { metricKey: "pacientes_registrados", label: "Pacientes registrados", icon: "users", tone: "bg-secondary text-primary" },
  { metricKey: "pacientes_pendientes", label: "Pacientes pendientes", icon: "clock", tone: "bg-warning-soft text-warning" },
  { metricKey: "pacientes_en_atencion", label: "En atención", icon: "heart", tone: "bg-info-soft text-primary" },
  { metricKey: "pacientes_atendidos", label: "Pacientes atendidos", icon: "check", tone: "bg-success-soft text-success" },
  { metricKey: "pacientes_prioridad_alta", label: "Prioridad alta", icon: "alert", tone: "bg-destructive-soft text-destructive" },
];

function MetricCard({ metric, label, icon, tone }: { metric: Metric; label: string; icon: IconName; tone: string }) {
  const increased = metric.variacion_porcentual >= 0;
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${tone}`}><Icon name={icon} className="size-5" /></span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{number(metric.valor)}</p>
        </div>
      </div>
      <div className={`mt-3 flex items-center gap-1 text-xs font-semibold ${increased ? "text-success" : "text-destructive"}`}>
        <Icon name={increased ? "trendUp" : "trendDown"} className="size-3.5" />
        {Math.abs(metric.variacion_porcentual)}%
        <span className="ml-1 font-normal text-muted-foreground">vs. periodo anterior</span>
      </div>
    </Card>
  );
}

function FilterSelect({ label, value, values, onChange }: { label: string; value: string; values: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return (
    <label className="relative block min-w-36 flex-1">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        {values.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
      <Icon name="chevronDown" className="pointer-events-none absolute bottom-3 right-3 size-4 text-muted-foreground" />
    </label>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-36 rounded-xl bg-muted" />)}</div>
      <div className="grid gap-4 lg:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-72 rounded-xl bg-muted" />)}</div>
      <div className="h-72 rounded-xl bg-muted" />
    </div>
  );
}

export default function DashboardPage() {
  const dates = useMemo(() => initialDates(), []);
  const [from, setFrom] = useState(dates.start);
  const [to, setTo] = useState(dates.end);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const params: Record<string, string> = { fecha_desde: from, fecha_hasta: to, timezone: "America/Bogota" };
        Object.entries(filters).forEach(([key, value]) => { if (value) params[key] = value; });
        const response = await api.get<DashboardData>("/dashboard", { params, signal: controller.signal });
        setData(response.data);
      } catch (requestError) {
        if (!controller.signal.aborted) setError(getApiError(requestError, "No fue posible cargar el dashboard."));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadDashboard();
    return () => controller.abort();
  }, [filters, from, to]);

  function setFilter(key: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const latestPatients = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLocaleLowerCase("es");
    if (!term) return data.ultimos_pacientes;
    return data.ultimos_pacientes.filter((patient) => `${patient.nombre_completo} ${patient.documento}`.toLocaleLowerCase("es").includes(term));
  }, [data, search]);

  const stateMax = Math.max(1, ...(data?.pacientes_por_estado.map((item) => item.cantidad) ?? [1]));
  const dayMax = Math.max(1, ...(data?.registros_por_dia.map((item) => item.cantidad) ?? [1]));
  const linePoints = data?.registros_por_dia.map((item, index, items) => {
    const x = items.length === 1 ? 50 : 6 + (index / (items.length - 1)) * 88;
    const y = 88 - (item.cantidad / dayMax) * 70;
    return `${x},${y}`;
  }).join(" ") ?? "";
  const high = data?.distribucion_prioridad.find((item) => item.prioridad === "Alta")?.porcentaje ?? 0;
  const medium = data?.distribucion_prioridad.find((item) => item.prioridad === "Media")?.porcentaje ?? 0;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">RESUMEN OPERATIVO</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard de pacientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Indicadores y prioridades del periodo seleccionado.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="text-xs font-semibold text-muted-foreground">Desde<Input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="mt-1" /></label>
          <label className="text-xs font-semibold text-muted-foreground">Hasta<Input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className="mt-1" /></label>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <FilterSelect label="Ciudad" value={filters.ciudad} values={(data?.opciones_filtros.ciudades ?? []).map((value) => ({ value, label: value }))} onChange={(value) => setFilter("ciudad", value)} />
          <FilterSelect label="EPS" value={filters.eps_codigo} values={(data?.opciones_filtros.eps ?? []).map((value) => ({ value: value.codigo, label: value.nombre }))} onChange={(value) => setFilter("eps_codigo", value)} />
          <FilterSelect label="Estado" value={filters.estado} values={(data?.opciones_filtros.estados ?? []).map((value) => ({ value, label: value }))} onChange={(value) => setFilter("estado", value)} />
          <FilterSelect label="Prioridad" value={filters.prioridad} values={(data?.opciones_filtros.prioridades ?? []).map((value) => ({ value, label: value }))} onChange={(value) => setFilter("prioridad", value)} />
          <FilterSelect label="Género" value={filters.genero} values={(data?.opciones_filtros.generos ?? []).map((value) => ({ value, label: value }))} onChange={(value) => setFilter("genero", value)} />
          <Button variant="outline" className="mt-auto" onClick={() => setFilters(emptyFilters)} disabled={!Object.values(filters).some(Boolean)}><Icon name="refresh" className="size-4" /> Limpiar</Button>
        </div>
      </Card>

      {error && <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-destructive/25 bg-destructive-soft p-4 text-sm text-destructive"><span>{error}</span><Button variant="outline" size="sm" onClick={() => setFilters({ ...filters })}>Reintentar</Button></div>}

      {loading && !data ? <DashboardSkeleton /> : data && (
        <div className="space-y-5 animate-fade-in">
          <section aria-label="Métricas principales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {metricDefinitions.map(({ metricKey, ...definition }) => <MetricCard key={metricKey} {...definition} metric={data.metricas[metricKey]} />)}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1.4fr_1.2fr]">
            <Card className="p-5">
              <h2 className="font-bold">Pacientes por estado</h2>
              <div className="mt-6 flex h-44 items-end justify-around gap-3 border-b px-2">
                {data.pacientes_por_estado.map((item, index) => (
                  <div key={item.estado} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-xs font-bold">{number(item.cantidad)}</span>
                    <div className={`w-full max-w-12 rounded-t-md ${index === 2 ? "bg-success" : index === 1 ? "bg-primary" : "bg-warning"}`} style={{ height: `${Math.max(4, (item.cantidad / stateMax) * 75)}%` }} />
                    <span className="h-8 text-center text-[11px] leading-tight text-muted-foreground">{item.estado}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="font-bold">Distribución por prioridad</h2>
              <div className="mt-6 flex items-center justify-center gap-6">
                <div className="relative size-32 shrink-0 rounded-full" style={{ background: `conic-gradient(var(--destructive) 0 ${high}%, var(--warning) ${high}% ${high + medium}%, var(--success) ${high + medium}% 100%)` }}>
                  <div className="absolute inset-5 grid place-items-center rounded-full bg-card text-center"><span><strong className="block text-xl">{number(data.metricas.pacientes_registrados.valor)}</strong><small className="text-muted-foreground">Total</small></span></div>
                </div>
                <div className="space-y-2 text-xs">
                  {data.distribucion_prioridad.map((item) => <div key={item.prioridad} className="flex items-center gap-2"><span className={`size-2 rounded-full ${item.prioridad === "Alta" ? "bg-destructive" : item.prioridad === "Media" ? "bg-warning" : "bg-success"}`} /><span className="text-muted-foreground">{item.prioridad}</span><strong>{item.porcentaje}%</strong></div>)}
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="font-bold">Registros por día</h2>
              <div className="mt-5 h-48">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-36 w-full overflow-visible" role="img" aria-label="Gráfica de registros por día">
                  {[20, 40, 60, 80].map((y) => <line key={y} x1="5" y1={y} x2="95" y2={y} stroke="var(--border)" strokeWidth="0.5" />)}
                  <polyline points={linePoints} fill="none" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                  {data.registros_por_dia.map((item, index, items) => {
                    const x = items.length === 1 ? 50 : 6 + (index / (items.length - 1)) * 88;
                    const y = 88 - (item.cantidad / dayMax) * 70;
                    return <circle key={item.fecha} cx={x} cy={y} r="1.7" fill="var(--card)" stroke="var(--primary)" strokeWidth="1" vectorEffect="non-scaling-stroke" />;
                  })}
                </svg>
                <div className="grid grid-cols-7 text-center text-[10px] text-muted-foreground">{data.registros_por_dia.map((item) => <span key={item.fecha}>{shortDate(item.fecha)}</span>)}</div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-bold">Atención rápida</h2><Icon name="bell" className="size-5 text-destructive" /></div>
              <div className="scrollbar-thin max-h-64 space-y-2 overflow-auto p-3">
                {data.atencion_rapida.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No hay alertas en este periodo.</p>}
                {data.atencion_rapida.map((patient) => (
                  <div key={patient.paciente_id} className={`flex items-center gap-3 rounded-lg border p-3 ${patient.prioridad === "Alta" ? "border-destructive/20 bg-destructive-soft" : "border-warning/20 bg-warning-soft"}`}>
                    <Icon name={patient.prioridad === "Alta" ? "alert" : "clock"} className={`size-5 shrink-0 ${patient.prioridad === "Alta" ? "text-destructive" : "text-warning"}`} />
                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{patient.nombre_completo}</p><p className="truncate text-[11px] text-muted-foreground">{patient.tipo_documento}: {patient.documento}</p><p className="mt-1 text-[10px] text-muted-foreground">{patient.tiempo_espera_texto}</p></div>
                    <Icon name="chevronRight" className="size-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="font-bold">Últimos pacientes registrados</h2><p className="text-xs text-muted-foreground">Los registros más recientes del periodo.</p></div>
              <div className="relative w-full sm:max-w-sm"><Icon name="search" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o documento" className="pl-9" /></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-muted/70 text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-semibold">Documento</th><th className="px-4 py-3 font-semibold">Nombre completo</th><th className="px-4 py-3 font-semibold">Ciudad</th><th className="px-4 py-3 font-semibold">EPS</th><th className="px-4 py-3 font-semibold">Prioridad</th><th className="px-4 py-3 font-semibold">Estado</th><th className="px-4 py-3 font-semibold">Fecha creación</th></tr></thead>
                <tbody className="divide-y">
                  {latestPatients.map((patient) => <tr key={patient.paciente_id} className="hover:bg-muted/40"><td className="px-4 py-3 text-muted-foreground">{patient.tipo_documento} {patient.documento}</td><td className="px-4 py-3 font-semibold">{patient.nombre_completo}</td><td className="px-4 py-3 text-muted-foreground">{patient.ciudad || "—"}</td><td className="px-4 py-3 text-muted-foreground">{patient.eps_nombre || "—"}</td><td className="px-4 py-3"><StatusBadge value={patient.prioridad} /></td><td className="px-4 py-3"><StatusBadge value={patient.estado} /></td><td className="px-4 py-3 text-xs text-muted-foreground">{dateTime(patient.fecha_creacion)}</td></tr>)}
                  {latestPatients.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No se encontraron pacientes.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
