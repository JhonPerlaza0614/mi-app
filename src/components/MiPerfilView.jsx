import React, { useState, useEffect } from 'react'
import {
    UserCircle,
    Mail,
    IdCard,
    Award,
    Briefcase,
    BookOpen,
    CheckCircle2,
    XCircle,
    Star,
    Shield,
    Phone
} from 'lucide-react'
import { getMiPerfil, getMiPerfilCoordinador } from '../services/docenteService'

// 1: Administrador, 2: Coordinador, 3: Docente (igual que en el login)
const ROLES = { 1: 'Administrador', 2: 'Coordinador', 3: 'Docente' }
const ROL_COORDINADOR = 2
const ROL_DOCENTE = 3

const TIPO_DOCENTE_LABEL = { NOMBRADO: 'Nombrado', HORA_CATEDRA: 'Hora cátedra' }
const CATEGORIA_LABEL = { AUXILIAR: 'Auxiliar', ASISTENTE: 'Asistente', ASOCIADO: 'Asociado', TITULAR: 'Titular' }

const cardStyle = {
    background: '#ffffff',
    border: '1px solid #e4e4e7',
    borderRadius: '12px',
    padding: '1.5rem'
}

function Row({ icon, label, children }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.92rem' }}>
            <span style={{ color: '#71717a', display: 'inline-flex' }}>{icon}</span>
            <span style={{ color: '#71717a', minWidth: '130px' }}>{label}</span>
            <span style={{ color: '#27272a', overflowWrap: 'anywhere' }}>{children}</span>
        </div>
    )
}

function Badge({ ok, okText, noText }) {
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: ok ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: ok ? '#059669' : '#dc2626'
            }}
        >
            {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {ok ? okText : noText}
        </span>
    )
}

export default function MiPerfilView({ user, onShowToast }) {
    const rol = user?.rol
    const rolNombre = user?.rolNombre || ROLES[rol] || 'Usuario'
    const esDocente = rol === ROL_DOCENTE
    const esCoordinador = rol === ROL_COORDINADOR

    // Datos adicionales solo para docentes
    const [docente, setDocente] = useState(null)
    const [docenteStatus, setDocenteStatus] = useState('idle') // idle | loading | ok | notfound | error
    const [fotoError, setFotoError] = useState(false)

    // Datos adicionales solo para coordinadores
    const [coordinador, setCoordinador] = useState(null)
    const [coordStatus, setCoordStatus] = useState('idle') // idle | loading | ok | notfound | error

    useEffect(() => {
        if (!esCoordinador || !user?.email) {
            setCoordStatus('idle')
            return
        }
        let cancelled = false
        setCoordStatus('loading')

        getMiPerfilCoordinador(user.email)
            .then((data) => {
                if (cancelled) return
                setCoordinador(data)
                setCoordStatus('ok')
            })
            .catch((err) => {
                if (cancelled) return
                if (err.status === 404) {
                    setCoordStatus('notfound')
                } else {
                    setCoordStatus('error')
                    onShowToast?.('No se pudo cargar tu perfil de coordinador', 'error')
                }
            })

        return () => {
            cancelled = true
        }
    }, [esCoordinador, user?.email])

    useEffect(() => {
        if (!esDocente || !user?.email) {
            setDocenteStatus('idle')
            return
        }
        let cancelled = false
        setDocenteStatus('loading')
        setFotoError(false)

        getMiPerfil(user.email)
            .then((data) => {
                if (cancelled) return
                setDocente(data)
                setDocenteStatus('ok')
            })
            .catch((err) => {
                if (cancelled) return
                if (err.status === 404) {
                    setDocenteStatus('notfound')
                } else {
                    setDocenteStatus('error')
                    onShowToast?.('No se pudo cargar tu perfil de docente', 'error')
                }
            })

        return () => {
            cancelled = true
        }
    }, [esDocente, user?.email])

    if (!user) {
        return (
            <div className="view-container">
                <div className="empty-state-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                    <UserCircle size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <h3>No hay una sesión activa</h3>
                    <p style={{ color: '#888' }}>Vuelve a iniciar sesión para ver tu perfil.</p>
                </div>
            </div>
        )
    }

    const nombreCompleto = `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || 'Usuario'
    const iniciales = `${user.nombre?.[0] ?? ''}${user.apellido?.[0] ?? ''}`.toUpperCase()
    const fotoUrl = docenteStatus === 'ok' && docente?.foto_url && !fotoError ? docente.foto_url : null

    const tieneEvaluacion = docente && docente.evaluacion_valor !== null && docente.evaluacion_valor !== undefined

    return (
        <div className="view-container">
            <div className="view-header">
                <div>
                    <h1 className="view-title flex-align-center" style={{ gap: '0.75rem' }}>
                        <UserCircle size={28} className="text-primary" />
                        Mi perfil
                    </h1>
                    <p className="view-subtitle">Información de tu cuenta (solo lectura)</p>
                </div>
            </div>

            {/* Datos generales del usuario con sesión */}
            <div style={{ ...cardStyle, display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0 }}>
                    {fotoUrl ? (
                        <img
                            src={fotoUrl}
                            alt={`Foto de ${nombreCompleto}`}
                            onError={() => setFotoError(true)}
                            style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #d4d4d8' }}
                        />
                    ) : (
                        <div
                            style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                background: '#f4f4f5',
                                border: '2px solid #d4d4d8',
                                color: '#52525b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2.2rem',
                                fontWeight: 600
                            }}
                            aria-label="Sin foto"
                        >
                            {iniciales || <UserCircle size={48} />}
                        </div>
                    )}
                </div>

                <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#18181b' }}>{nombreCompleto}</h2>
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.25rem 0.7rem',
                                borderRadius: '9999px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe'
                            }}
                        >
                            <Shield size={12} />
                            {rolNombre}
                        </span>
                    </div>

                    <Row icon={<UserCircle size={15} />} label="Nombre">{user.nombre || '—'}</Row>
                    <Row icon={<UserCircle size={15} />} label="Apellido">{user.apellido || '—'}</Row>
                    <Row icon={<Mail size={15} />} label="Correo">{user.email || '—'}</Row>
                    <Row icon={<Shield size={15} />} label="Rol">{rolNombre}</Row>
                </div>
            </div>

            {/* Perfil de coordinador: solo si el usuario tiene rol Coordinador */}
            {esCoordinador && (
                <div style={{ ...cardStyle, marginTop: '1.25rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#18181b' }}>Perfil de coordinador</h3>

                    {coordStatus === 'loading' && (
                        <div className="loading-state-container">
                            <div className="spinner"></div>
                            <p>Cargando perfil de coordinador...</p>
                        </div>
                    )}

                    {coordStatus === 'notfound' && (
                        <p style={{ margin: 0, color: '#52525b' }}>
                            Aún no tienes un perfil de coordinador registrado. Comunícate con el administrador para que lo cree.
                        </p>
                    )}

                    {coordStatus === 'error' && (
                        <p style={{ margin: 0, color: '#52525b' }}>
                            No se pudo cargar tu perfil de coordinador. Intenta de nuevo más tarde.
                        </p>
                    )}

                    {coordStatus === 'ok' && coordinador && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                            <div>
                                <Badge ok={coordinador.activo !== false} okText="Activo" noText="Inactivo" />
                            </div>
                            <Row icon={<IdCard size={15} />} label="Identificación">{coordinador.identificacion}</Row>
                            <Row icon={<Mail size={15} />} label="Correo institucional">{coordinador.correo_institucional}</Row>
                            {coordinador.correo && <Row icon={<Mail size={15} />} label="Correo personal">{coordinador.correo}</Row>}
                            {coordinador.telefono && <Row icon={<Phone size={15} />} label="Teléfono">{coordinador.telefono}</Row>}
                            <Row icon={<Award size={15} />} label="Categoría">{coordinador.categoria || 'No asignada'}</Row>
                            <Row icon={<Briefcase size={15} />} label="Tipo de contrato">{coordinador.tipo_contrato || 'No asignado'}</Row>
                            <Row icon={<BookOpen size={15} />} label="Programa">
                                {coordinador.name_program || coordinador.code_program || 'Sin programa asignado'}
                            </Row>
                        </div>
                    )}
                </div>
            )}

            {/* Perfil de docente: solo si el usuario tiene rol Docente */}
            {esDocente && (
                <div style={{ ...cardStyle, marginTop: '1.25rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#18181b' }}>Perfil de docente</h3>

                    {docenteStatus === 'loading' && (
                        <div className="loading-state-container">
                            <div className="spinner"></div>
                            <p>Cargando perfil de docente...</p>
                        </div>
                    )}

                    {docenteStatus === 'notfound' && (
                        <p style={{ margin: 0, color: '#52525b' }}>
                            Aún no tienes un perfil de docente registrado. Comunícate con el administrador para que lo cree.
                        </p>
                    )}

                    {docenteStatus === 'error' && (
                        <p style={{ margin: 0, color: '#52525b' }}>
                            No se pudo cargar tu perfil de docente. Intenta de nuevo más tarde.
                        </p>
                    )}

                    {docenteStatus === 'ok' && docente && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                            <div>
                                <Badge ok={docente.estado} okText="Activo" noText="Inactivo" />
                            </div>
                            <Row icon={<IdCard size={15} />} label="Código">{docente.codigo}</Row>
                            <Row icon={<IdCard size={15} />} label="Documento">
                                {docente.tipo_documento} {docente.numero_documento}
                            </Row>
                            {docente.telefono && <Row icon={<Phone size={15} />} label="Teléfono">{docente.telefono}</Row>}
                            <Row icon={<Briefcase size={15} />} label="Tipo de docente">
                                {TIPO_DOCENTE_LABEL[docente.tipo_docente] || docente.tipo_docente}
                            </Row>
                            <Row icon={<Award size={15} />} label="Categoría">
                                {CATEGORIA_LABEL[docente.categoria] || docente.categoria}
                            </Row>
                            <Row icon={<BookOpen size={15} />} label="Programa">
                                {docente.nombre_programa || docente.code_program}
                            </Row>
                            <Row icon={<Star size={15} />} label="Evaluación">
                                {tieneEvaluacion ? (
                                    <>
                                        {docente.evaluacion_valor}
                                        {docente.evaluacion_periodo && (
                                            <span style={{ color: '#52525b' }}> (periodo {docente.evaluacion_periodo})</span>
                                        )}
                                    </>
                                ) : (
                                    <span style={{ color: '#52525b' }}>Sin evaluación registrada</span>
                                )}
                            </Row>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}