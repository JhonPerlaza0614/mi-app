import React, { useState } from 'react'
import { Plus, Search, Edit2, Trash2, BookOpen, Layers, AlertTriangle, Award } from 'lucide-react'
import { createPrograma, updatePrograma, deletePrograma } from '../services/academicService'

export default function ProgramasView({ 
  programas, 
  pensumList, 
  onRefresh, 
  onShowToast, 
  onSelectProgramForPensum 
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState(null)
  const [deletingProgram, setDeletingProgram] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    code_program: '',
    name_program: '',
    grupo: 1,
    numero_semestre: 10,
  })

  // Filtered programs
  const filteredProgramas = programas.filter(p => 
    p.code_program.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.name_program.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Count courses in pensum for each program
  const getCoursesCount = (code_program) => {
    return pensumList.filter(item => item.code_program === code_program).length
  }

  // Total credits in pensum for each program
  const getProgramCredits = (code_program) => {
    return pensumList
      .filter(item => item.code_program === code_program)
      .reduce((sum, item) => sum + (item.credits || 0), 0)
  }

  const handleOpenCreateModal = () => {
    setEditingProgram(null)
    setFormData({
      code_program: '',
      name_program: '',
      grupo: 1,
      numero_semestre: 10,
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (prog) => {
    setEditingProgram(prog)
    setFormData({
      code_program: prog.code_program,
      name_program: prog.name_program,
      grupo: prog.grupo,
      numero_semestre: prog.numero_semestre !== undefined && prog.numero_semestre !== null ? prog.numero_semestre : 10,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name_program.trim()) {
      onShowToast('El nombre del programa es obligatorio', 'error')
      return
    }

    const numSemestres = parseInt(formData.numero_semestre, 10)
    if (isNaN(numSemestres) || numSemestres < 1 || numSemestres > 20) {
      onShowToast('El número de semestres debe estar entre 1 y 20', 'error')
      return
    }

    setSubmitting(true)
    try {
      if (editingProgram) {
        await updatePrograma(editingProgram.code_program, {
          name_program: formData.name_program,
          grupo: formData.grupo,
          numero_semestre: numSemestres,
        })
        onShowToast('Programa actualizado correctamente', 'success')
      } else {
        if (!formData.code_program.trim()) {
          onShowToast('El código del programa es obligatorio', 'error')
          setSubmitting(false)
          return
        }
        await createPrograma({
          ...formData,
          numero_semestre: numSemestres,
        })
        onShowToast('Programa creado exitosamente', 'success')
      }
      setIsModalOpen(false)
      onRefresh()
    } catch (err) {
      onShowToast(`Error: ${err.message || 'No se pudo guardar el programa'}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingProgram) return
    setSubmitting(true)
    try {
      await deletePrograma(deletingProgram.code_program)
      onShowToast(`Programa ${deletingProgram.code_program} eliminado`, 'success')
      setDeletingProgram(null)
      onRefresh()
    } catch (err) {
      onShowToast(`Error al eliminar: ${err.message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="section-container">
      {/* Header Bar */}
      <div className="section-header">
        <div>
          <h1 className="section-title">Programas Académicos (Carreras)</h1>
          <p className="section-description">
            Gestiona los programas universitarios y sus grupos registrados en la base de datos.
          </p>
        </div>
        <button className="btn-primary" onClick={handleOpenCreateModal}>
          <Plus size={18} />
          <span>Nuevo Programa</span>
        </button>
      </div>

      {/* Control Bar: Search & Stats */}
      <div className="control-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por código o nombre de programa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="stats-pill">
          <span>Total programas: <strong>{programas.length}</strong></span>
        </div>
      </div>

      {/* Programas Grid */}
      {filteredProgramas.length === 0 ? (
        <div className="empty-state-card">
          <BookOpen size={48} className="empty-icon" />
          <h3>No se encontraron programas</h3>
          <p>
            {searchTerm 
              ? 'No hay programas que coincidan con la búsqueda.' 
              : 'Aún no hay carreras registradas. Crea una para comenzar a armar la malla curricular.'}
          </p>
          {!searchTerm && (
            <button className="btn-primary" onClick={handleOpenCreateModal}>
              <Plus size={16} /> Crear primer programa
            </button>
          )}
        </div>
      ) : (
        <div className="cards-grid">
          {filteredProgramas.map((prog) => {
            const count = getCoursesCount(prog.code_program)
            const credits = getProgramCredits(prog.code_program)
            return (
              <div key={prog.code_program} className="item-card">
                <div className="item-card-header">
                  <div className="badge-code">{prog.code_program}</div>
                  <div className="badge-group">Grupo {prog.grupo}</div>
                </div>

                <h3 className="item-card-title">{prog.name_program}</h3>

                <div className="item-card-meta">
                  <span className="meta-info">
                    <Layers size={15} />
                    {count} {count === 1 ? 'materia' : 'materias'}
                  </span>
                  <span className="meta-separator">•</span>
                  <span className="meta-info">
                    <Award size={15} />
                    {credits} {credits === 1 ? 'crédito' : 'créditos'}
                  </span>
                  <span className="meta-separator">•</span>
                  <span className="meta-info">
                    <BookOpen size={15} />
                    {prog.numero_semestre || 10} {prog.numero_semestre === 1 ? 'semestre' : 'semestres'}
                  </span>
                </div>

                <div className="item-card-actions">
                  <button
                    className="btn-link"
                    onClick={() => onSelectProgramForPensum(prog.code_program)}
                    title="Ver malla curricular"
                  >
                    Ver Malla
                  </button>

                  <div className="action-buttons-group">
                    <button
                      className="btn-icon"
                      onClick={() => handleOpenEditModal(prog)}
                      title="Editar programa"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="btn-icon text-danger"
                      onClick={() => setDeletingProgram(prog)}
                      title="Eliminar programa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Crear / Editar Programa */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>{editingProgram ? 'Editar Programa' : 'Nuevo Programa Académico'}</h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="code_program">Código del Programa *</label>
                  <input
                    id="code_program"
                    type="text"
                    placeholder="Ej. ING-SIS, ADM-EMP"
                    value={formData.code_program}
                    onChange={(e) => setFormData({ ...formData, code_program: e.target.value })}
                    disabled={!!editingProgram}
                    required
                  />
                  {editingProgram && (
                    <small className="form-hint">El código de programa es la clave primaria y no puede modificarse.</small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="name_program">Nombre del Programa / Carrera *</label>
                  <input
                    id="name_program"
                    type="text"
                    placeholder="Ej. Ingeniería de Sistemas y Computación"
                    value={formData.name_program}
                    onChange={(e) => setFormData({ ...formData, name_program: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="grupo">Grupo *</label>
                  <input
                    id="grupo"
                    type="number"
                    min="1"
                    value={formData.grupo}
                    onChange={(e) => setFormData({ ...formData, grupo: e.target.value })}
                    required
                  />
                  <small className="form-hint">Número identificador del grupo académico.</small>
                </div>

                <div className="form-group">
                  <label htmlFor="numero_semestre">Número de Semestres de la Carrera *</label>
                  <input
                    id="numero_semestre"
                    type="number"
                    min="1"
                    max="20"
                    placeholder="Ej. 10"
                    value={formData.numero_semestre}
                    onChange={(e) => setFormData({ ...formData, numero_semestre: e.target.value })}
                    required
                  />
                  <small className="form-hint">
                    Define la duración exacta y el total de semestres que se mostrarán en la malla curricular (ej. 10 para carreras profesionales, 6 para tecnologías).
                  </small>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : editingProgram ? 'Actualizar' : 'Crear Programa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {deletingProgram && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title-with-icon">
                <AlertTriangle className="text-danger" size={24} />
                <h2>Confirmar Eliminación</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setDeletingProgram(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>
                ¿Estás seguro de que deseas eliminar el programa <strong>{deletingProgram.name_program}</strong> ({deletingProgram.code_program})?
              </p>
              <div className="alert-warning-box">
                <p>
                  <strong>Atención:</strong> Debido a la restricción <code>ON DELETE CASCADE</code> en la base de datos, 
                  todas las materias asignadas a este programa en el pensum también se desvincularán automáticamente.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeletingProgram(null)}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDelete}
                disabled={submitting}
              >
                {submitting ? 'Eliminando...' : 'Sí, Eliminar Programa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
