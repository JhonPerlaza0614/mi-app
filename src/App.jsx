import React, { useState, useEffect, useCallback } from 'react'
import Navbar from './components/Navbar'
import PensumView from './components/PensumView'
import ProgramasView from './components/ProgramasView'
import AsignaturasView from './components/AsignaturasView'
import PlantillaView from './components/PlantillaView'
import PeriodosView from './components/PeriodosView'
import DedicatedInProgressView from './components/DedicatedInProgressView'
import MiPerfilView from './components/MiPerfilView'
import SqlSetupModal from './components/SqlSetupModal'
import Toast from './components/Toast'
import {
  getProgramas,
  getAsignaturas,
  getAllPensum,
  checkDatabaseHealth
} from './services/academicService'
import { AlertCircle, Database, RefreshCw, Sparkles, Clock } from 'lucide-react'
import './App.css'

export default function App({ user, onLogout }) {
  const rol = user?.rol ?? 1 // 1: Admin, 2: Coordinador, 3: Docente
  const isAdmin = rol === 1
  const isCoordinador = rol === 2
  const isDocente = rol === 3
  const canSeeAcademicData = isAdmin || isCoordinador

  // Docentes entran directamente a su portal dedicado
  const [activeTab, setActiveTab] = useState(() => {
    if (isDocente) return 'docente_portal'
    return 'pensum'
  })

  const [programas, setProgramas] = useState([])
  const [asignaturas, setAsignaturas] = useState([])
  const [pensumList, setPensumList] = useState([])
  const [selectedProgramCode, setSelectedProgramCode] = useState('')

  const [loading, setLoading] = useState(!isDocente)
  const [initialError, setInitialError] = useState(null)
  const [isConnected, setIsConnected] = useState(true)
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
  }, [])

  // Carga global de datos desde Backend / Supabase
  const loadData = useCallback(async (isSilent = false) => {
    if (isDocente) {
      setLoading(false)
      return
    }

    if (!isSilent) setLoading(true)
    setInitialError(null)

    try {
      const health = await checkDatabaseHealth()
      setIsConnected(health.connected)

      // Cargar en paralelo datos académicos si tiene permisos
      const [progs, asigs, pensum] = canSeeAcademicData
        ? await Promise.all([getProgramas(), getAsignaturas(), getAllPensum()])
        : [[], [], []]

      // Asociar nombres y créditos de asignaturas al pensum
      const asigMap = new Map(asigs.map(a => [a.code_course, a]))
      const enrichedPensum = pensum.map(item => {
        const asig = asigMap.get(item.code_course)
        return {
          ...item,
          name_course: asig?.name_course || item.code_course,
          credits: asig?.credits !== undefined && asig?.credits !== null ? asig.credits : 0,
        }
      })

      setProgramas(progs)
      setAsignaturas(asigs)
      setPensumList(enrichedPensum)

      // Si no hay programa seleccionado, seleccionar el primero
      if (progs.length > 0) {
        setSelectedProgramCode(prev => {
          const exists = progs.some(p => p.code_program === prev)
          return exists ? prev : progs[0].code_program
        })
      }
    } catch (err) {
      console.error('Error al cargar datos:', err)
      setInitialError(err.message || 'Error al comunicarse con la base de datos')
      setIsConnected(false)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [canSeeAcademicData, isDocente])

  useEffect(() => {
    let isMounted = true

    if (isDocente) {
      setLoading(false)
      return
    }

    const init = async () => {
      try {
        const health = await checkDatabaseHealth()
        if (!isMounted) return
        setIsConnected(health.connected)

        const [progs, asigs, pensum] = canSeeAcademicData
          ? await Promise.all([getProgramas(), getAsignaturas(), getAllPensum()])
          : [[], [], []]
        if (!isMounted) return

        const asigMap = new Map(asigs.map(a => [a.code_course, a]))
        const enrichedPensum = pensum.map(item => {
          const asig = asigMap.get(item.code_course)
          return {
            ...item,
            name_course: asig?.name_course || item.code_course,
            credits: asig?.credits !== undefined && asig?.credits !== null ? asig.credits : 0,
          }
        })

        setProgramas(progs)
        setAsignaturas(asigs)
        setPensumList(enrichedPensum)

        if (progs.length > 0) {
          setSelectedProgramCode(progs[0].code_program)
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Error al inicializar datos:', err)
        setInitialError(err.message || 'Error al comunicarse con la base de datos')
        setIsConnected(false)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    init()
    return () => {
      isMounted = false
    }
  }, [canSeeAcademicData, isDocente])

  const handleSelectProgramForPensum = (code) => {
    setSelectedProgramCode(code)
    setActiveTab('pensum')
  }

  return (
    <div className="app-layout">
      {/* Barra superior de navegación */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
        isConnected={isConnected}
        user={user}
        onLogout={onLogout}
      />

      {/* Banner de aviso para Coordinador cuando navega en asignaturas o pensum */}
      {isCoordinador && (activeTab === 'pensum' || activeTab === 'asignaturas') && (
        <div className="coordinador-info-banner">
          <div className="banner-content">
            <Sparkles size={18} className="banner-icon" />
            <div className="banner-text">
              <strong>Páginas dedicadas en progreso de creación</strong>
              <span className="banner-subtext"> — Tu cuenta de Coordinador(a) tiene acceso de consulta a Mallas Curriculares y Banco de Asignaturas.</span>
            </div>
          </div>
          <button
            type="button"
            className="btn-banner-link"
            onClick={() => setActiveTab('coordinador_portal')}
          >
            <Clock size={14} /> Ver Estado del Portal
          </button>
        </div>
      )}

      {/* Alerta si ocurre un error de RLS o configuración */}
      {initialError && !isDocente && (
        <div className="system-alert-banner">
          <div className="alert-content">
            <AlertCircle size={20} className="text-warning" />
            <div>
              <strong>Aviso de Base de Datos:</strong> {initialError}
              <p className="alert-hint">
                Si las tablas son nuevas o tienen RLS activado sin políticas, debes ejecutar el script SQL en Supabase para otorgar permisos.
              </p>
            </div>
          </div>
          <div className="alert-actions">
            <button className="btn-secondary btn-sm" onClick={() => setIsSqlModalOpen(true)}>
              <Database size={14} /> Ver Script SQL y Triggers
            </button>
            <button className="btn-primary btn-sm" onClick={() => loadData()}>
              <RefreshCw size={14} /> Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <main className="main-content">
        {loading ? (
          <div className="loading-state-container">
            <div className="spinner"></div>
            <p>Conectando con el sistema y cargando mallas curriculares...</p>
          </div>
        ) : (
          <>
            {/* Vistas Dedicadas en Progreso de Creación para Docentes y Coordinadores */}
            {(activeTab === 'docente_portal' || activeTab === 'coordinador_portal') && (
              <DedicatedInProgressView
                user={user}
                onNavigate={setActiveTab}
                onLogout={onLogout}
              />
            )}

            {/* Períodos Académicos (Resolución de Calendario) */}
            {activeTab === 'periodos' && (
              <PeriodosView user={user} onShowToast={showToast} />
            )}

            {/* Malla Curricular */}
            {activeTab === 'pensum' && (
              <PensumView
                programas={programas}
                asignaturas={asignaturas}
                selectedProgramCode={selectedProgramCode}
                setSelectedProgramCode={setSelectedProgramCode}
                pensumList={pensumList}
                onRefresh={() => loadData(true)}
                onShowToast={showToast}
                onNavigateToAsignaturas={() => setActiveTab('asignaturas')}
                onNavigateToProgramas={() => setActiveTab('programas')}
              />
            )}

            {/* Programas */}
            {activeTab === 'programas' && (
              <ProgramasView
                programas={programas}
                pensumList={pensumList}
                onRefresh={() => loadData(true)}
                onShowToast={showToast}
                onSelectProgramForPensum={handleSelectProgramForPensum}
              />
            )}

            {/* Banco de Asignaturas */}
            {activeTab === 'asignaturas' && (
              <AsignaturasView
                asignaturas={asignaturas}
                programas={programas}
                pensumList={pensumList}
                onRefresh={() => loadData(true)}
                onShowToast={showToast}
              />
            )}

            {/* Plantilla Administrativa */}
            {(activeTab === 'plantilla' || activeTab === 'coordinadores') && (
              <PlantillaView
                programas={programas}
                onShowToast={showToast}
              />
            )}

            {/* Mi Perfil */}
            {activeTab === 'mi-perfil' && (
              <MiPerfilView
                user={user}
                onShowToast={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* Modal de Configuración SQL */}
      <SqlSetupModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
        onRefreshData={() => loadData(true)}
      />

      {/* Notificaciones flotantes (Toast) */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
