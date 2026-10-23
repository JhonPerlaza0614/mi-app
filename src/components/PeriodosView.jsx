import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Edit3, ExternalLink, Plus, Save, X } from 'lucide-react'
import { createPeriodo, deletePeriodo, getPeriodos, updatePeriodo } from '../services/academicService'

const emptyForm = {
  nombre: '',
  numeroResolucion: '',
  fechaResolucion: '',
  fechaInicioSemestre: '',
  fechaFinSemestre: '',
  fechaAdicionInicio: '',
  fechaAdicionFin: '',
  fechaCancelacionInicio: '',
  fechaCancelacionFin: '',
  plazoDocenteInicio: '',
  plazoDocenteFin: '',
  plazoCoordinadorInicio: '',
  plazoCoordinadorFin: '',
  enlaceResolucion: '',
  version: null,
}

function toLocalDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromApi(periodo) {
  return Object.fromEntries(Object.entries(periodo).map(([key, value]) => (
    ['plazoDocenteInicio', 'plazoDocenteFin', 'plazoCoordinadorInicio', 'plazoCoordinadorFin'].includes(key)
      ? [key, toLocalDateTime(value)]
      : [key, value ?? '']
  )))
}

function toPayload(form) {
  const payload = { ...form }
  for (const key of ['plazoDocenteInicio', 'plazoDocenteFin', 'plazoCoordinadorInicio', 'plazoCoordinadorFin']) {
    payload[key] = payload[key] ? new Date(payload[key]).toISOString() : null
  }
  return payload
}

const dateFields = [
  ['fechaResolucion', 'Fecha de resolución'],
  ['fechaInicioSemestre', 'Inicio del semestre'],
  ['fechaFinSemestre', 'Fin del semestre'],
  ['fechaAdicionInicio', 'Inicio de adiciones'],
  ['fechaAdicionFin', 'Fin de adiciones'],
  ['fechaCancelacionInicio', 'Inicio de cancelaciones'],
  ['fechaCancelacionFin', 'Fin de cancelaciones'],
]

function PeriodoForm({ initialValue, onCancel, onSaved, onShowToast }) {
  const [form, setForm] = useState(initialValue || emptyForm)
  const [saving, setSaving] = useState(false)
  const isEditing = Boolean(initialValue?.id)

  useEffect(() => {
    if (form.plazoDocenteInicio && !form.plazoDocenteFin) {
      const end = new Date(form.plazoDocenteInicio)
      end.setDate(end.getDate() + 14)
      setForm((current) => ({ ...current, plazoDocenteFin: toLocalDateTime(end) }))
    }
  }, [form.plazoDocenteInicio, form.plazoDocenteFin])

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  const submit = async (event) => {
    event.preventDefault()
    if (!window.confirm('¿La información es correcta?')) return
    setSaving(true)
    try {
      const saved = isEditing
        ? await updatePeriodo(initialValue.id, toPayload(form))
        : await createPeriodo(toPayload(form))
      onShowToast(isEditing ? 'Período académico actualizado' : 'Período académico creado', 'success')
      onSaved(saved)
    } catch (error) {
      onShowToast(error.message || (isEditing ? 'No se pudo actualizar el período' : 'No se pudo crear el período'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="periodo-form" onSubmit={submit}>
      <div className="periodo-form-grid">
        <label>Nombre del período<input required maxLength={20} value={form.nombre} onChange={(e) => setField('nombre', e.target.value)} /></label>
        <label>Número de resolución<input required value={form.numeroResolucion} onChange={(e) => setField('numeroResolucion', e.target.value)} /></label>
        {dateFields.map(([key, label]) => (
          <label key={key}>{label}<input required type="date" value={form[key]} onChange={(e) => setField(key, e.target.value)} /></label>
        ))}
        <label>Inicio plazo docente<input required type="datetime-local" value={form.plazoDocenteInicio} onChange={(e) => setField('plazoDocenteInicio', e.target.value)} /></label>
        <label>Fin plazo docente<input required type="datetime-local" value={form.plazoDocenteFin} onChange={(e) => setField('plazoDocenteFin', e.target.value)} /></label>
        <label>Inicio plazo coordinadores (opcional)<input type="datetime-local" value={form.plazoCoordinadorInicio} onChange={(e) => setField('plazoCoordinadorInicio', e.target.value)} /></label>
        <label>Fin plazo coordinadores (opcional)<input type="datetime-local" value={form.plazoCoordinadorFin} onChange={(e) => setField('plazoCoordinadorFin', e.target.value)} /></label>
        <label className="periodo-form-wide">Enlace a la resolución<input type="url" placeholder="https://..." value={form.enlaceResolucion} onChange={(e) => setField('enlaceResolucion', e.target.value)} /></label>
      </div>
      <div className="periodo-form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}><X size={16} /> Cancelar</button>
        <button type="submit" className="btn-primary" disabled={saving}><Save size={16} /> {saving ? 'Guardando...' : 'Guardar período'}</button>
      </div>
    </form>
  )
}

export default function PeriodosView({ user, onShowToast }) {
  const [periodos, setPeriodos] = useState([])
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const isAdmin = user?.rol === 1

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setPeriodos(await getPeriodos())
    } catch (error) {
      onShowToast(error.message || 'No se pudieron cargar los períodos', 'error')
    } finally {
      setLoading(false)
    }
  }, [onShowToast])

  useEffect(() => { load() }, [load])

  const vigente = useMemo(() => periodos.find((periodo) => periodo.vigente), [periodos])

  const handleDelete = async (periodo) => {
    if (!window.confirm(`¿Está seguro que desea eliminar el período ${periodo.nombre}?\n\nEl sistema quedará sin período vigente y los plazos de docentes y coordinadores se cerrarán`)) return
    try {
      await deletePeriodo(periodo.id)
      onShowToast('Período eliminado', 'success')
      await load()
    } catch (error) {
      onShowToast(error.message || 'No se pudo eliminar el período', 'error')
    }
  }

  if (editing) {
    return (
      <section className="periodos-container">
        <h1>{editing.id ? 'Editar período académico' : 'Crear período académico'}</h1>
        <PeriodoForm
          initialValue={editing.id ? fromApi(editing) : null}
          onCancel={() => setEditing(null)}
          onSaved={(saved) => { setEditing(null); setPeriodos((items) => editing.id ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items.map((item) => ({ ...item, vigente: false }))]) }}
          onShowToast={onShowToast}
        />
      </section>
    )
  }

  return (
    <section className="periodos-container">
      <div className="periodos-heading">
        <div><p className="section-eyebrow">PROGRAMACIÓN ACADÉMICA</p><h1><CalendarDays size={28} /> Períodos académicos</h1></div>
        {isAdmin && <button className="btn-primary" onClick={() => setEditing(emptyForm)}><Plus size={16} /> Crear período académico</button>}
      </div>
      {loading ? <p>Cargando períodos...</p> : periodos.length === 0 ? <p>No hay períodos académicos registrados.</p> : (
        <div className="periodos-list">
          {periodos.map((periodo) => (
            <article className={`periodo-card${periodo.vigente ? ' vigente' : ''}`} key={periodo.id}>
              <div><span className="periodo-status">{periodo.estado || (periodo.vigente ? 'VIGENTE' : 'HISTORIAL')}</span><h2>{periodo.nombre}</h2><p>Resolución {periodo.numeroResolucion} · Semestre: {periodo.fechaInicioSemestre} a {periodo.fechaFinSemestre}</p></div>
              <div className="periodo-card-actions">
                {periodo.enlaceResolucion && <a href={periodo.enlaceResolucion} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Resolución</a>}
                {isAdmin && periodo.vigente && <>
                  <button className="btn-secondary" onClick={() => setEditing(periodo)}><Edit3 size={16} /> Editar</button>
                  <button className="btn-secondary" onClick={() => handleDelete(periodo)}>Eliminar</button>
                </>}
              </div>
            </article>
          ))}
        </div>
      )}
      {vigente && <p className="periodo-note">Los plazos de disponibilidad se administran desde el período vigente.</p>}
    </section>
  )
}
