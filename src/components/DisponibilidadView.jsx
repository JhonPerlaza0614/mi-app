import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, Save, X } from 'lucide-react'
import { createAvailability, getMyAvailability } from '../services/academicService'

const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const emptyForm = { dia: '', horaInicio: '', horaFin: '' }

export default function DisponibilidadView({ onShowToast }) {
  const [module, setModule] = useState({ estado: 'CARGANDO', mensaje: '', horarios: [] })
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setModule(await getMyAvailability())
    } catch (error) {
      onShowToast(error.message || 'No se pudo cargar la disponibilidad', 'error')
    } finally {
      setLoading(false)
    }
  }, [onShowToast])

  useEffect(() => { load() }, [load])

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }))
  const hasFormData = Object.values(form).some(Boolean)

  const clearForm = () => {
    if (!hasFormData || window.confirm('¿Está seguro que desea cancelar y limpiar el formulario?')) {
      setForm(emptyForm)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form.dia || !form.horaInicio || !form.horaFin) {
      onShowToast('Complete el día, la hora de inicio y la hora de fin', 'error')
      return
    }
    if (form.horaFin <= form.horaInicio) {
      onShowToast('La hora de fin debe ser posterior a la hora de inicio', 'error')
      return
    }
    if (!window.confirm('¿Desea registrar este horario?')) return
    setSaving(true)
    try {
      await createAvailability({ dia: Number(form.dia), horaInicio: form.horaInicio, horaFin: form.horaFin })
      onShowToast('Horario registrado', 'success')
      setForm(emptyForm)
      await load()
    } catch (error) {
      onShowToast(error.message || 'No se pudo registrar el horario', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="periodos-container">
      <div className="periodos-heading">
        <div><p className="section-eyebrow">PORTAL DOCENTE</p><h1><CalendarClock size={28} /> Disponibilidad docente</h1></div>
      </div>
      {loading ? <p>Cargando disponibilidad...</p> : (
        <>
          <p className={`periodo-note ${module.estado === 'HABILITADO' ? '' : 'error'}`}>
            {module.mensaje}
          </p>
          {module.estado === 'HABILITADO' && (
            <form className="periodo-form" onSubmit={submit}>
              <div className="periodo-form-grid">
                <label>Día
                  <select required value={form.dia} onChange={(event) => setField('dia', event.target.value)}>
                    <option value="">Seleccione</option>
                    {days.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}
                  </select>
                </label>
                <label>Hora de inicio<input required type="time" value={form.horaInicio} onChange={(event) => setField('horaInicio', event.target.value)} /></label>
                <label>Hora de fin<input required type="time" value={form.horaFin} onChange={(event) => setField('horaFin', event.target.value)} /></label>
              </div>
              <div className="periodo-form-actions">
                <button type="button" className="btn-secondary" onClick={clearForm}><X size={16} /> Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}><Save size={16} /> {saving ? 'Guardando...' : 'Registrar disponibilidad'}</button>
              </div>
            </form>
          )}
          <div className="periodos-list">
            {module.horarios.length === 0 ? <p>No hay horarios registrados.</p> : module.horarios.map((horario) => (
              <article className="periodo-card" key={horario.id}>
                <div><h2>{days[horario.dia - 1]}</h2><p>{horario.horaInicio} a {horario.horaFin}</p></div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
