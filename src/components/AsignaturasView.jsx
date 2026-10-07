import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Library, BookOpen, AlertTriangle, Award, Sparkles, Building2 } from 'lucide-react'
import { createAsignatura, updateAsignatura, deleteAsignatura, getFacultades, createFacultad } from '../services/academicService'

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
  const [facultadesList, setFacultadesList] = useState([])

  // Inline creación de nuevas facultades en la BD (id, nombre, descripcion)
  const [isAddingNewFacultad, setIsAddingNewFacultad] = useState(false)
  const [newFacultadName, setNewFacultadName] = useState('')
  const [newFacultadDesc, setNewFacultadDesc] = useState('')
  const [addingFacultadSubmitting, setAddingFacultadSubmitting] = useState(false)

  // Cargar facultades desde la tabla 'Facultad' de la base de datos Supabase
  const loadFacultadesFromDb = async () => {
    try {
      const data = await getFacultades()
      if (data) {
        setFacultadesList(data)
      }
    } catch (err) {
      console.warn('Error al obtener facultades de la BD:', err)
    }
  }

  useEffect(() => {
    loadFacultadesFromDb()
  }, [])

  // Form state
  const [formData, setFormData] = useState({
    code_course: '',
    name_course: '',
    credits: 3,
    is_elective: false,
    es_complementaria: false,
    es_basica: false,
    id_facultad: ''
  })

  // Filtered courses
  const filteredAsignaturas = asignaturas.filter(a => {
    const facObj = facultadesList.find(f => String(f.id) === String(a.id_facultad || a.facultad))
    const facName = facObj ? (facObj.nombre || facObj.Nombre || '') : ''
    const query = searchTerm.toLowerCase()
    return (
      a.code_course.toLowerCase().includes(query) ||
      a.name_course.toLowerCase().includes(query) ||
      facName.toLowerCase().includes(query) ||
      (a.id_facultad && String(a.id_facultad).includes(query))
    )
  })

  // Find programs where this course is taught
  const getProgramsForCourse = (code_course) => {
    const matchingPensum = pensumList.filter(item => item.code_course === code_course)
    const progCodes = new Set(matchingPensum.map(p => p.code_program))
    return programas.filter(p => progCodes.has(p.code_program))
  }

  const handleOpenCreateModal = async (isElectivePreset = false) => {
    setEditingAsignatura(null)
    setIsAddingNewFacultad(false)
    setNewFacultadName('')
    setNewFacultadDesc('')
    
    await loadFacultadesFromDb()
    
    setFormData({
      code_course: '',
      name_course: '',
      credits: isElectivePreset ? '' : 3,
      is_elective: isElectivePreset,
      es_complementaria: false,
      es_basica: false,
      id_facultad: ''
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = async (asig) => {
    setEditingAsignatura(asig)
    setIsAddingNewFacultad(false)
    setNewFacultadName('')
    setNewFacultadDesc('')
    
    await loadFacultadesFromDb()

    setFormData({
      code_course: asig.code_course,
      name_course: asig.name_course,
      credits: asig.credits !== undefined && asig.credits !== null && asig.credits > 0 ? asig.credits : '',
      is_elective: Boolean(asig.is_elective || asig.name_course?.toLowerCase().includes('electiv')),
      es_complementaria: Boolean(asig.es_complementaria),
      es_basica: Boolean(asig.es_basica),
      id_facultad: asig.id_facultad ? String(asig.id_facultad) : ''
    })
    setIsModalOpen(true)
  }

  const handleToggleElective = (checked) => {
    setFormData(prev => {
      const newEsComplementaria = checked ? prev.es_complementaria : false
      const newEsBasica = checked ? false : prev.es_basica
      let newIdFacultad = prev.id_facultad
      if (checked && newEsComplementaria) {
        newIdFacultad = '2'
      } else if (!checked && newEsBasica) {
        newIdFacultad = '3'
      } else if (!checked && prev.id_facultad === '2') {
        newIdFacultad = ''
      }
      return {
        ...prev,
        is_elective: checked,
        credits: checked && prev.credits === 3 ? '' : prev.credits,
        es_complementaria: newEsComplementaria,
        es_basica: newEsBasica,
        id_facultad: newIdFacultad
      }
    })
  }

  const handleToggleComplementaria = (checked) => {
    if (checked) setIsAddingNewFacultad(false)
    setFormData(prev => ({
      ...prev,
      es_complementaria: checked,
      es_basica: false,
      id_facultad: checked ? '2' : (prev.id_facultad === '2' ? '' : prev.id_facultad)
    }))
  }

  const handleToggleBasica = (checked) => {
    if (checked) setIsAddingNewFacultad(false)
    setFormData(prev => ({
      ...prev,
      es_basica: checked,
      es_complementaria: false,
      id_facultad: checked ? '3' : (prev.id_facultad === '3' ? '' : prev.id_facultad)
    }))
  }

  const handleCreateNewFacultadInDb = async () => {
    if (!newFacultadName.trim()) {
      onShowToast('Ingresa el nombre de la nueva facultad para la BD', 'error')
      return
    }

    setAddingFacultadSubmitting(true)
    try {
      const created = await createFacultad({ 
        nombre: newFacultadName.trim(),
        descripcion: newFacultadDesc.trim()
      })
      onShowToast(`Facultad "${newFacultadName}" guardada en la tabla 'Facultad' de la BD`, 'success')
      setNewFacultadName('')
      setNewFacultadDesc('')
      setIsAddingNewFacultad(false)
      
      const updatedFacultades = await getFacultades()
      setFacultadesList(updatedFacultades)
      if (created && created.id) {
        setFormData(prev => ({ ...prev, id_facultad: String(created.id) }))
      }
    } catch (err) {
      onShowToast(`Error al guardar facultad en BD: ${err.message}`, 'error')
    } finally {
      setAddingFacultadSubmitting(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nameClean = formData.name_course.trim()

    if (!nameClean) {
      onShowToast('El nombre de la asignatura es obligatorio', 'error')
      return
    }

    let codeClean = formData.code_course.trim().toUpperCase()
    if (!editingAsignatura && !codeClean) {
      onShowToast('El código de la asignatura es obligatorio', 'error')
      return
    }

    const creditsParsed = parseInt(formData.credits, 10)
    const creditsNum = isNaN(creditsParsed) || creditsParsed < 0 ? 0 : creditsParsed

    setSubmitting(true)
    try {
      if (editingAsignatura) {
        await updateAsignatura(editingAsignatura.code_course, {
          name_course: nameClean,
          credits: creditsNum,
          is_elective: formData.is_elective,
          es_complementaria: formData.es_complementaria,
          es_basica: formData.es_basica,
          id_facultad: formData.id_facultad
        })
        onShowToast('Asignatura actualizada exitosamente', 'success')
      } else {
        if (!codeClean) {
          onShowToast('El código de la asignatura es obligatorio', 'error')
          setSubmitting(false)
          return
        }
        await createAsignatura({
          code_course: codeClean,
          name_course: nameClean,
          credits: creditsNum,
          is_elective: formData.is_elective,
          es_complementaria: formData.es_complementaria,
          es_basica: formData.es_basica,
          id_facultad: formData.id_facultad
        })
        onShowToast(formData.is_elective ? 'Electiva registrada exitosamente' : 'Asignatura registrada exitosamente', 'success')
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
            Gestiona el catálogo de materias y electivas disponibles, asociadas directamente a las facultades de la Base de Datos.
          </p>
        </div>
        <div className="section-header-actions" style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={() => handleOpenCreateModal(true)} title="Crear una materia electiva">
            <Sparkles size={18} className="text-purple" />
            <span>+ Crear Electiva</span>
          </button>
          <button className="btn-primary" onClick={() => handleOpenCreateModal(false)}>
            <Plus size={18} />
            <span>Nueva Asignatura</span>
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="control-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por código, nombre o facultad de la BD..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="stats-pill">
          <span>Total materias: <strong>{asignaturas.length}</strong></span>
          <span className="stats-separator">•</span>
          <span>Facultades en BD: <strong>{facultadesList.length}</strong></span>
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
            <button className="btn-primary" onClick={() => handleOpenCreateModal(false)}>
              <Plus size={16} /> Crear primera asignatura
            </button>
          )}
        </div>
      ) : (
        <div className="cards-grid">
          {filteredAsignaturas.map((asig) => {
            const taughtPrograms = getProgramsForCourse(asig.code_course)
            const isElective = asig.is_elective || asig.name_course?.toLowerCase().includes('electiv')
            const facObj = facultadesList.find(f => String(f.id) === String(asig.id_facultad))
            const facDisplayName = facObj ? (facObj.nombre || facObj.Nombre) : (asig.id_facultad ? `Facultad ID ${asig.id_facultad}` : null)
            return (
              <div key={asig.code_course} className="item-card course-card">
                <div className="item-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <div className="badge-code badge-course">{asig.code_course}</div>
                    {isElective && (
                      <span className="pensum-elective-pill" title="Asignatura Electiva">
                        <Sparkles size={11} /> Electiva
                      </span>
                    )}
                    {asig.es_complementaria && (
                      <span className="pensum-elective-pill" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' }} title="Asignatura Complementaria (Facultad ID 2)">
                        Complementaria
                      </span>
                    )}
                    {asig.es_basica && (
                      <span className="pensum-elective-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }} title="Asignatura Básica (Facultad ID 3)">
                        Básica
                      </span>
                    )}
                    {facDisplayName && (
                      <span className="badge-group" title="Facultad de la BD" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Building2 size={11} /> {facDisplayName}
                      </span>
                    )}
                  </div>
                  <div className="header-badges-right">
                    <span className="badge-credits" title="Créditos académicos">
                      <Award size={12} />
                      {asig.credits && asig.credits > 0 ? `${asig.credits} ${asig.credits === 1 ? 'crédito' : 'créditos'}` : '? créditos'}
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
                    <strong>{asig.credits && asig.credits > 0 ? asig.credits : '?'}</strong> {asig.credits === 1 ? 'crédito académico' : 'créditos académicos'}
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
              <h2>{editingAsignatura ? 'Editar Asignatura' : formData.is_elective ? 'Nueva Electiva' : 'Nueva Asignatura'}</h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Apartado para Settear 'Es Electiva: Verdadero/Falso' y Seleccionar Grupo traído de la BD */}
                <div className="elective-group-setting-card">
                  <div className="setting-row">
                    <label className="checkbox-setting-label">
                      <input
                        type="checkbox"
                        checked={formData.is_elective}
                        onChange={(e) => handleToggleElective(e.target.checked)}
                        className="checkbox-input-custom"
                      />
                      <span className="checkbox-label-text">
                        <Sparkles size={16} className={formData.is_elective ? 'text-purple' : 'text-muted'} />
                        <strong>Es Electiva:</strong>{' '}
                        {formData.is_elective ? (
                          <span className="badge-true">Verdadero (Sí)</span>
                        ) : (
                          <span className="badge-false">Falso (No)</span>
                        )}
                      </span>
                    </label>
                  </div>

                  <div className="setting-row" style={{ marginTop: '0.5rem', opacity: formData.is_elective ? 1 : 0.5 }}>
                    <label 
                      className="checkbox-setting-label"
                      style={{ cursor: formData.is_elective ? 'pointer' : 'not-allowed' }}
                      title={!formData.is_elective ? 'Solo se puede activar si "Es Electiva" está marcada' : ''}
                    >
                      <input
                        type="checkbox"
                        checked={formData.es_complementaria}
                        disabled={!formData.is_elective}
                        onChange={(e) => handleToggleComplementaria(e.target.checked)}
                        className="checkbox-input-custom"
                      />
                      <span className="checkbox-label-text">
                        <BookOpen size={16} className={formData.es_complementaria ? 'text-primary' : 'text-muted'} />
                        <strong>Electiva Complementaria:</strong>{' '}
                        {!formData.is_elective ? (
                          <span className="badge-false" style={{ opacity: 0.8 }}>(Requiere ser Electiva)</span>
                        ) : formData.es_complementaria ? (
                          <span className="badge-true" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' }}>Sí (Facultad ID 2)</span>
                        ) : (
                          <span className="badge-false">No</span>
                        )}
                      </span>
                    </label>
                  </div>

                  <div className="setting-row" style={{ marginTop: '0.5rem', opacity: (!formData.is_elective && !formData.es_complementaria) ? 1 : 0.5 }}>
                    <label 
                      className="checkbox-setting-label"
                      style={{ cursor: (!formData.is_elective && !formData.es_complementaria) ? 'pointer' : 'not-allowed' }}
                      title={(formData.is_elective || formData.es_complementaria) ? 'Solo se puede activar si NO es electiva ni complementaria' : ''}
                    >
                      <input
                        type="checkbox"
                        checked={formData.es_basica}
                        disabled={formData.is_elective || formData.es_complementaria}
                        onChange={(e) => handleToggleBasica(e.target.checked)}
                        className="checkbox-input-custom"
                      />
                      <span className="checkbox-label-text">
                        <Library size={16} className={formData.es_basica ? 'text-success' : 'text-muted'} />
                        <strong>Asignatura Básica:</strong>{' '}
                        {(formData.is_elective || formData.es_complementaria) ? (
                          <span className="badge-false" style={{ opacity: 0.8 }}>(No puede ser electiva)</span>
                        ) : formData.es_basica ? (
                          <span className="badge-true" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>Sí (Facultad ID 3)</span>
                        ) : (
                          <span className="badge-false">No</span>
                        )}
                      </span>
                    </label>
                  </div>

                  {(() => {
                    const isFacultyLocked = Boolean(formData.es_complementaria || formData.es_basica)
                    return (
                      <div className="form-group" style={{ marginTop: '0.75rem' }}>
                        <div className="group-label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label htmlFor="modal_facultad" className="setting-select-label">
                            Facultad
                          </label>
                          {!isFacultyLocked && (
                            <button
                              type="button"
                              className="btn-link"
                              onClick={() => setIsAddingNewFacultad(!isAddingNewFacultad)}
                              style={{ fontSize: '0.8rem' }}
                            >
                              {isAddingNewFacultad ? 'Cancelar' : '+ Agregar Nueva Facultad a BD'}
                            </button>
                          )}
                        </div>

                        {isAddingNewFacultad && !isFacultyLocked ? (
                          <div className="new-group-inline-form" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                            <input
                              type="text"
                              placeholder="Nombre de la facultad (ej. Facultad de Ingeniería)"
                              value={newFacultadName}
                              onChange={(e) => setNewFacultadName(e.target.value)}
                              className="select-input"
                              autoFocus
                            />
                            <input
                              type="text"
                              placeholder="Descripción de la facultad (opcional)"
                              value={newFacultadDesc}
                              onChange={(e) => setNewFacultadDesc(e.target.value)}
                              className="select-input"
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.2rem' }}>
                              <button
                                type="button"
                                className="btn-secondary btn-sm"
                                onClick={() => setIsAddingNewFacultad(false)}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                className="btn-primary btn-sm"
                                onClick={handleCreateNewFacultadInDb}
                                disabled={addingFacultadSubmitting || !newFacultadName.trim()}
                              >
                                {addingFacultadSubmitting ? 'Guardando...' : 'Guardar en BD'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <select
                              id="modal_id_facultad"
                              value={formData.id_facultad}
                              onChange={(e) => setFormData({ ...formData, id_facultad: e.target.value })}
                              disabled={isFacultyLocked}
                              className="select-input"
                              style={{
                                marginTop: '0.35rem',
                                opacity: isFacultyLocked ? 0.65 : 1,
                                cursor: isFacultyLocked ? 'not-allowed' : 'default',
                                backgroundColor: isFacultyLocked ? 'rgba(255, 255, 255, 0.05)' : undefined
                              }}
                            >
                              <option value="">-- Seleccionar Facultad --</option>
                              {facultadesList.length === 0 ? (
                                <option value="" disabled>No hay facultades en la base de datos (+ Crear Nueva Facultad)</option>
                              ) : (
                                facultadesList.map((f, idx) => {
                                  const val = f.id ? String(f.id) : ''
                                  const nameText = f.nombre || f.Nombre || f.name || `Facultad ${f.id || idx + 1}`
                                  const descText = f.descripcion || f.Descripcion || f.descripción || ''
                                  const label = descText ? `${nameText} — ${descText}` : nameText
                                  return (
                                    <option key={f.id || idx} value={val}>
                                      {label}
                                    </option>
                                  )
                                })
                              )}
                            </select>
                            {isFacultyLocked && (
                              <small className="form-hint" style={{ marginTop: '0.35rem', display: 'block', color: '#60a5fa' }}>
                                🔒 Campo de facultad bloqueado: Asignada automáticamente a Facultad ID {formData.id_facultad} ({formData.es_complementaria ? 'Complementaria' : 'Básica'}).
                              </small>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })()}
                </div>

                <div className="form-group">
                  <label htmlFor="code_course">
                    Código de la Asignatura <span className="text-danger">*</span>
                  </label>
                  <input
                    id="code_course"
                    type="text"
                    placeholder="Ej. MAT101, PROG-201, ELE101"
                    value={formData.code_course}
                    onChange={(e) => setFormData({ ...formData, code_course: e.target.value })}
                    disabled={!!editingAsignatura}
                    required={!editingAsignatura}
                  />
                  {editingAsignatura ? (
                    <small className="form-hint">El código de la materia es clave primaria y no puede modificarse.</small>
                  ) : (
                    <small className="form-hint">
                      El código de la asignatura es obligatorio y debe ser único. El sistema convertirá las letras a mayúsculas.
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="name_course">Nombre de la Asignatura *</label>
                  <input
                    id="name_course"
                    type="text"
                    placeholder={formData.is_elective ? "Ej. Inteligencia Artificial, Robótica, Marketing Digital" : "Ej. Cálculo Diferencial, Bases de Datos"}
                    value={formData.name_course}
                    onChange={(e) => setFormData({ ...formData, name_course: e.target.value })}
                    required
                    autoFocus
                  />
                  <small className="form-hint">Ingresa el nombre real de la asignatura o materia electiva.</small>
                </div>

                <div className="form-group">
                  <label htmlFor="credits">Número de Créditos</label>
                  <input
                    id="credits"
                    type="text"
                    placeholder="?"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                  />
                  <small className="form-hint">
                    Muestra '?' si los créditos están vacíos o sin definir aún.
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
                <button
                  type="submit"
                  className={formData.is_elective ? 'btn-primary btn-purple' : 'btn-primary'}
                  disabled={submitting || (!formData.name_course.trim())}
                >
                  {submitting ? 'Guardando...' : editingAsignatura ? 'Actualizar' : formData.is_elective ? 'Crear Electiva' : 'Crear Asignatura'}
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
