import React, { useState, useEffect, useCallback } from 'react'
import Navbar from './components/Navbar'
import PensumView from './components/PensumView'
import ProgramasView from './components/ProgramasView'
import AsignaturasView from './components/AsignaturasView'
import SqlSetupModal from './components/SqlSetupModal'
import Toast from './components/Toast'
import { 
  getProgramas, 
  getAsignaturas, 
  getAllPensum, 
  checkDatabaseHealth 
} from './services/academicService'
import { AlertCircle, Database, RefreshCw } from 'lucide-react'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('pensum')
  const [programas, setProgramas] = useState([])
  const [asignaturas, setAsignaturas] = useState([])
  const [pensumList, setPensumList] = useState([])
  const [selectedProgramCode, setSelectedProgramCode] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [initialError, setInitialError] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
  }, [])

  // Carga global de datos desde Supabase
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    setInitialError(null)

    try {
      // Primero verificar estado de conexión
      const health = await checkDatabaseHealth()
      setIsConnected(health.connected)

      // Cargar en paralelo
      const [progs, asigs, pensum] = await Promise.all([
        getProgramas(),
        getAsignaturas(),
        getAllPensum(),
      ])

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
      console.error('Error al cargar datos desde Supabase:', err)
      setInitialError(err.message || 'Error al comunicarse con la base de datos')
      setIsConnected(false)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const health = await checkDatabaseHealth()
        if (!isMounted) return
        setIsConnected(health.connected)

        const [progs, asigs, pensum] = await Promise.all([
          getProgramas(),
          getAsignaturas(),
          getAllPensum(),
        ])
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
        console.error('Error al inicializar datos desde Supabase:', err)
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
  }, [])

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
      />

      {/* Alerta si ocurre un error de RLS o configuración */}
      {initialError && (
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
            <p>Conectando con Supabase y cargando mallas curriculares...</p>
          </div>
        ) : (
          <>
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

            {activeTab === 'programas' && (
              <ProgramasView
                programas={programas}
                pensumList={pensumList}
                onRefresh={() => loadData(true)}
                onShowToast={showToast}
                onSelectProgramForPensum={handleSelectProgramForPensum}
              />
            )}

            {activeTab === 'asignaturas' && (
              <AsignaturasView
                asignaturas={asignaturas}
                programas={programas}
                pensumList={pensumList}
                onRefresh={() => loadData(true)}
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
