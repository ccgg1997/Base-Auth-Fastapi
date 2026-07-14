"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { Button, Card, Input, Select, StatusBadge } from "@/components/ui";
import { api, getApiError } from "@/lib/api";
import type { Patient, PatientPayload } from "@/lib/types";

type FormState = {
  nombre_completo: string;
  tipo_documento: string;
  documento: string;
  fecha_nacimiento: string;
  genero: string;
  telefono: string;
  correo: string;
  eps_codigo: string;
  eps_nombre: string;
  ciudad: string;
  prioridad: string;
  estado: string;
};

const emptyForm: FormState = {
  nombre_completo: "",
  tipo_documento: "",
  documento: "",
  fecha_nacimiento: "",
  genero: "",
  telefono: "",
  correo: "",
  eps_codigo: "",
  eps_nombre: "",
  ciudad: "",
  prioridad: "",
  estado: "Pendiente",
};

const PAGE_SIZE = 7;

function patientToForm(patient: Patient): FormState {
  return {
    nombre_completo: patient.nombre_completo,
    tipo_documento: patient.tipo_documento,
    documento: patient.documento,
    fecha_nacimiento: patient.fecha_nacimiento,
    genero: patient.genero,
    telefono: patient.telefono ?? "",
    correo: patient.correo ?? "",
    eps_codigo: patient.eps_codigo ?? "",
    eps_nombre: patient.eps_nombre ?? "",
    ciudad: patient.ciudad ?? "",
    prioridad: patient.prioridad,
    estado: patient.estado,
  };
}

function toPayload(form: FormState): PatientPayload {
  return {
    nombre_completo: form.nombre_completo.trim(),
    tipo_documento: form.tipo_documento,
    documento: form.documento.trim(),
    fecha_nacimiento: form.fecha_nacimiento,
    genero: form.genero,
    telefono: form.telefono.trim() || null,
    correo: form.correo.trim() || null,
    eps_codigo: form.eps_codigo.trim() || null,
    eps_nombre: form.eps_nombre.trim() || null,
    ciudad: form.ciudad.trim() || null,
    prioridad: form.prioridad,
    estado: form.estado as PatientPayload["estado"],
    active: true,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function FormField({ label, required, hint, children, className = "" }: { label: string; required?: boolean; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-xs font-semibold">{label}{required && <span className="ml-0.5 text-destructive">*</span>}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function PatientDrawer({ patient, readOnly, onClose, onSaved }: { patient: Patient | null; readOnly: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>(() => patient ? patientToForm(patient) : emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function change(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = toPayload(form);
      if (patient) await api.patch(`/pacientes/${patient.paciente_id}`, payload);
      else await api.post("/pacientes/", payload);
      onSaved();
    } catch (requestError) {
      setError(getApiError(requestError, patient ? "No fue posible actualizar el paciente." : "No fue posible crear el paciente."));
    } finally {
      setSaving(false);
    }
  }

  const title = readOnly ? "Detalle del paciente" : patient ? "Editar paciente" : "Nuevo paciente";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/25 backdrop-blur-[1px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="patient-drawer-title" className="flex h-full w-full max-w-xl animate-fade-in flex-col bg-card shadow-2xl">
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-5 sm:px-6">
          <div><h2 id="patient-drawer-title" className="text-lg font-bold">{title}</h2>{patient && <p className="text-xs text-muted-foreground">ID #{patient.paciente_id}</p>}</div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar"><Icon name="close" className="size-5" /></Button>
        </header>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            {error && <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive-soft p-3 text-sm text-destructive">{error}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nombre completo" required className="sm:col-span-2"><Input disabled={readOnly} required minLength={1} maxLength={200} value={form.nombre_completo} onChange={(event) => change("nombre_completo", event.target.value)} placeholder="Ingrese el nombre completo" /></FormField>
              <FormField label="Tipo de documento" required>
                <div className="relative"><Select disabled={readOnly} required value={form.tipo_documento} onChange={(event) => change("tipo_documento", event.target.value)}><option value="">Seleccione…</option><option value="CC">Cédula de ciudadanía</option><option value="TI">Tarjeta de identidad</option><option value="CE">Cédula de extranjería</option><option value="RC">Registro civil</option><option value="PAS">Pasaporte</option></Select><Icon name="chevronDown" className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" /></div>
              </FormField>
              <FormField label="Número de documento" required><Input disabled={readOnly} required maxLength={50} value={form.documento} onChange={(event) => change("documento", event.target.value)} placeholder="Número de documento" /></FormField>
              <FormField label="Fecha de nacimiento" required hint="La fecha no puede ser futura"><Input disabled={readOnly} required type="date" max={today} value={form.fecha_nacimiento} onChange={(event) => change("fecha_nacimiento", event.target.value)} /></FormField>
              <FormField label="Género" required>
                <div className="relative"><Select disabled={readOnly} required value={form.genero} onChange={(event) => change("genero", event.target.value)}><option value="">Seleccione…</option><option value="Femenino">Femenino</option><option value="Masculino">Masculino</option><option value="No binario">No binario</option><option value="Otro">Otro</option><option value="Prefiere no decir">Prefiere no decir</option></Select><Icon name="chevronDown" className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" /></div>
              </FormField>
              <FormField label="Teléfono"><Input disabled={readOnly} type="tel" maxLength={30} value={form.telefono} onChange={(event) => change("telefono", event.target.value)} placeholder="Número de teléfono" /></FormField>
              <FormField label="Correo electrónico"><Input disabled={readOnly} type="email" value={form.correo} onChange={(event) => change("correo", event.target.value)} placeholder="correo@ejemplo.com" /></FormField>
              <FormField label="EPS" className="sm:col-span-2">
                <div className="grid gap-3 sm:grid-cols-[0.7fr_1.3fr]"><Input disabled={readOnly} maxLength={50} value={form.eps_codigo} onChange={(event) => change("eps_codigo", event.target.value)} placeholder="Código" /><Input disabled={readOnly} maxLength={150} value={form.eps_nombre} onChange={(event) => change("eps_nombre", event.target.value)} placeholder="Nombre de la EPS" /></div>
              </FormField>
              <FormField label="Ciudad"><Input disabled={readOnly} maxLength={100} value={form.ciudad} onChange={(event) => change("ciudad", event.target.value)} placeholder="Ciudad" /></FormField>
              <FormField label="Prioridad" required>
                <div className="relative"><Select disabled={readOnly} required value={form.prioridad} onChange={(event) => change("prioridad", event.target.value)}><option value="">Seleccione…</option><option value="Alta">Alta</option><option value="Media">Media</option><option value="Baja">Baja</option></Select><Icon name="chevronDown" className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" /></div>
              </FormField>
              <FormField label="Estado" required className="sm:col-span-2">
                <div className="relative"><Select disabled={readOnly} required value={form.estado} onChange={(event) => change("estado", event.target.value)}><option value="Pendiente">Pendiente</option><option value="En atención">En atención</option><option value="Atendido">Atendido</option></Select><Icon name="chevronDown" className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" /></div>
              </FormField>
              {patient && <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground sm:col-span-2"><strong className="text-foreground">Fecha de creación:</strong> {formatDateTime(patient.fecha_creacion)}</div>}
            </div>
          </div>
          <footer className="flex shrink-0 justify-end gap-3 border-t bg-card p-4 sm:px-6">
            <Button type="button" variant="outline" onClick={onClose}>{readOnly ? "Cerrar" : "Cancelar"}</Button>
            {!readOnly && <Button type="submit" disabled={saving}>{saving ? <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" /> : <Icon name="save" className="size-4" />}{saving ? "Guardando…" : "Guardar"}</Button>}
          </footer>
        </form>
      </section>
    </div>
  );
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState<{ patient: Patient | null; readOnly: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get<Patient[]>("/pacientes/", { params: { limit: 500 } });
      setPatients(data);
    } catch (requestError) {
      setError(getApiError(requestError, "No fue posible cargar los pacientes."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api.get<Patient[]>("/pacientes/", { params: { limit: 500 }, signal: controller.signal })
      .then(({ data }) => setPatients(data))
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(getApiError(requestError, "No fue posible cargar los pacientes."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es");
    return patients.filter((patient) => {
      const matchesTerm = !term || `${patient.nombre_completo} ${patient.documento} ${patient.telefono ?? ""}`.toLocaleLowerCase("es").includes(term);
      return matchesTerm && (!status || patient.estado === status) && (!priority || patient.prioridad === priority);
    });
  }, [patients, priority, query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function clearFilters() {
    setQuery("");
    setStatus("");
    setPriority("");
    setPage(1);
  }

  async function removePatient() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/pacientes/${deleteTarget.paciente_id}`);
      setDeleteTarget(null);
      await loadPatients();
    } catch (requestError) {
      setError(getApiError(requestError, "No fue posible eliminar el paciente."));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  async function saved() {
    setDrawer(null);
    await loadPatients();
  }

  const hasFilters = Boolean(query || status || priority);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-semibold text-primary">ADMINISTRACIÓN</p><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Gestión de pacientes</h1><p className="mt-1 text-sm text-muted-foreground">Consulta, registra y actualiza la información de los pacientes.</p></div>
        <Button onClick={() => setDrawer({ patient: null, readOnly: false })}><Icon name="plus" className="size-4" /> Nuevo paciente</Button>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(260px,1fr)_220px_220px_auto]">
          <label className="relative"><span className="sr-only">Buscar paciente</span><Icon name="search" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar por nombre, documento o teléfono" className="pl-9" /></label>
          <label className="relative"><span className="sr-only">Filtrar por estado</span><Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Todos los estados</option><option value="Pendiente">Pendiente</option><option value="En atención">En atención</option><option value="Atendido">Atendido</option></Select><Icon name="chevronDown" className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" /></label>
          <label className="relative"><span className="sr-only">Filtrar por prioridad</span><Select value={priority} onChange={(event) => { setPriority(event.target.value); setPage(1); }}><option value="">Todas las prioridades</option><option value="Alta">Alta</option><option value="Media">Media</option><option value="Baja">Baja</option></Select><Icon name="chevronDown" className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" /></label>
          <Button variant="outline" onClick={clearFilters} disabled={!hasFilters}><Icon name="refresh" className="size-4" /> Limpiar filtros</Button>
        </div>
      </Card>

      {error && <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-destructive/25 bg-destructive-soft p-4 text-sm text-destructive"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void loadPatients()}>Reintentar</Button></div>}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-muted/70 text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-semibold">Nombre completo</th><th className="px-4 py-3 font-semibold">Tipo doc.</th><th className="px-4 py-3 font-semibold">Documento</th><th className="px-4 py-3 font-semibold">Fecha nacimiento</th><th className="px-4 py-3 font-semibold">Género</th><th className="px-4 py-3 font-semibold">Teléfono</th><th className="px-4 py-3 font-semibold">EPS</th><th className="px-4 py-3 font-semibold">Prioridad</th><th className="px-4 py-3 font-semibold">Estado</th><th className="px-4 py-3 font-semibold">Fecha creación</th><th className="px-4 py-3 text-right font-semibold">Acciones</th></tr></thead>
            <tbody className="divide-y">
              {loading && patients.length === 0 ? Array.from({ length: 7 }, (_, index) => <tr key={index} className="animate-pulse">{Array.from({ length: 11 }, (__, cell) => <td key={cell} className="px-4 py-4"><div className="h-4 rounded bg-muted" /></td>)}</tr>) : visible.map((patient) => (
                <tr key={patient.paciente_id} className="hover:bg-muted/40">
                  <td className="max-w-48 px-4 py-3 font-semibold">{patient.nombre_completo}</td><td className="px-4 py-3 text-muted-foreground">{patient.tipo_documento}</td><td className="px-4 py-3 text-muted-foreground">{patient.documento}</td><td className="px-4 py-3 text-muted-foreground">{formatDate(patient.fecha_nacimiento)}</td><td className="px-4 py-3 text-muted-foreground">{patient.genero}</td><td className="px-4 py-3 text-muted-foreground">{patient.telefono || "—"}</td><td className="max-w-36 px-4 py-3 text-muted-foreground">{patient.eps_nombre || "—"}</td><td className="px-4 py-3"><StatusBadge value={patient.prioridad} /></td><td className="px-4 py-3"><StatusBadge value={patient.estado} /></td><td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(patient.fecha_creacion)}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label={`Ver ${patient.nombre_completo}`} onClick={() => setDrawer({ patient, readOnly: true })}><Icon name="eye" className="size-4 text-primary" /></Button><Button variant="ghost" size="icon" aria-label={`Editar ${patient.nombre_completo}`} onClick={() => setDrawer({ patient, readOnly: false })}><Icon name="pencil" className="size-4 text-primary" /></Button><Button variant="ghost" size="icon" aria-label={`Eliminar ${patient.nombre_completo}`} onClick={() => setDeleteTarget(patient)}><Icon name="trash" className="size-4 text-destructive" /></Button></div></td>
                </tr>
              ))}
              {!loading && visible.length === 0 && <tr><td colSpan={11} className="px-4 py-16 text-center"><Icon name="users" className="mx-auto mb-3 size-9 text-muted-foreground" /><p className="font-semibold">No se encontraron pacientes</p><p className="mt-1 text-sm text-muted-foreground">Prueba con otros criterios de búsqueda.</p></td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">Mostrando <strong className="text-foreground">{filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}</strong> a <strong className="text-foreground">{Math.min(safePage * PAGE_SIZE, filtered.length)}</strong> de <strong className="text-foreground">{filtered.length}</strong> pacientes</p>
          <div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Página anterior" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><Icon name="chevronLeft" className="size-4" /></Button><span className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">{safePage}</span><span className="text-xs text-muted-foreground">de {totalPages}</span><Button variant="outline" size="icon" aria-label="Página siguiente" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}><Icon name="chevronRight" className="size-4" /></Button></div>
        </footer>
      </Card>

      {drawer && <PatientDrawer key={`${drawer.patient?.paciente_id ?? "new"}-${drawer.readOnly}`} patient={drawer.patient} readOnly={drawer.readOnly} onClose={() => setDrawer(null)} onSaved={() => void saved()} />}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/25 p-4 backdrop-blur-[1px]" role="presentation">
          <Card role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-md p-6 shadow-2xl">
            <span className="grid size-11 place-items-center rounded-full bg-destructive-soft text-destructive"><Icon name="trash" className="size-5" /></span>
            <h2 id="delete-title" className="mt-4 text-lg font-bold">Eliminar paciente</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">¿Deseas eliminar a <strong className="text-foreground">{deleteTarget.nombre_completo}</strong>? El registro quedará inactivo y dejará de aparecer en el listado.</p>
            <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button><Button variant="destructive" onClick={() => void removePatient()} disabled={deleting}>{deleting ? "Eliminando…" : "Eliminar"}</Button></div>
          </Card>
        </div>
      )}
    </div>
  );
}
