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
    <Card className="p-2.5">
      <div className="flex items-start gap-2">
        <span className={`grid size-8 shrink-0 place-items-center rounded-full ${tone}`}><Icon name={icon} className="size-4" /></span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tracking-tight">{number(metric.valor)}</p>
        </div>
      </div>
      <div className={`mt-1 flex items-center gap-1 text-[10px] font-semibold ${increased ? "text-success" : "text-destructive"}`}>
        <Icon name={increased ? "trendUp" : "trendDown"} className="size-3" />
        {Math.abs(metric.variacion_porcentual)}%
        <span className="ml-1 font-normal text-muted-foreground">vs. periodo anterior</span>
      </div>
    </Card>
  );
}

function FilterSelect({ label, value, values, onChange }: { label: string; value: string; values: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return (
    <label className="relative block min-w-0">
      <span className="mb-0.5 block truncate text-[10px] font-semibold text-muted-foreground">{label}</span>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        {values.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
      <Icon name="chevronDown" className="pointer-events-none absolute bottom-2.5 right-2.5 size-3.5 text-muted-foreground" />
    </label>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 animate-pulse flex-col gap-2.5">
      <div className="grid gap-2.5 lg:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-20 rounded-lg bg-muted" />)}</div>
      <div className="grid min-h-0 flex-1 gap-2.5 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-lg bg-muted" />)}</div>
      <div className="min-h-0 flex-1 rounded-lg bg-muted" />
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
    if (!term) return data.ultimos_pacientes.slice(0, 5);
    return data.ultimos_pacientes.filter((patient) => `${patient.nombre_completo} ${patient.documento}`.toLocaleLowerCase("es").includes(term)).slice(0, 5);
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
    <div className="scrollbar-thin mx-auto flex h-full w-full max-w-[1600px] flex-col gap-2.5 overflow-y-auto p-3 lg:overflow-hidden">
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold text-primary">RESUMEN OPERATIVO</p>
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Dashboard de pacientes</h1>
          <p className="hidden text-xs text-muted-foreground xl:block">Indicadores y prioridades del periodo seleccionado.</p>
        </div>
        <div className="flex gap-2 sm:items-end">
          <label className="text-[10px] font-semibold text-muted-foreground">Desde<Input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="mt-0.5 w-36" /></label>
          <label className="text-[10px] font-semibold text-muted-foreground">Hasta<Input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className="mt-0.5 w-36" /></label>
        </div>
      </div>

      <Card className="shrink-0 p-2.5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <FilterSelect label="Ciudad" value={filters.ciudad} values={(data?.opciones_filtros.ciudades ?? []).map((value) => ({ value, label: value }))} onChange={(value) => setFilter("ciudad", value)} />
          <FilterSelect label="EPS" value={filters.eps_codigo} values={(data?.opciones_filtros.eps ?? []).map((value) => ({ value: value.codigo, label: value.nombre }))} onChange={(value) => setFilter("eps_codigo", value)} />
          <FilterSelect label="Estado" value={filters.estado} values={(data?.opciones_filtros.estados ?? []).map((value) => ({ value, label: value }))} onChange={(value) => setFilter("estado", value)} />
          <FilterSelect label="Prioridad" value={filters.prioridad} values={(data?.opciones_filtros.prioridades ?? []).map((value) => ({ value, label: value }))} onChange={(value) => setFilter("prioridad", value)} />
          <FilterSelect label="Género" value={filters.genero} values={(data?.opciones_filtros.generos ?? []).map((value) => ({ value, label: value }))} onChange={(value) => setFilter("genero", value)} />
          <Button variant="outline" className="mt-auto" onClick={() => setFilters(emptyFilters)} disabled={!Object.values(filters).some(Boolean)}><Icon name="refresh" className="size-3.5" /> Limpiar</Button>
        </div>
      </Card>

      {error && <div role="alert" className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-destructive/25 bg-destructive-soft p-2.5 text-xs text-destructive"><span>{error}</span><Button variant="outline" size="sm" onClick={() => setFilters({ ...filters })}>Reintentar</Button></div>}

      {loading && !data ? <DashboardSkeleton /> : data && (
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 animate-fade-in">
          <section aria-label="Métricas principales" className="grid shrink-0 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            {metricDefinitions.map(({ metricKey, ...definition }) => <MetricCard key={metricKey} {...definition} metric={data.metricas[metricKey]} />)}
          </section>

          <section className="grid gap-2.5 lg:min-h-0 lg:flex-[0.9] lg:grid-cols-[1fr_1fr_1.35fr_1.15fr]">
            <Card className="flex min-h-0 flex-col p-3">
              <h2 className="text-sm font-bold">Pacientes por estado</h2>
              <div className="mt-2 flex min-h-24 flex-1 items-end justify-around gap-2 border-b px-1">
                {data.pacientes_por_estado.map((item, index) => (
                  <div key={item.estado} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[10px] font-bold">{number(item.cantidad)}</span>
                    <div className={`w-full max-w-12 rounded-t-md ${index === 2 ? "bg-success" : index === 1 ? "bg-primary" : "bg-warning"}`} style={{ height: `${Math.max(4, (item.cantidad / stateMax) * 75)}%` }} />
                    <span className="h-6 text-center text-[9px] leading-tight text-muted-foreground">{item.estado}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="flex min-h-0 flex-col p-3">
              <h2 className="text-sm font-bold">Distribución por prioridad</h2>
              <div className="mt-2 flex min-h-0 flex-1 items-center justify-center gap-3">
                <div className="relative size-24 shrink-0 rounded-full" style={{ background: `conic-gradient(var(--destructive) 0 ${high}%, var(--warning) ${high}% ${high + medium}%, var(--success) ${high + medium}% 100%)` }}>
                  <div className="absolute inset-4 grid place-items-center rounded-full bg-card text-center"><span><strong className="block text-base">{number(data.metricas.pacientes_registrados.valor)}</strong><small className="text-[10px] text-muted-foreground">Total</small></span></div>
                </div>
                <div className="space-y-1 text-[10px]">
                  {data.distribucion_prioridad.map((item) => <div key={item.prioridad} className="flex items-center gap-2"><span className={`size-2 rounded-full ${item.prioridad === "Alta" ? "bg-destructive" : item.prioridad === "Media" ? "bg-warning" : "bg-success"}`} /><span className="text-muted-foreground">{item.prioridad}</span><strong>{item.porcentaje}%</strong></div>)}
                </div>
              </div>
            </Card>

            <Card className="flex min-h-0 flex-col p-3">
              <h2 className="text-sm font-bold">Registros por día</h2>
              <div className="mt-2 flex min-h-0 flex-1 flex-col">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="min-h-20 w-full flex-1 overflow-visible" role="img" aria-label="Gráfica de registros por día">
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

            <Card className="flex min-h-0 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between border-b px-3 py-2"><h2 className="text-sm font-bold">Atención rápida</h2><Icon name="bell" className="size-4 text-destructive" /></div>
              <div className="scrollbar-thin min-h-0 flex-1 space-y-1.5 overflow-auto p-2">
                {data.atencion_rapida.length === 0 && <p className="grid h-full place-items-center text-xs text-muted-foreground">No hay alertas en este periodo.</p>}
                {data.atencion_rapida.map((patient) => (
                  <div key={patient.paciente_id} className={`flex items-center gap-2 rounded-md border p-2 ${patient.prioridad === "Alta" ? "border-destructive/20 bg-destructive-soft" : "border-warning/20 bg-warning-soft"}`}>
                    <Icon name={patient.prioridad === "Alta" ? "alert" : "clock"} className={`size-4 shrink-0 ${patient.prioridad === "Alta" ? "text-destructive" : "text-warning"}`} />
                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{patient.nombre_completo}</p><p className="truncate text-[11px] text-muted-foreground">{patient.tipo_documento}: {patient.documento}</p><p className="mt-1 text-[10px] text-muted-foreground">{patient.tiempo_espera_texto}</p></div>
                    <Icon name="chevronRight" className="size-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <Card className="flex min-h-0 flex-col overflow-hidden lg:flex-[1.1]">
            <div className="flex shrink-0 flex-col gap-2 border-b px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-sm font-bold">Últimos pacientes registrados</h2><p className="text-[10px] text-muted-foreground">Los registros más recientes del periodo.</p></div>
              <div className="relative w-full sm:max-w-xs"><Icon name="search" className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o documento" className="pl-8" /></div>
            </div>
            <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="sticky top-0 bg-muted text-[10px] text-muted-foreground"><tr><th className="px-3 py-1.5 font-semibold">Documento</th><th className="px-3 py-1.5 font-semibold">Nombre completo</th><th className="px-3 py-1.5 font-semibold">Ciudad</th><th className="px-3 py-1.5 font-semibold">EPS</th><th className="px-3 py-1.5 font-semibold">Prioridad</th><th className="px-3 py-1.5 font-semibold">Estado</th><th className="px-3 py-1.5 font-semibold">Fecha creación</th></tr></thead>
                <tbody className="divide-y">
                  {latestPatients.map((patient) => <tr key={patient.paciente_id} className="hover:bg-muted/40"><td className="px-3 py-1.5 text-muted-foreground">{patient.tipo_documento} {patient.documento}</td><td className="px-3 py-1.5 font-semibold">{patient.nombre_completo}</td><td className="px-3 py-1.5 text-muted-foreground">{patient.ciudad || "—"}</td><td className="px-3 py-1.5 text-muted-foreground">{patient.eps_nombre || "—"}</td><td className="px-3 py-1.5"><StatusBadge value={patient.prioridad} /></td><td className="px-3 py-1.5"><StatusBadge value={patient.estado} /></td><td className="px-3 py-1.5 text-[10px] text-muted-foreground">{dateTime(patient.fecha_creacion)}</td></tr>)}
                  {latestPatients.length === 0 && <tr><td colSpan={7} className="px-3 py-5 text-center text-muted-foreground">No se encontraron pacientes.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
