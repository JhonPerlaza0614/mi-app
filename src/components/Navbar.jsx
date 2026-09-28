import React from 'react'
import { GraduationCap, BookOpen, Library, Database, Layers } from 'lucide-react'

export default function Navbar({ activeTab, setActiveTab, onOpenSqlModal, isConnected }) {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand" onClick={() => setActiveTab('pensum')}>
          <div className="brand-icon-bg">
            <GraduationCap size={24} className="brand-icon" />
          </div>
          <div className="brand-text">
            <span className="brand-title">Gestión de Mallas Curriculares</span>
            <span className="brand-subtitle">Pensum Académico Universitario</span>
          </div>
        </div>

        <nav className="navbar-links">
          <button
            className={`nav-tab-btn ${activeTab === 'pensum' ? 'active' : ''}`}
            onClick={() => setActiveTab('pensum')}
          >
            <Layers size={18} />
            <span>Malla Curricular</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'programas' ? 'active' : ''}`}
            onClick={() => setActiveTab('programas')}
          >
            <BookOpen size={18} />
            <span>Programas (Carreras)</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'asignaturas' ? 'active' : ''}`}
            onClick={() => setActiveTab('asignaturas')}
          >
            <Library size={18} />
            <span>Banco de Asignaturas</span>
          </button>
        </nav>

        <div className="navbar-actions">
          <div className={`status-pill ${isConnected ? 'online' : 'offline'}`} title="Estado de Supabase">
            <span className="status-dot"></span>
            <span>{isConnected ? 'Supabase Conectado' : 'Sin Conexión'}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
