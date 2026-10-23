'use client'

import React, { useState, useEffect } from 'react'
import {
    UserPlus,
    Plus,
    Search,
    Mail,
    Phone,
    IdCard,
    BookOpen,
    CheckCircle2,
    XCircle,
    Award,
    Briefcase,
    AlertTriangle,
    HelpCircle
} from 'lucide-react'
import { getDocentes, createDocente, updateDocente } from '../services/docenteService'

// Opciones (value = lo que espera el backend)
const TIPOS_DOCUMENTO = [
    { value: 'CC', label: 'CC - Cédula de ciudadanía' },
    { value: 'CE', label: 'CE - Cédula de extranjería' },
    { value: 'PP', label: 'PP - Pasaporte' }
]

const TIPOS_DOCENTE = [
    { value: 'NOMBRADO', label: 'Nombrado' },
    { value: 'HORA_CATEDRA', label: 'Hora cátedra' }
]

const CATEGORIAS = [
    { value: 'AUXILIAR', label: 'Auxiliar' },
    { value: 'ASISTENTE', label: 'Asistente' },
    { value: 'ASOCIADO', label: 'Asociado' },
    { value: 'TITULAR', label: 'Titular' }
]

const labelOf = (list, value) => list.find((o) => o.value === value)?.label || value

const EMPTY_FORM = {
    codigo: '',
    nombres: '',
    apellidos: '',
    tipo_documento: '',
    numero_documento: '',
    correo_institucional: '',
    telefono: '',
    tipo_docente: '',
    categoria: '',
    code_program: '',
    foto_url: '',
    evaluacion_periodo: '',
    evaluacion_valor: ''
}

const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/
const SOLO_NUMEROS = /^[0-9]+$/
const CORREO_UNIVALLE = /^[a-zA-Z0-9._%+-]+@correounivalle\.edu\.co$/

// El backend (Spring) devuelve las claves de validación en camelCase
// (p. ej. "correoInstitucional"); el formulario usa snake_case.
const camelToSnake = (key) => key.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())

function validate(f) {
    const e = {}

    if (!f.codigo.trim()) e.codigo = 'El código del docente es obligatorio'
    else if (f.codigo.length > 20) e.codigo = 'El código no puede exceder 20 caracteres'

    if (!f.nombres.trim()) e.nombres = 'Los nombres son obligatorios'
    else if (f.nombres.length > 30) e.nombres = 'Los nombres no pueden exceder 30 caracteres'
    else if (!SOLO_LETRAS.test(f.nombres)) e.nombres = 'Los nombres solo pueden contener letras y espacios'

    if (!f.apellidos.trim()) e.apellidos = 'Los apellidos son obligatorios'
    else if (f.apellidos.length > 30) e.apellidos = 'Los apellidos no pueden exceder 30 caracteres'
    else if (!SOLO_LETRAS.test(f.apellidos)) e.apellidos = 'Los apellidos solo pueden contener letras y espacios'

    if (!f.tipo_documento) e.tipo_documento = 'El tipo de documento es obligatorio'

    if (!f.numero_documento.trim()) e.numero_documento = 'El número de documento es obligatorio'
    else if (f.numero_documento.length > 11) e.numero_documento = 'El número de documento no puede exceder 11 caracteres'
    else if (!SOLO_NUMEROS.test(f.numero_documento)) e.numero_documento = 'El número de documento solo puede contener números'

    if (!f.correo_institucional.trim()) e.correo_institucional = 'El correo institucional es obligatorio'
    else if (f.correo_institucional.length > 50) e.correo_institucional = 'El correo no puede exceder 50 caracteres'
    else if (!CORREO_UNIVALLE.test(f.correo_institucional.trim())) e.correo_institucional = 'El correo debe tener dominio @correounivalle.edu.co'

    if (f.telefono.length > 20) e.telefono = 'El teléfono no puede exceder 20 caracteres'

    if (!f.tipo_docente) e.tipo_docente = 'El tipo de docente es obligatorio'
    if (!f.categoria) e.categoria = 'La categoría es obligatoria'
    if (!f.code_program) e.code_program = 'El programa de adscripción es obligatorio'

    if (f.foto_url.trim()) {
        try {
            const u = new URL(f.foto_url.trim())
            if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error()
        } catch {
            e.foto_url = 'Ingresa una URL válida (http o https)'
        }
    }

    if (f.evaluacion_periodo.length > 10) e.evaluacion_periodo = 'El periodo no puede exceder 10 caracteres'
    if (f.evaluacion_valor !== '' && Number.isNaN(Number(f.evaluacion_valor))) {
        e.evaluacion_valor = 'El valor debe ser numérico'
    }
    if (f.evaluacion_valor !== '' && !f.evaluacion_periodo.trim()) {
        e.evaluacion_periodo = 'El periodo es obligatorio si hay un valor de evaluación'
    }

    return e
}

function buildPayload(f) {
    const opt = (v) => (v && v.trim() ? v.trim() : null)
    return {
        codigo: f.codigo.trim(),
        nombres: f.nombres.trim(),
        apellidos: f.apellidos.trim(),
        tipo_documento: f.tipo_documento,
        numero_documento: f.numero_documento.trim(),
        correo_institucional: f.correo_institucional.trim().toLowerCase(),
        telefono: opt(f.telefono),
        tipo_docente: f.tipo_docente,
        categoria: f.categoria,
        code_program: f.code_program,
        foto_url: opt(f.foto_url),
        evaluacion_periodo: opt(f.evaluacion_periodo),
        evaluacion_valor: f.evaluacion_valor === '' ? null : Number(f.evaluacion_valor)
    }
}

function Field({ label, required, error, children }) {
    return (
        <div className="form-group">
            <label>
                {label} {required && '*'}
            </label>
            {children}
            {error && (
                <small style={{ color: '#ef4444', fontSize: '0.78rem', display: 'block', marginTop: '0.25rem' }}>
                    {error}
                </small>
            )}
        </div>
    )
}

function ConfirmModal({ icon, title, children, confirmLabel, cancelLabel, onConfirm, onCancel, busy }) {
    return (
        <div className="modal-backdrop">
            <div className="modal-card" style={{ maxWidth: '440px' }}>
                <div className="modal-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {icon} {title}
                    </h3>
                </div>
                <div className="modal-body">{children}</div>
                <div className="modal-footer">
                    <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
                        {cancelLabel}
                    </button>
                    <button type="button" className="btn-primary" onClick={onConfirm} disabled={busy}>
                        {busy ? 'Guardando...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function CrearDocenteView({ programas = [], onShowToast, onSaved }) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [formData, setFormData] = useState(EMPTY_FORM)
    const [errors, setErrors] = useState({})
    const [confirmOpen, setConfirmOpen] = useState(false) // "¿La información es correcta?"
    const [cancelOpen, setCancelOpen] = useState(false) // "¿Seguro que desea cancelar?"
    const [existingId, setExistingId] = useState(null) // 409: docente ya existe
    const [submitting, setSubmitting] = useState(false)

    // Listado y buscadores
    const [docentes, setDocentes] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [programFilter, setProgramFilter] = useState('ALL')
    const [categoryFilter, setCategoryFilter] = useState('ALL')
    const [typeFilter, setTypeFilter] = useState('ALL')

    const loadDocentes = async () => {
        setLoading(true)
        try {
            const data = await getDocentes()
            setDocentes(data || [])
        } catch (err) {
            console.error('Error al cargar docentes:', err)
            onShowToast?.('No se pudo cargar la lista de docentes', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadDocentes()
    }, [])

    const filteredDocentes = docentes.filter((d) => {
        const term = searchTerm.trim().toLowerCase()
        const matchesSearch =
            !term ||
            [
                `${d.nombres} ${d.apellidos}`,
                d.codigo,
                d.numero_documento,
                d.correo_institucional,
                d.nombre_programa,
                labelOf(CATEGORIAS, d.categoria),
                labelOf(TIPOS_DOCENTE, d.tipo_docente)
            ].some((v) => (v || '').toString().toLowerCase().includes(term))

        const matchesProgram = programFilter === 'ALL' || d.code_program === programFilter
        const matchesCategory = categoryFilter === 'ALL' || d.categoria === categoryFilter
        const matchesType = typeFilter === 'ALL' || d.tipo_docente === typeFilter

        return matchesSearch && matchesProgram && matchesCategory && matchesType
    })

    const hasActiveFilters =
        searchTerm.trim() !== '' || programFilter !== 'ALL' || categoryFilter !== 'ALL' || typeFilter !== 'ALL'

    const isDirty = JSON.stringify(formData) !== JSON.stringify(EMPTY_FORM)

    const update = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }))
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setFormData(EMPTY_FORM)
        setErrors({})
        setExistingId(null)
    }

    const finishSuccess = (saved, message) => {
        onShowToast?.(message, 'success')
        closeModal()
        loadDocentes()
        onSaved?.(saved)
    }

    const handleApiError = (err) => {
        // 400 con errores por campo
        if (err.status === 400 && err.body?.errors) {
            const mapped = {}
            Object.entries(err.body.errors).forEach(([key, msg]) => {
                mapped[camelToSnake(key)] = msg
            })
            setErrors(mapped)
            onShowToast?.('Revisa los campos marcados', 'warning')
            return
        }
        // 400 con mensaje general (programa inexistente, evaluación incompleta, etc.)
        if (err.status === 400) {
            onShowToast?.(err.message, 'warning')
            return
        }
        // 409 por documento repetido: ofrecer actualizar
        if (err.status === 409 && err.body?.docente_existente_id) {
            setExistingId(err.body.docente_existente_id)
            return
        }
        // 409 por código o correo repetidos
        if (err.status === 409) {
            onShowToast?.(err.message, 'error')
            return
        }
        // 500 o sin conexión: no se borra lo escrito
        onShowToast?.('No se pudo guardar. Intente de nuevo', 'error')
    }

    // Botón "Guardar": valida y pide confirmación
    const handleSave = (e) => {
        e.preventDefault()
        const found = validate(formData)
        setErrors(found)
        if (Object.keys(found).length > 0) {
            onShowToast?.('Revisa los campos marcados', 'warning')
            return
        }
        setConfirmOpen(true)
    }

    // "Sí" en la confirmación: envía el POST
    const submitCreate = async () => {
        setConfirmOpen(false)
        setSubmitting(true)
        try {
            const created = await createDocente(buildPayload(formData))
            finishSuccess(created, 'Perfil de docente creado')
        } catch (err) {
            handleApiError(err)
        } finally {
            setSubmitting(false)
        }
    }

    // 409 → "Sí, actualizar": PUT con los datos nuevos
    const submitUpdate = async () => {
        const id = existingId
        setSubmitting(true)
        try {
            const updated = await updateDocente(id, buildPayload(formData))
            finishSuccess(updated, 'Perfil de docente actualizado')
        } catch (err) {
            setExistingId(null)
            handleApiError(err)
        } finally {
            setSubmitting(false)
        }
    }

    // Cancelar o cerrar (×): confirma solo si hay datos escritos
    const handleCancelClick = () => {
        if (isDirty) setCancelOpen(true)
        else closeModal()
    }

    const confirmCancel = () => {
        setCancelOpen(false)
        closeModal()
    }

    return (
        <div className="view-container">
            {/* Encabezado */}
            <div className="view-header">
                <div>
                    <h1 className="view-title flex-align-center" style={{ gap: '0.75rem' }}>
                        <UserPlus size={28} className="text-primary" />
                        Gestión de Docentes
                    </h1>
                    <p className="view-subtitle">Registra los perfiles de docentes y su programa de adscripción</p>
                </div>
                <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} />
                    <span>Nuevo Docente</span>
                </button>
            </div>

            {/* Barra de búsqueda y filtros */}
            <div
                className="view-filters-card"
                style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}
            >
                <div className="search-box-wrapper" style={{ flex: 1, minWidth: '220px' }}>
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Buscar por nombre, código, documento, correo, programa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <select
                    className="filter-select"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={{ minWidth: '160px' }}
                >
                    <option value="ALL">Todos los tipos</option>
                    {TIPOS_DOCENTE.map((t) => (
                        <option key={t.value} value={t.value}>
                            Tipo: {t.label}
                        </option>
                    ))}
                </select>

                <select
                    className="filter-select"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{ minWidth: '160px' }}
                >
                    <option value="ALL">Todas las categorías</option>
                    {CATEGORIAS.map((c) => (
                        <option key={c.value} value={c.value}>
                            Categoría: {c.label}
                        </option>
                    ))}
                </select>

                <select
                    className="filter-select"
                    value={programFilter}
                    onChange={(e) => setProgramFilter(e.target.value)}
                    style={{ minWidth: '180px' }}
                >
                    <option value="ALL">Todos los programas</option>
                    {programas.map((p) => (
                        <option key={p.code_program} value={p.code_program}>
                            {p.name_program} ({p.code_program})
                        </option>
                    ))}
                </select>
            </div>

            {/* Lista de docentes */}
            {loading ? (
                <div className="loading-state-container">
                    <div className="spinner"></div>
                    <p>Cargando docentes...</p>
                </div>
            ) : filteredDocentes.length === 0 ? (
                <div className="empty-state-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                    <UserPlus size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <h3>No se encontraron docentes</h3>
                    <p style={{ color: 'var(--text-muted, #888)', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
                        {hasActiveFilters
                            ? 'No hay registros que coincidan con la búsqueda o los filtros aplicados.'
                            : 'Aún no se han registrado docentes en el sistema. Registra el primero con el botón de abajo.'}
                    </p>
                    {!hasActiveFilters && (
                        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                            <Plus size={16} /> Registrar Primer Docente
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
                    {filteredDocentes.map((d) => (
                        <div
                            key={d.id}
                            style={{
                                background: '#ffffff',
                                border: '1px solid #e4e4e7',
                                borderRadius: '12px',
                                padding: '1.25rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.9rem'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#18181b' }}>
                                        {d.nombres} {d.apellidos}
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.85rem', color: '#52525b' }}>
                                        <IdCard size={14} />
                                        <span>
                                            Código: <strong>{d.codigo}</strong> · {d.tipo_documento} {d.numero_documento}
                                        </span>
                                    </div>
                                </div>
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        padding: '0.25rem 0.6rem',
                                        borderRadius: '9999px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        background: d.estado ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                        color: d.estado ? '#059669' : '#dc2626'
                                    }}
                                >
                                    {d.estado ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                    {d.estado ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {[
                                    { icon: <Award size={13} />, text: labelOf(CATEGORIAS, d.categoria), title: 'Categoría' },
                                    { icon: <Briefcase size={13} />, text: labelOf(TIPOS_DOCENTE, d.tipo_docente), title: 'Tipo de docente' },
                                    { icon: <BookOpen size={13} />, text: d.nombre_programa || d.code_program, title: 'Programa' }
                                ].map((b) => (
                                    <span
                                        key={b.title}
                                        title={b.title}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                            background: '#f4f4f5',
                                            border: '1px solid #e4e4e7',
                                            color: '#3f3f46',
                                            padding: '0.25rem 0.6rem',
                                            borderRadius: '6px',
                                            fontSize: '0.76rem',
                                            fontWeight: 500,
                                            maxWidth: '240px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {b.icon}
                                        <span>{b.text}</span>
                                    </span>
                                ))}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: '#3f3f46' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Mail size={14} style={{ color: '#71717a', flexShrink: 0 }} />
                                    <a href={'mailto:' + d.correo_institucional} style={{ color: '#2563eb', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {d.correo_institucional}
                                    </a>
                                </div>
                                {d.telefono && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Phone size={14} style={{ color: '#71717a', flexShrink: 0 }} />
                                        <span>{d.telefono}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de creación */}
            {isModalOpen && (
                <div className="modal-backdrop">
                    <div className="modal-card" style={{ maxWidth: '680px', width: '100%' }}>
                        <div className="modal-header">
                            <h3>Crear perfil de docente</h3>
                            <button type="button" className="btn-close" onClick={handleCancelClick} disabled={submitting}>
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSave} noValidate>
                            <div
                                className="modal-body"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                    gap: '1rem',
                                    maxHeight: '65vh',
                                    overflowY: 'auto'
                                }}
                            >
                                <Field label="Código de docente" required error={errors.codigo}>
                                    <input
                                        type="text"
                                        maxLength={20}
                                        placeholder="Ej. 1001"
                                        value={formData.codigo}
                                        onChange={(e) => update('codigo', e.target.value)}
                                    />
                                </Field>

                                <Field label="Nombres" required error={errors.nombres}>
                                    <input
                                        type="text"
                                        maxLength={30}
                                        placeholder="Ej. Juan Carlos"
                                        value={formData.nombres}
                                        onChange={(e) => update('nombres', e.target.value)}
                                    />
                                </Field>

                                <Field label="Apellidos" required error={errors.apellidos}>
                                    <input
                                        type="text"
                                        maxLength={30}
                                        placeholder="Ej. Pérez López"
                                        value={formData.apellidos}
                                        onChange={(e) => update('apellidos', e.target.value)}
                                    />
                                </Field>

                                <Field label="Tipo de documento" required error={errors.tipo_documento}>
                                    <select value={formData.tipo_documento} onChange={(e) => update('tipo_documento', e.target.value)}>
                                        <option value="">-- Selecciona --</option>
                                        {TIPOS_DOCUMENTO.map((t) => (
                                            <option key={t.value} value={t.value}>
                                                {t.label}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="Número de documento" required error={errors.numero_documento}>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={11}
                                        placeholder="Ej. 10234567"
                                        value={formData.numero_documento}
                                        onChange={(e) => update('numero_documento', e.target.value)}
                                    />
                                </Field>

                                <Field label="Correo institucional" required error={errors.correo_institucional}>
                                    <input
                                        type="email"
                                        maxLength={50}
                                        placeholder="nombre.apellido@correounivalle.edu.co"
                                        value={formData.correo_institucional}
                                        onChange={(e) => update('correo_institucional', e.target.value)}
                                    />
                                </Field>

                                <Field label="Teléfono" error={errors.telefono}>
                                    <input
                                        type="text"
                                        maxLength={20}
                                        placeholder="Ej. 3001234567"
                                        value={formData.telefono}
                                        onChange={(e) => update('telefono', e.target.value)}
                                    />
                                </Field>

                                <Field label="Tipo de docente" required error={errors.tipo_docente}>
                                    <select value={formData.tipo_docente} onChange={(e) => update('tipo_docente', e.target.value)}>
                                        <option value="">-- Selecciona --</option>
                                        {TIPOS_DOCENTE.map((t) => (
                                            <option key={t.value} value={t.value}>
                                                {t.label}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="Categoría" required error={errors.categoria}>
                                    <select value={formData.categoria} onChange={(e) => update('categoria', e.target.value)}>
                                        <option value="">-- Selecciona --</option>
                                        {CATEGORIAS.map((c) => (
                                            <option key={c.value} value={c.value}>
                                                {c.label}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="Programa de adscripción" required error={errors.code_program}>
                                    <select value={formData.code_program} onChange={(e) => update('code_program', e.target.value)}>
                                        <option value="">-- Selecciona --</option>
                                        {programas.map((p) => (
                                            <option key={p.code_program} value={p.code_program}>
                                                {p.name_program} ({p.code_program})
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="Foto (URL)" error={errors.foto_url}>
                                    <input
                                        type="url"
                                        placeholder="https://ejemplo.com/foto.jpg"
                                        value={formData.foto_url}
                                        onChange={(e) => update('foto_url', e.target.value)}
                                    />
                                </Field>

                                <Field label="Evaluación - Periodo" error={errors.evaluacion_periodo}>
                                    <input
                                        type="text"
                                        maxLength={10}
                                        placeholder="Ej. 2025-1"
                                        value={formData.evaluacion_periodo}
                                        onChange={(e) => update('evaluacion_periodo', e.target.value)}
                                    />
                                </Field>

                                <Field label="Evaluación - Valor" error={errors.evaluacion_valor}>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Ej. 4.5"
                                        value={formData.evaluacion_valor}
                                        onChange={(e) => update('evaluacion_valor', e.target.value)}
                                    />
                                </Field>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={handleCancelClick} disabled={submitting}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary" disabled={submitting}>
                                    {submitting ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* confirmación antes de enviar */}
            {confirmOpen && (
                <ConfirmModal
                    icon={<HelpCircle size={20} />}
                    title="Confirmar"
                    confirmLabel="Sí"
                    cancelLabel="No"
                    onConfirm={submitCreate}
                    onCancel={() => setConfirmOpen(false)}
                >
                    <p>¿La información es correcta?</p>
                </ConfirmModal>
            )}

            {/* confirmar cancelación si hay datos */}
            {cancelOpen && (
                <ConfirmModal
                    icon={<AlertTriangle size={20} />}
                    title="Cancelar"
                    confirmLabel="Sí, cancelar"
                    cancelLabel="Volver al formulario"
                    onConfirm={confirmCancel}
                    onCancel={() => setCancelOpen(false)}
                >
                    <p>¿Seguro que desea cancelar? Se perderán los datos ingresados.</p>
                </ConfirmModal>
            )}

            {/* el documento ya existe */}
            {existingId && (
                <ConfirmModal
                    icon={<AlertTriangle size={20} />}
                    title="Docente existente"
                    confirmLabel="Sí, actualizar"
                    cancelLabel="No"
                    busy={submitting}
                    onConfirm={submitUpdate}
                    onCancel={() => setExistingId(null)}
                >
                    <p>Ya existe esta persona. ¿Desea actualizarla?</p>
                </ConfirmModal>
            )}
        </div>
    )
}