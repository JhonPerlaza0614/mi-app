import React from 'react'
import { GraduationCap, BookOpen, Library, Layers, LogOut, Users, Clock, UserCircle } from 'lucide-react'

export default function Navbar({ activeTab, setActiveTab, isConnected, user, onLogout }) {
  const rol = user?.rol ?? 1 // 1: Admin, 2: Coordinador, 3: Docente

  const canSeePensum = rol === 1 || rol === 2
  const canSeeProgramas = rol === 1
  const canSeeAsignaturas = rol === 1 || rol === 2
  const canSeePlantilla = rol === 1
  const canSeePeriodos = rol === 1 || rol === 2 || rol === 3

  const rolLabel = rol === 1
    ? 'Administrador'
    : (rol === 2 ? 'Coordinador' : (rol === 3 ? 'Docente' : (user?.rolNombre || 'Usuario')))

  const handleBrandClick = () => {
    if (isDocente) {
      setActiveTab('docente_portal')
    } else if (canSeePensum) {
      setActiveTab('pensum')
    } else {
      setActiveTab('plantilla')
    }
  }

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand" onClick={() => setActiveTab(canSeePensum ? 'pensum' : 'periodos')}>
          <div className="brand-icon-bg">
            <GraduationCap size={24} className="brand-icon" />
          </div>
          <div className="brand-text">
            <span className="brand-title">Gestión de Mallas Curriculares</span>
            <span className="brand-subtitle">Pensum Académico Universitario</span>
          </div>
        </div>

        <nav className="navbar-links">
          {canSeePensum && (
            <button
              className={`nav-tab-btn ${activeTab === 'pensum' ? 'active' : ''}`}
              onClick={() => setActiveTab('pensum')}
            >
              <Layers size={18} />
              <span>Malla Curricular</span>
            </button>
          )}

          {canSeeProgramas && (
            <button
              className={`nav-tab-btn ${activeTab === 'programas' ? 'active' : ''}`}
              onClick={() => setActiveTab('programas')}
            >
              <BookOpen size={18} />
              <span>Programas (Carreras)</span>
            </button>
          )}

          {canSeeAsignaturas && (
            <button
              className={`nav-tab-btn ${activeTab === 'asignaturas' ? 'active' : ''}`}
              onClick={() => setActiveTab('asignaturas')}
            >
              <Library size={18} />
              <span>Banco de Asignaturas</span>
            </button>
          )}

          {canSeePlantilla && (
            <button
              className={`nav-tab-btn ${activeTab === 'plantilla' ? 'active' : ''}`}
              onClick={() => setActiveTab('plantilla')}
            >
              <Users size={18} />
              <span>Plantilla</span>
            </button>
          )}

          {canSeePeriodos && (
            <button
              className={`nav-tab-btn ${activeTab === 'periodos' ? 'active' : ''}`}
              onClick={() => setActiveTab('periodos')}
            >
              <Clock size={18} />
              <span>Portal Coordinador</span>
            </button>
          )}

          {isDocente && (
            <button
              className={`nav-tab-btn ${activeTab === 'docente_portal' ? 'active' : ''}`}
              onClick={() => setActiveTab('docente_portal')}
            >
              <Clock size={18} />
              <span>Portal Docente</span>
            </button>
          )}

          {/* Mi perfil: visible para todos los roles */}
          {user && (
            <button
              className={`nav-tab-btn ${activeTab === 'mi-perfil' ? 'active' : ''}`}
              onClick={() => setActiveTab('mi-perfil')}
            >
              <UserCircle size={18} />
              <span style={{ whiteSpace: 'nowrap' }}>Mi perfil</span>
            </button>
          )}
        </nav>

        <div className="navbar-actions">
          {user && (
            <div className="navbar-user" title={user.email || ''}>
              <span className="navbar-user-name">{user.nombre} {user.apellido}</span>
              <span className="navbar-user-role">{rolLabel}</span>
            </div>
          )}
          <div className={`status-pill ${isConnected ? 'online' : 'offline'}`} title="Estado de Conexión">
            <span className="status-dot"></span>
            <span>{isConnected ? 'Conectado' : 'Sin Conexión'}</span>
          </div>
          {onLogout && (
            <button type="button" className="navbar-logout-btn" onClick={onLogout} title="Cerrar sesión">
              <LogOut size={16} />
              <span>Salir</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}