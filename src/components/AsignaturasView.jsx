import React, { useState } from 'react'
import { Plus, Search, Edit2, Trash2, Library, BookOpen, AlertTriangle, Award } from 'lucide-react'
import { createAsignatura, updateAsignatura, deleteAsignatura } from '../services/academicService'

export default function AsignaturasView({ 
  asignaturas, 
  programas, 
  pensumList, 
  onRefresh, 
  onShowToast 
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAsignatura, setEditingAsignatura] = useState(null)
  const [deletingAsignatura, setDeletingAsignatura] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    code_course: '',
    name_course: '',
    credits: 3,
  })

  // Filtered courses
  const filteredAsignaturas = asignaturas.filter(a =>
    a.code_course.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.name_course.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Find programs where this course is taught
  const getProgramsForCourse = (code_course) => {
    const matchingPensum = pensumList.filter(item => item.code_course === code_course)
    const progCodes = new Set(matchingPensum.map(p => p.code_program))
    return programas.filter(p => progCodes.has(p.code_program))
  }

  const handleOpenCreateModal = () => {
    setEditingAsignatura(null)
    setFormData({
      code_course: '',
      name_course: '',
      credits: 3,
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (asig) => {
    setEditingAsignatura(asig)
    setFormData({
      code_course: asig.code_course,
      name_course: asig.name_course,
      credits: asig.credits !== undefined && asig.credits !== null ? asig.credits : 0,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name_course.trim()) {
      onShowToast('El nombre de la asignatura es obligatorio', 'error')
      return
    }

    const creditsNum = parseInt(formData.credits, 10)
    if (isNaN(creditsNum) || creditsNum < 0) {
      onShowToast('El número de créditos debe ser un número entero mayor o igual a 0', 'error')
      return
    }

    setSubmitting(true)
    try {
      if (editingAsignatura) {
        await updateAsignatura(editingAsignatura.code_course, {
          name_course: formData.name_course,
          credits: creditsNum,
        })
        onShowToast('Asignatura actualizada exitosamente', 'success')
      } else {
        if (!formData.code_course.trim()) {
          onShowToast('El código de la asignatura es obligatorio', 'error')
          setSubmitting(false)
          return
        }
        await createAsignatura({
          ...formData,
          credits: creditsNum,
        })
        onShowToast('Asignatura registrada exitosamente', 'success')
      }
      setIsModalOpen(false)
      onRefresh()
    } catch (err) {
      onShowToast(`Error: ${err.message || 'No se pudo guardar la asignatura'}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingAsignatura) return
    setSubmitting(true)
    try {
      await deleteAsignatura(deletingAsignatura.code_course)
      onShowToast(`Asignatura ${deletingAsignatura.code_course} eliminada`, 'success')
      setDeletingAsignatura(null)
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
          <h1 className="section-title">Banco Global de Asignaturas (Materias)</h1>
          <p className="section-description">
            Gestiona el catálogo de materias disponibles para ser incorporadas en cualquier pensum académico.
          </p>
        </div>
        <button className="btn-primary" onClick={handleOpenCreateModal}>
          <Plus size={18} />
          <span>Nueva Asignatura</span>
        </button>
      </div>

      {/* Control Bar */}
      <div className="control-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por código o nombre de materia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="stats-pill">
          <span>Total materias: <strong>{asignaturas.length}</strong></span>
          <span className="stats-separator">•</span>
          <span>Créditos en catálogo: <strong>{asignaturas.reduce((sum, a) => sum + (a.credits || 0), 0)}</strong></span>
        </div>
      </div>

      {/* Asignaturas Grid / Table */}
      {filteredAsignaturas.length === 0 ? (
        <div className="empty-state-card">
          <Library size={48} className="empty-icon" />
          <h3>No se encontraron asignaturas</h3>
          <p>
            {searchTerm 
              ? 'No hay materias que coincidan con la búsqueda.' 
              : 'Aún no hay asignaturas registradas en el catálogo. Crea una para comenzar.'}
          </p>
          {!searchTerm && (
            <button className="btn-primary" onClick={handleOpenCreateModal}>
              <Plus size={16} /> Crear primera asignatura
            </button>
          )}
        </div>
      ) : (
        <div className="cards-grid">
          {filteredAsignaturas.map((asig) => {
            const taughtPrograms = getProgramsForCourse(asig.code_course)
            return (
              <div key={asig.code_course} className="item-card course-card">
                <div className="item-card-header">
                  <div className="badge-code badge-course">{asig.code_course}</div>
                  <div className="header-badges-right">
                    <span className="badge-credits" title="Créditos académicos">
                      <Award size={12} />
                      {asig.credits ?? 0} {asig.credits === 1 ? 'crédito' : 'créditos'}
                    </span>
                    <div className="badge-count" title="Presente en estos programas">
                      {taughtPrograms.length} {taughtPrograms.length === 1 ? 'carrera' : 'carreras'}
                    </div>
                  </div>
                </div>

                <h3 className="item-card-title">{asig.name_course}</h3>

                <div className="course-programs-tags">
                  {taughtPrograms.length > 0 ? (
                    taughtPrograms.map(p => (
                      <span key={p.code_program} className="prog-tag" title={p.name_program}>
                        <BookOpen size={12} /> {p.code_program}
                      </span>
                    ))
                  ) : (
                    <span className="prog-tag-empty">Sin asignar a ningún pensum</span>
                  )}
                </div>

                <div className="item-card-actions">
                  <span className="course-credits-meta">
                    <Award size={14} className="text-primary" />
                    <strong>{asig.credits ?? 0}</strong> {asig.credits === 1 ? 'crédito académico' : 'créditos académicos'}
                  </span>
                  <div className="action-buttons-group">
                    <button
                      className="btn-icon"
                      onClick={() => handleOpenEditModal(asig)}
                      title="Editar asignatura"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="btn-icon text-danger"
                      onClick={() => setDeletingAsignatura(asig)}
                      title="Eliminar asignatura"
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

      {/* Modal Crear / Editar Asignatura */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>{editingAsignatura ? 'Editar Asignatura' : 'Nueva Asignatura'}</h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="code_course">Código de la Asignatura *</label>
                  <input
                    id="code_course"
                    type="text"
                    placeholder="Ej. MAT101, PROG-201, BD102"
                    value={formData.code_course}
                    onChange={(e) => setFormData({ ...formData, code_course: e.target.value })}
                    disabled={!!editingAsignatura}
                    required
                  />
                  {editingAsignatura ? (
                    <small className="form-hint">El código de la materia es clave primaria y no puede modificarse.</small>
                  ) : (
                    <small className="form-hint">El trigger de Supabase convertirá automáticamente las letras a mayúsculas.</small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="name_course">Nombre de la Asignatura *</label>
                  <input
                    id="name_course"
                    type="text"
                    placeholder="Ej. Cálculo Diferencial, Bases de Datos Relacionales"
                    value={formData.name_course}
                    onChange={(e) => setFormData({ ...formData, name_course: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="credits">Número de Créditos *</label>
                  <input
                    id="credits"
                    type="number"
                    min="0"
                    max="30"
                    placeholder="Ej. 3"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                    required
                  />
                  <small className="form-hint">
                    Cantidad de créditos académicos de esta materia (número entero de 0 o más).
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
                  {submitting ? 'Guardando...' : editingAsignatura ? 'Actualizar' : 'Crear Asignatura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {deletingAsignatura && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title-with-icon">
                <AlertTriangle className="text-danger" size={24} />
                <h2>Confirmar Eliminación</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setDeletingAsignatura(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>
                ¿Deseas eliminar la asignatura <strong>{deletingAsignatura.name_course}</strong> ({deletingAsignatura.code_course})?
              </p>
              <div className="alert-warning-box">
                <p>
                  <strong>Advertencia:</strong> Si esta asignatura está asignada a alguna carrera en la tabla <code>pensum_academico</code>, 
                  se desvinculará automáticamente por borrado en cascada (<code>ON DELETE CASCADE</code>).
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeletingAsignatura(null)}
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
                {submitting ? 'Eliminando...' : 'Sí, Eliminar Asignatura'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
