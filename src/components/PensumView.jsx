import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Plus,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Printer,
  Sparkles,
  ArrowRightLeft,
  X,
  HelpCircle,
  Search,
  Building2,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Award
} from 'lucide-react'
import {
  addCourseToPensum,
  updateCourseSemester,
  removeCourseFromPensum,
  createAsignatura,
  getFacultades,
  updatePrograma
} from '../services/academicService'

export default function PensumView({
  programas,
  asignaturas,
  selectedProgramCode,
  setSelectedProgramCode,
  pensumList,
  onRefresh,
  onShowToast,
  onNavigateToAsignaturas,
  onNavigateToProgramas
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedSemesterForAdd, setSelectedSemesterForAdd] = useState(1)
  const [selectedCourseForAdd, setSelectedCourseForAdd] = useState('')
  const [courseSearchModal, setCourseSearchModal] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [movingCourse, setMovingCourse] = useState(null) // for changing semester modal
  const [targetSemester, setTargetSemester] = useState(1)

  // Elective form mode & state in modal
  const [addMode, setAddMode] = useState('catalog') // 'catalog' | 'elective'
  const [electiveCode, setElectiveCode] = useState('')
  const [electiveName, setElectiveName] = useState('')
  const [electiveCredits, setElectiveCredits] = useState('')

  // Estado para la barra de electivas disponibles
  const [facultadesList, setFacultadesList] = useState([])
  const [programFacultyId, setProgramFacultyId] = useState('')
  const [electivesSearch, setElectivesSearch] = useState('')
  const [isElectivesDockExpanded, setIsElectivesDockExpanded] = useState(true)
  const [electivesTabFilter, setElectivesTabFilter] = useState('all') // 'all' | 'especializadas' | 'comunes'

  // Program search combobox
  const [programSearch, setProgramSearch] = useState('')
  const [programDropdownOpen, setProgramDropdownOpen] = useState(false)
  const programInputRef = useRef(null)
  const comboboxRef = useRef(null)

  // Current active program
  const currentProgram = useMemo(() => {
    return programas.find(p => p.code_program === selectedProgramCode) || programas[0] || null
  }, [programas, selectedProgramCode])

  // Filtered programs for search dropdown
  const filteredProgramas = useMemo(() => {
    const q = programSearch.trim().toLowerCase()
    if (!q) return programas
    return programas.filter(p =>
      p.name_program?.toLowerCase().includes(q) ||
      p.code_program?.toLowerCase().includes(q)
    )
  }, [programas, programSearch])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        comboboxRef.current && !comboboxRef.current.contains(e.target)
      ) {
        setProgramDropdownOpen(false)
        setProgramSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectProgram = (code) => {
    setSelectedProgramCode(code)
    setProgramDropdownOpen(false)
    setProgramSearch('')
  }

  // Current program's pensum entries
  const currentPensum = useMemo(() => {
    if (!currentProgram) return []
    return pensumList.filter(item => item.code_program === currentProgram.code_program)
  }, [pensumList, currentProgram])

  // Total credits in program
  const totalProgramCredits = useMemo(() => {
    return currentPensum.reduce((acc, curr) => acc + (curr.credits || 0), 0)
  }, [currentPensum])

  // Total semesters defined for this program
  const totalSemesters = useMemo(() => {
    const definedSemesters = parseInt(currentProgram?.numero_semestre, 10) || 10
    if (currentPensum.length === 0) return definedSemesters
    const highestInPensum = Math.max(...currentPensum.map(p => p.semestre))
    return Math.max(definedSemesters, highestInPensum)
  }, [currentProgram, currentPensum])

  // Group courses by semester up to totalSemesters
  const semesterMap = useMemo(() => {
    const map = {}
    for (let s = 1; s <= totalSemesters; s++) {
      map[s] = []
    }
    currentPensum.forEach(item => {
      if (!map[item.semestre]) {
        map[item.semestre] = []
      }
      map[item.semestre].push(item)
    })
    return map
  }, [currentPensum, totalSemesters])

  // Set of courses already in this pensum
  const assignedCourseCodes = useMemo(() => {
    return new Set(currentPensum.map(item => item.code_course))
  }, [currentPensum])

  // Courses available to be added (not yet in this program's pensum)
  const availableCourses = useMemo(() => {
    return asignaturas.filter(a => !assignedCourseCodes.has(a.code_course))
  }, [asignaturas, assignedCourseCodes])

  // Filtered available courses in modal search
  const filteredAvailableCourses = useMemo(() => {
    return availableCourses.filter(a =>
      a.code_course.toLowerCase().includes(courseSearchModal.toLowerCase()) ||
      a.name_course.toLowerCase().includes(courseSearchModal.toLowerCase())
    )
  }, [availableCourses, courseSearchModal])

  // Cargar facultades desde la BD
  useEffect(() => {
    getFacultades()
      .then(data => {
        if (data && data.length > 0) setFacultadesList(data)
      })
      .catch(err => console.warn('Error al cargar facultades:', err))
  }, [])

  // Sincronizar y detectar facultad de la carrera
  useEffect(() => {
    if (!currentProgram) {
      setProgramFacultyId(null)
      return
    }

    // 1. Si el programa tiene id_facultad_programa o id_facultad asignado explícitamente en la BD:
    if (currentProgram.id_facultad_programa || currentProgram.id_facultad) {
      setProgramFacultyId(String(currentProgram.id_facultad_programa || currentProgram.id_facultad))
      return
    }

    // 2. Si no tiene facultad asignada, deducir ÚNICAMENTE si el nombre coincide con carreras conocidas:
    const pName = (currentProgram.name_program || '').toLowerCase()
    if (pName.includes('software') || pName.includes('sistemas') || pName.includes('electromec') || pName.includes('ingenier')) {
      const ingFac = facultadesList.find(f => f.id === 1 || (f.nombre || '').toLowerCase().includes('ingenier'))
      setProgramFacultyId(ingFac ? String(ingFac.id) : '1')
      return
    }

    // Si coincide con alguna otra facultad registrada (ej. Ciencias Humanas, Psicología)
    const matchingFac = facultadesList.find(f => 
      f.id !== 2 && f.id !== 3 && pName.includes((f.nombre || '').toLowerCase())
    )
    if (matchingFac) {
      setProgramFacultyId(String(matchingFac.id))
      return
    }

    // Para cualquier otra carrera (ej. Psicología) que no sea de ingeniería, NO asociar a Facultad 1
    // De esta manera no se mezclan las electivas especializadas de otras facultades
    setProgramFacultyId(null)
  }, [currentProgram, facultadesList])

  // Mapa de cursos en el pensum de esta carrera
  const pensumCourseMap = useMemo(() => {
    const map = new Map()
    for (const item of currentPensum) {
      map.set(item.code_course, item)
    }
    return map
  }, [currentPensum])

  // Objeto de la facultad actual de la carrera
  const currentFacultyObj = useMemo(() => {
    if (!programFacultyId) return null
    return facultadesList.find(f => String(f.id) === String(programFacultyId)) || null
  }, [facultadesList, programFacultyId])

  // Todas las electivas disponibles en el banco de asignaturas
  const allElectivasDisponibles = useMemo(() => {
    return asignaturas.filter(a => {
      return Boolean(
        a.is_elective || 
        a.es_complementaria || 
        a.name_course?.toLowerCase().includes('electiv') ||
        a.code_course?.toLowerCase().startsWith('ele')
      )
    })
  }, [asignaturas])

  // Electivas Comunes / Complementarias (disponibles para todas las carreras)
  const electivasComunes = useMemo(() => {
    return allElectivasDisponibles.filter(a => {
      const isComun = Boolean(
        a.es_complementaria || 
        String(a.id_facultad) === '2' || 
        a.name_course?.toLowerCase().includes('complementar')
      )
      if (!isComun) return false

      if (electivesSearch.trim()) {
        const q = electivesSearch.toLowerCase()
        return a.code_course.toLowerCase().includes(q) || a.name_course.toLowerCase().includes(q)
      }
      return true
    })
  }, [allElectivasDisponibles, electivesSearch])

  // Electivas Especializadas (únicamente de la propia facultad de la carrera)
  const electivasEspecializadas = useMemo(() => {
    // Si la carrera no tiene una facultad especializada definida, no puede ver electivas de otras facultades
    if (!programFacultyId) return []

    return allElectivasDisponibles.filter(a => {
      const isComun = Boolean(
        a.es_complementaria || 
        String(a.id_facultad) === '2' || 
        a.name_course?.toLowerCase().includes('complementar')
      )
      if (isComun) return false

      // Solo electivas que pertenezcan a la misma facultad de la carrera
      if (String(a.id_facultad) !== String(programFacultyId)) {
        return false
      }

      if (electivesSearch.trim()) {
        const q = electivesSearch.toLowerCase()
        return a.code_course.toLowerCase().includes(q) || a.name_course.toLowerCase().includes(q)
      }
      return true
    })
  }, [allElectivasDisponibles, programFacultyId, electivesSearch])

  // Generador de nombre consecutivo para electivas (Electiva Profesional I, II, III...)
  const getConsecutiveElectiveName = useCallback(() => {
    if (!currentProgram) return 'Electiva Profesional I'
    const programPensum = pensumList.filter(item => item.code_program === currentProgram.code_program)
    const existingElectives = programPensum.filter(item => {
      const name = item.name_course?.toLowerCase() || ''
      const code = item.code_course?.toLowerCase() || ''
      return name.includes('electiv') || code.startsWith('ele')
    })

    const count = existingElectives.length + 1
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV']
    const roman = romanNumerals[count - 1] || `${count}`
    return `Electiva Profesional ${roman}`
  }, [currentProgram, pensumList])

  const handleSwitchToElective = () => {
    setAddMode('elective')
    setElectiveCode('')
    setElectiveName(getConsecutiveElectiveName())
    setElectiveCredits('')
  }

  // Handle open add course modal
  const handleOpenAddModal = (semesterNum = 1) => {
    setSelectedSemesterForAdd(semesterNum)
    setSelectedCourseForAdd(availableCourses[0]?.code_course || '')
    setCourseSearchModal('')
    setAddMode('catalog')
    setElectiveCode('')
    setElectiveName(getConsecutiveElectiveName())
    setElectiveCredits('')
    setIsAddModalOpen(true)
  }

  // Handle adding course to pensum
  const handleAddCourse = async (e) => {
    e.preventDefault()
    if (!currentProgram) return

    setSubmitting(true)
    try {
      if (addMode === 'elective') {
        const nameClean = electiveName.trim() || getConsecutiveElectiveName()
        let codeClean = electiveCode.trim().toUpperCase()

        // Si el código está vacío, generar un código derivado automáticamente
        if (!codeClean) {
          const romanPart = nameClean.split(' ').pop().toUpperCase()
          codeClean = `ELE-PROF-${romanPart}`.replace(/[^A-Z0-9-]/g, '')
          if (!codeClean || codeClean === 'ELE-PROF-') {
            codeClean = `ELE-${Date.now().toString().slice(-4)}`
          }
        }

        const parsedCredits = parseInt(electiveCredits, 10)
        const creditsNum = isNaN(parsedCredits) || parsedCredits < 0 ? 0 : parsedCredits

        // Check if course already exists in asignaturas catalog
        const existingInCatalog = asignaturas.find(a => a.code_course.toUpperCase() === codeClean)
        if (!existingInCatalog) {
          await createAsignatura({
            code_course: codeClean,
            name_course: nameClean,
            credits: creditsNum
          })
        }

        await addCourseToPensum({
          code_program: currentProgram.code_program,
          code_course: codeClean,
          semestre: selectedSemesterForAdd
        })
        onShowToast(`Electiva "${nameClean}" agregada al Semestre ${selectedSemesterForAdd}`, 'success')
      } else {
        if (!selectedCourseForAdd) {
          onShowToast('Selecciona una asignatura para agregar', 'error')
          setSubmitting(false)
          return
        }

        await addCourseToPensum({
          code_program: currentProgram.code_program,
          code_course: selectedCourseForAdd,
          semestre: selectedSemesterForAdd
        })
        onShowToast(`Asignatura agregada al Semestre ${selectedSemesterForAdd}`, 'success')
      }

      setIsAddModalOpen(false)
      onRefresh()
    } catch (err) {
      onShowToast(`Error: ${err.message || 'No se pudo agregar la asignatura'}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle quick move semester
  const handleShiftSemester = async (item, delta) => {
    const newSem = item.semestre + delta
    if (newSem < 1 || newSem > totalSemesters) {
      onShowToast(`El semestre debe estar entre 1 y ${totalSemesters}`, 'error')
      return
    }

    try {
      await updateCourseSemester({
        code_program: item.code_program,
        code_course: item.code_course,
        semestre: newSem
      })
      onShowToast(`Movida a Semestre ${newSem}`, 'success')
      onRefresh()
    } catch (err) {
      onShowToast(`Error: ${err.message}`, 'error')
    }
  }

  // Handle change semester from modal
  const handleConfirmMoveSemester = async (e) => {
    e.preventDefault()
    if (!movingCourse) return

    setSubmitting(true)
    try {
      await updateCourseSemester({
        code_program: movingCourse.code_program,
        code_course: movingCourse.code_course,
        semestre: targetSemester
      })
      onShowToast(`Asignatura transferida al Semestre ${targetSemester}`, 'success')
      setMovingCourse(null)
      onRefresh()
    } catch (err) {
      onShowToast(`Error: ${err.message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle remove from pensum
  const handleRemoveCourse = async (item) => {
    if (!window.confirm(`¿Quitar "${item.name_course}" del pensum de ${currentProgram.name_program}?`)) {
      return
    }

    try {
      await removeCourseFromPensum({
        code_program: item.code_program,
        code_course: item.code_course
      })
      onShowToast(`Asignatura retirada del pensum`, 'success')
      onRefresh()
    } catch (err) {
      onShowToast(`Error al retirar: ${err.message}`, 'error')
    }
  }

  // Handle Print
  const handlePrint = () => {
    window.print()
  }

  if (programas.length === 0) {
    return (
      <div className="section-container">
        <div className="empty-state-card">
          <BookOpen size={56} className="empty-icon text-primary" />
          <h2>No hay programas registrados</h2>
          <p>Para visualizar y estructurar una malla curricular, primero debes registrar al menos un programa o carrera.</p>
          <button className="btn-primary" onClick={onNavigateToProgramas}>
            <Plus size={16} /> Crear Primer Programa
          </button>
        </div>
      </div>
    )
  }

  const sortedSemesters = Object.keys(semesterMap).map(Number).sort((a, b) => a - b)

  return (
    <div className="pensum-container">
      {/* Program Selector & Actions Topbar */}
      <div className="pensum-header-card print-hide">
        {/* Program Search Combobox */}
        <div className="program-search-wrapper">
          <label className="selector-label">
            <BookOpen size={18} className="text-primary" />
            <span>Carrera o Programa:</span>
          </label>
          <div className="program-search-combobox" ref={comboboxRef}>
            <div className="program-search-input-row">
              <Search size={16} className="prog-search-icon" />
              <input
                ref={programInputRef}
                type="text"
                className="program-search-input"
                placeholder={
                  currentProgram
                    ? `${currentProgram.code_program} — ${currentProgram.name_program}`
                    : 'Buscar por nombre o código...'
                }
                value={programSearch}
                onChange={(e) => { setProgramSearch(e.target.value); setProgramDropdownOpen(true) }}
                onFocus={() => setProgramDropdownOpen(true)}
              />
              {programSearch && (
                <button
                  className="search-clear-btn"
                  onClick={() => { setProgramSearch(''); setProgramDropdownOpen(true); programInputRef.current?.focus() }}
                  title="Limpiar"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {programDropdownOpen && (
              <div className="program-search-dropdown">
                {filteredProgramas.length === 0 ? (
                  <div className="prog-dropdown-empty">
                    <span>Sin resultados para "{programSearch}"</span>
                  </div>
                ) : (
                  filteredProgramas.map((prog) => (
                    <button
                      key={prog.code_program}
                      className={`prog-dropdown-item ${prog.code_program === currentProgram?.code_program ? 'active' : ''}`}
                      onMouseDown={() => handleSelectProgram(prog.code_program)}
                    >
                      <span className="prog-item-code">{prog.code_program}</span>
                      <span className="prog-item-name">{prog.name_program}</span>
                      
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="pensum-header-actions">
          <button
            className="btn-secondary"
            onClick={handlePrint}
            title="Imprimir o exportar en PDF la malla curricular"
          >
            <Printer size={16} />
            <span>Imprimir / Exportar Malla</span>
          </button>

          <button
            className="btn-primary"
            onClick={() => handleOpenAddModal(1)}
            disabled={availableCourses.length === 0}
            title={availableCourses.length === 0 ? 'No hay más asignaturas disponibles para agregar' : 'Agregar materia a este programa'}
          >
            <Plus size={16} />
            <span>Agregar Materia al Pensum</span>
          </button>
        </div>
      </div>

      {/* Program Overview Banner */}
      {currentProgram && (
        <div className="program-overview-banner">
          <div className="program-main-info">
            <div className="banner-tag">Malla Curricular Oficial</div>
            <h1 className="program-banner-title">{currentProgram.name_program}</h1>
            <div className="program-tags-row">
              <span className="code-chip">Código: <strong>{currentProgram.code_program}</strong></span>
              
              <span className="group-chip">Duración: <strong>{totalSemesters} Semestres</strong></span>
            </div>
          </div>

          <div className="program-stats-row">
            <div className="stat-box">
              <span className="stat-number">{currentPensum.length}</span>
              <span className="stat-label">Materias en Pensum</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{totalProgramCredits}</span>
              <span className="stat-label">Créditos Totales</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{sortedSemesters.length}</span>
              <span className="stat-label">Semestres Activos</span>
            </div>
          </div>
        </div>
      )}

      {/* Notice if no available courses */}
      {availableCourses.length === 0 && asignaturas.length > 0 && (
        <div className="info-banner print-hide">
          <Sparkles size={18} className="text-amber" />
          <span>
            Todas las asignaturas registradas ({asignaturas.length}) ya están asignadas en este pensum.
          </span>
          <button className="btn-link" onClick={onNavigateToAsignaturas}>
            Crear nuevas asignaturas en el Banco
          </button>
        </div>
      )}

      {asignaturas.length === 0 && (
        <div className="warning-banner print-hide">
          <HelpCircle size={18} />
          <span>El banco de asignaturas está vacío. Agrega materias al catálogo para incluirlas en el pensum.</span>
          <button className="btn-secondary btn-sm" onClick={onNavigateToAsignaturas}>
            Ir a Asignaturas
          </button>
        </div>
      )}

      {/* Malla Curricular Grid (Semesters Columns) */}
      <div className="malla-grid-wrapper">
        <div className="malla-grid">
          {sortedSemesters.map((semNum) => {
            const coursesInSem = semesterMap[semNum] || []
            const semCredits = coursesInSem.reduce((sum, c) => sum + (c.credits || 0), 0)
            return (
              <div key={semNum} className="semester-column">
                <div className="semester-column-header">
                  <div className="semester-title">
                    <span className="semester-badge">Semestre {semNum}</span>
                    <div className="semester-sub-badges">
                      <span className="semester-count-badge">
                        {coursesInSem.length} {coursesInSem.length === 1 ? 'materia' : 'materias'}
                      </span>
                      <span className="semester-credits-badge">
                        • {semCredits} {semCredits === 1 ? 'crédito' : 'créditos'}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn-quick-add print-hide"
                    onClick={() => handleOpenAddModal(semNum)}
                    title={`Agregar materia al semestre ${semNum}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="semester-courses-list">
                  {coursesInSem.length === 0 ? (
                    <div className="semester-empty-placeholder">
                      <span>Semestre sin materias</span>
                      <button
                        className="btn-add-ghost print-hide"
                        onClick={() => handleOpenAddModal(semNum)}
                      >
                        + Asignar materia
                      </button>
                    </div>
                  ) : (
                    coursesInSem.map((item) => {
                      const isElective = item.name_course?.toLowerCase().includes('electiv') || item.code_course?.toLowerCase().startsWith('ele')
                      return (
                        <div key={item.code_course} className="pensum-course-card">
                          <div className="pensum-course-card-top">
                            <div className="pensum-card-badge-row">
                              <span className="course-code-pill">{item.code_course}</span>
                              {isElective && (
                                <span className="pensum-elective-pill" title="Asignatura Electiva">
                                  <Sparkles size={10} /> Electiva
                                </span>
                              )}
                              <span className="pensum-credit-pill" title={`${item.credits ?? 0} créditos académicos`}>
                                {item.credits ?? 0} {item.credits === 1 ? 'créd' : 'créds'}
                              </span>
                            </div>
                            <div className="pensum-card-tools print-hide">
                              <button
                                className="btn-card-tool"
                                onClick={() => {
                                  setMovingCourse(item)
                                  setTargetSemester(item.semestre)
                                }}
                                title="Cambiar de semestre"
                              >
                                <ArrowRightLeft size={13} />
                              </button>
                              <button
                                className="btn-card-tool tool-danger"
                                onClick={() => handleRemoveCourse(item)}
                                title="Quitar del pensum"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <h4 className="pensum-course-name">{item.name_course}</h4>

                          <div className="pensum-card-navigation print-hide">
                            <button
                              className="btn-nav-shift"
                              disabled={semNum <= 1}
                              onClick={() => handleShiftSemester(item, -1)}
                              title="Mover a semestre anterior"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <span className="sem-indicator">S{semNum}</span>
                            <button
                              className="btn-nav-shift"
                              disabled={semNum >= totalSemesters}
                              onClick={() => handleShiftSemester(item, 1)}
                              title="Mover a semestre siguiente"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* =====================================================================
          BARRA / PANEL DE ELECTIVAS DISPONIBLES DEBAJO DEL PENSUM
          ===================================================================== */}
      <div className="electives-dock-section print-hide">
        <div className="electives-dock-header">
          <div className="electives-dock-title-group">
            <div className="dock-icon-wrapper">
              <Sparkles size={20} className="text-purple" />
            </div>
            <div>
              <div className="electives-dock-heading-row">
                <h3 className="electives-dock-title">
                  Banco de Electivas Disponibles para la Carrera
                </h3>
                <span className="dock-badge-total">
                  {electivasEspecializadas.length + electivasComunes.length} disponibles
                </span>
              </div>
              <p className="electives-dock-desc">
                {currentFacultyObj 
                  ? <>Electivas especializadas de la facultad <strong>{currentFacultyObj.nombre || currentFacultyObj.Nombre}</strong> y electivas comunes / complementarias institucionales.</>
                  : <>Electivas especializadas de la propia carrera y electivas comunes / complementarias institucionales.</>
                }
              </p>
            </div>
          </div>

          <div className="electives-dock-controls">
            {/* Indicador de Facultad de la Carrera (Fijo e informativo, sin opción de cambiarla) */}
            {currentFacultyObj && (
              <div className="dock-faculty-tag" title="Facultad a la que pertenece esta carrera">
                <Building2 size={14} />
                <span>Facultad: <strong>{currentFacultyObj.nombre || currentFacultyObj.Nombre}</strong></span>
              </div>
            )}

            {/* Buscador de Electivas */}
            <div className="dock-search-box">
              <Search size={14} className="dock-search-icon" />
              <input
                type="text"
                placeholder="Buscar electiva..."
                value={electivesSearch}
                onChange={(e) => setElectivesSearch(e.target.value)}
              />
              {electivesSearch && (
                <button className="dock-search-clear" onClick={() => setElectivesSearch('')}>×</button>
              )}
            </div>

            {/* Pestañas de Filtro */}
            <div className="dock-tabs-group">
              <button
                type="button"
                className={`dock-tab-btn ${electivesTabFilter === 'all' ? 'active' : ''}`}
                onClick={() => setElectivesTabFilter('all')}
              >
                Todas ({electivasEspecializadas.length + electivasComunes.length})
              </button>
              <button
                type="button"
                className={`dock-tab-btn ${electivesTabFilter === 'especializadas' ? 'active' : ''}`}
                onClick={() => setElectivesTabFilter('especializadas')}
              >
                Especializadas ({electivasEspecializadas.length})
              </button>
              <button
                type="button"
                className={`dock-tab-btn ${electivesTabFilter === 'comunes' ? 'active' : ''}`}
                onClick={() => setElectivesTabFilter('comunes')}
              >
                Comunes ({electivasComunes.length})
              </button>
            </div>

            {/* Botón Minimizar / Expandir */}
            <button
              type="button"
              className="btn-dock-toggle"
              onClick={() => setIsElectivesDockExpanded(!isElectivesDockExpanded)}
              title={isElectivesDockExpanded ? "Minimizar barra" : "Expandir barra"}
            >
              {isElectivesDockExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {/* Contenido Expandible */}
        {isElectivesDockExpanded && (
          <div className="electives-dock-body">
            <div className="electives-split-grid">
              {/* COLUMNA 1: ELECTIVAS ESPECIALIZADAS */}
              {(electivesTabFilter === 'all' || electivesTabFilter === 'especializadas') && (
                <div className="electives-dock-column column-especializadas">
                  <div className="dock-column-header">
                    <div className="dock-column-header-title">
                      <span className="dock-pill-tag tag-especializada">
                        <Layers size={13} /> Especializadas
                      </span>
                      <h4>{currentFacultyObj ? `Facultad de ${currentFacultyObj.nombre || currentFacultyObj.Nombre}` : 'Especializadas de la Carrera'}</h4>
                    </div>
                    <span className="dock-count-badge">{electivasEspecializadas.length} materias</span>
                  </div>

                  <div className="dock-cards-scroll">
                    {electivasEspecializadas.length === 0 ? (
                      <div className="dock-empty-state">
                        <p>No hay electivas especializadas registradas para la facultad de esta carrera.</p>
                        <button className="btn-link" onClick={onNavigateToAsignaturas}>
                          + Crear electiva especializada en Asignaturas
                        </button>
                      </div>
                    ) : (
                      electivasEspecializadas.map(el => {
                        const inPensum = pensumCourseMap.get(el.code_course)
                        return (
                          <div key={el.code_course} className="dock-elective-card card-especializada">
                            <div className="dock-card-top">
                              <span className="dock-course-code">{el.code_course}</span>
                              <span className="dock-credits-badge">
                                <Award size={11} /> {el.credits ?? 0} {el.credits === 1 ? 'créd' : 'créds'}
                              </span>
                            </div>
                            <h5 className="dock-course-name">{el.name_course}</h5>
                            
                            <div className="dock-card-actions">
                              {inPensum ? (
                                <span className="dock-assigned-badge">
                                  <CheckCircle2 size={13} /> En Semestre {inPensum.semestre}
                                </span>
                              ) : (
                                <span className="dock-available-badge">
                                  Disponible
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* COLUMNA 2: ELECTIVAS COMUNES / COMPLEMENTARIAS */}
              {(electivesTabFilter === 'all' || electivesTabFilter === 'comunes') && (
                <div className="electives-dock-column column-comunes">
                  <div className="dock-column-header">
                    <div className="dock-column-header-title">
                      <span className="dock-pill-tag tag-comun">
                        <Sparkles size={13} /> Comunes / Complementarias
                      </span>
                      <h4>Transversales Institucionales </h4>
                    </div>
                    <span className="dock-count-badge">{electivasComunes.length} materias</span>
                  </div>

                  <div className="dock-cards-scroll">
                    {electivasComunes.length === 0 ? (
                      <div className="dock-empty-state">
                        <p>No hay electivas comunes o complementarias registradas.</p>
                        <button className="btn-link" onClick={onNavigateToAsignaturas}>
                          + Crear electiva complementaria en Asignaturas
                        </button>
                      </div>
                    ) : (
                      electivasComunes.map(el => {
                        const inPensum = pensumCourseMap.get(el.code_course)
                        return (
                          <div key={el.code_course} className="dock-elective-card card-comun">
                            <div className="dock-card-top">
                              <span className="dock-course-code">{el.code_course}</span>
                              <span className="dock-credits-badge">
                                <Award size={11} /> {el.credits ?? 0} {el.credits === 1 ? 'créd' : 'créds'}
                              </span>
                            </div>
                            <h5 className="dock-course-name">{el.name_course}</h5>
                            
                            <div className="dock-card-actions">
                              {inPensum ? (
                                <span className="dock-assigned-badge">
                                  <CheckCircle2 size={13} /> En Semestre {inPensum.semestre}
                                </span>
                              ) : (
                                <span className="dock-available-badge">
                                  Disponible
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Asignar Asignatura al Pensum */}
      {isAddModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Agregar Materia a {currentProgram?.code_program}</h2>
              <button className="modal-close-btn" onClick={() => setIsAddModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddCourse}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Semestre Destino</label>
                  <select
                    value={selectedSemesterForAdd}
                    onChange={(e) => setSelectedSemesterForAdd(parseInt(e.target.value, 10))}
                    className="select-input"
                  >
                    {Array.from({ length: totalSemesters }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>Semestre {num}</option>
                    ))}
                  </select>
                </div>

                {/* Seleccionador de Modo: Catálogo vs Electiva (Campos Vacíos) */}
                <div className="add-mode-tabs">
                  <button
                    type="button"
                    className={`add-mode-tab ${addMode === 'catalog' ? 'active' : ''}`}
                    onClick={() => setAddMode('catalog')}
                  >
                    <BookOpen size={16} />
                    <span>Del Catálogo</span>
                  </button>

                  <button
                    type="button"
                    className={`add-mode-tab mode-elective ${addMode === 'elective' ? 'active' : ''}`}
                    onClick={handleSwitchToElective}
                  >
                    <Sparkles size={16} />
                    <span>Elegir que sea Electiva</span>
                  </button>
                </div>

                {addMode === 'catalog' ? (
                  <>
                    <div className="form-group">
                      <label>Seleccionar Asignatura del Catálogo</label>
                      <input
                        type="text"
                        placeholder="Filtrar por código o nombre..."
                        value={courseSearchModal}
                        onChange={(e) => setCourseSearchModal(e.target.value)}
                        className="search-input-modal"
                      />
                    </div>

                    <div className="course-picker-list">
                      {filteredAvailableCourses.length === 0 ? (
                        <div className="empty-picker-notice">
                          <p>No hay asignaturas disponibles que coincidan con la búsqueda.</p>
                          <button
                            type="button"
                            className="btn-link"
                            onClick={() => {
                              setIsAddModalOpen(false)
                              onNavigateToAsignaturas()
                            }}
                          >
                            Crear una nueva asignatura en el Banco
                          </button>
                        </div>
                      ) : (
                        filteredAvailableCourses.map((c) => (
                          <label
                            key={c.code_course}
                            className={`course-picker-item ${selectedCourseForAdd === c.code_course ? 'selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name="coursePicker"
                              value={c.code_course}
                              checked={selectedCourseForAdd === c.code_course}
                              onChange={() => setSelectedCourseForAdd(c.code_course)}
                            />
                            <div className="picker-item-details">
                                <div className="picker-item-info">
                                  <span className="picker-code">{c.code_course}</span>
                                  <span className="picker-name">{c.name_course}</span>
                                </div>
                              <span className="picker-credits-tag">
                                {c.credits && c.credits > 0 ? `${c.credits} ${c.credits === 1 ? 'crédito' : 'créditos'}` : '? créditos'}
                              </span>
                            </div>
                          </label>
                        ))
                      )}
                    </div>

                    <div className="catalog-elective-shortcut">
                      <span>¿Quieres agregar una electiva personalizada?</span>
                      <button
                        type="button"
                        className="btn-shortcut-elective"
                        onClick={handleSwitchToElective}
                      >
                        <Sparkles size={14} /> Elegir que sea Electiva (Campos con ?)
                      </button>
                    </div>
                  </>
                ) : (
                  /* Formulario de Asignatura Electiva */
                  <div className="elective-form-card">
                    <div className="elective-info-banner">
                      <Sparkles size={18} className="text-purple" />
                      <div>
                        <strong>Campos para Asignatura Electiva</strong>
                        <p>Nombre consecutivo ("Electiva Profesional I, II..."), código vacío y créditos con '?'.</p>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="modal_elective_code">Código de la Electiva</label>
                      <input
                        id="modal_elective_code"
                        type="text"
                        placeholder="Vacío (se asignará código automático si lo dejas en blanco)"
                        value={electiveCode}
                        onChange={(e) => setElectiveCode(e.target.value)}
                      />
                      <small className="form-hint">Puedes dejarlo vacío o escribir un código personalizado.</small>
                    </div>

                    <div className="form-group">
                      <label htmlFor="modal_elective_name">Nombre de la Electiva *</label>
                      <input
                        id="modal_elective_name"
                        type="text"
                        placeholder="Ej. Electiva Profesional I"
                        value={electiveName}
                        onChange={(e) => setElectiveName(e.target.value)}
                        required
                        autoFocus
                      />
                      <small className="form-hint">Nombre consecutivo asignado (editable).</small>
                    </div>

                    <div className="form-group">
                      <label htmlFor="modal_elective_credits">Número de Créditos</label>
                      <input
                        id="modal_elective_credits"
                        type="text"
                        placeholder="?"
                        value={electiveCredits}
                        onChange={(e) => setElectiveCredits(e.target.value)}
                      />
                      <small className="form-hint">Muestra '?' por defecto si está vacío o sin definir.</small>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={addMode === 'elective' ? 'btn-primary btn-purple' : 'btn-primary'}
                  disabled={
                    submitting ||
                    (addMode === 'catalog' && !selectedCourseForAdd) ||
                    (addMode === 'elective' && !electiveName.trim())
                  }
                >
                  {submitting
                    ? 'Guardando...'
                    : addMode === 'elective'
                    ? 'Crear Electiva y Asignar'
                    : 'Asignar al Semestre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cambiar Asignatura de Semestre */}
      {movingCourse && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Cambiar Semestre de Asignatura</h2>
              <button className="modal-close-btn" onClick={() => setMovingCourse(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleConfirmMoveSemester}>
              <div className="modal-body">
                <p>
                  Asignatura: <strong>{movingCourse.name_course}</strong> ({movingCourse.code_course}) • <strong>{movingCourse.credits ?? 0}</strong> {movingCourse.credits === 1 ? 'crédito' : 'créditos'}
                </p>
                <p className="text-muted">
                  Semestre actual: <strong>Semestre {movingCourse.semestre}</strong>
                </p>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label htmlFor="target-sem">Nuevo Semestre (1 - {totalSemesters}):</label>
                  <select
                    id="target-sem"
                    value={targetSemester}
                    onChange={(e) => setTargetSemester(parseInt(e.target.value, 10))}
                    className="select-input"
                  >
                    {Array.from({ length: totalSemesters }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>
                        Semestre {num} {num === movingCourse.semestre ? '(Actual)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setMovingCourse(null)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting || targetSemester === movingCourse.semestre}
                >
                  {submitting ? 'Guardando...' : 'Guardar Cambio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
