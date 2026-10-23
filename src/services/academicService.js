import { supabase } from '../supabase'
import { getAuthToken } from './authService'

/**
 * Servicio para la gestión de Programas, Asignaturas y Pensum Académico
 * Conectado directamente a la API REST de Spring Boot (cda-backend)
 * con fallback transparente a Supabase si el backend se encuentra apagado.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080/api'

async function requestBackend(endpoint, options = {}) {
  const url = `${BACKEND_URL}${endpoint}`
  const token = getAuthToken()
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options.headers || {})
    }
  })

  if (!response.ok) {
    let errorMsg = `Error ${response.status}: ${response.statusText}`
    try {
      const errorBody = await response.json()
      if (errorBody.message) errorMsg = errorBody.message
      else if (errorBody.errors) {
        errorMsg = Object.entries(errorBody.errors).map(([k, v]) => `${k}: ${v}`).join(', ')
      }
    } catch {
      // Response was not JSON
    }
    throw new Error(errorMsg)
  }

  if (response.status === 204) return true
  return await response.json()
}

// --- PROGRAMAS ---

export async function getProgramas() {
  try {
    return await requestBackend('/programas')
  } catch (err) {
    console.warn('Backend no disponible, usando Supabase directo:', err.message)
    const { data, error } = await supabase
      .from('programas')
      .select('*')
      .order('name_program', { ascending: true })
    if (error) throw error
    return data || []
  }

}

// --- PERIODOS ACADEMICOS (HU-002 / HU-003) ---

export async function getPeriodos() {
  return requestBackend('/periodos')
}

export async function createPeriodo(periodo) {
  return requestBackend('/periodos', {
    method: 'POST',
    body: JSON.stringify(periodo),
  })
}

export async function updatePeriodo(id, periodo) {
  return requestBackend(`/periodos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(periodo),
  })
}

export async function createPrograma(programa) {
  try {
    const payload = {
      code_program: programa.code_program.trim().toUpperCase(),
      name_program: programa.name_program.trim(),
      numero_semestre: parseInt(programa.numero_semestre, 10) || 10,
      id_facultad_programa: programa.id_facultad_programa ? parseInt(programa.id_facultad_programa, 10) : null
    }
    return await requestBackend('/programas', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  } catch (err) {
    console.warn('Fallo backend en createPrograma, fallback a Supabase:', err.message)
    const insertPayload = {
      code_program: programa.code_program.trim().toUpperCase(),
      name_program: programa.name_program.trim(),
      numero_semestre: parseInt(programa.numero_semestre, 10) || 10,
    }
    if (programa.id_facultad_programa) {
      insertPayload.id_facultad_programa = parseInt(programa.id_facultad_programa, 10)
    }
    const { data, error } = await supabase
      .from('programas')
      .insert([insertPayload])
      .select()
    if (error) throw error
    return data?.[0]
  }
}

export async function updatePrograma(code_program, changes) {
  try {
    const payload = {}
    if (changes.name_program !== undefined) payload.name_program = changes.name_program.trim()
    if (changes.numero_semestre !== undefined) payload.numero_semestre = parseInt(changes.numero_semestre, 10)
    if (changes.id_facultad_programa !== undefined) {
      payload.id_facultad_programa = changes.id_facultad_programa ? parseInt(changes.id_facultad_programa, 10) : null
    }
    return await requestBackend(`/programas/${encodeURIComponent(code_program)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  } catch (err) {
    console.warn('Fallo backend en updatePrograma, fallback a Supabase:', err.message)
    const updateData = {}
    if (changes.name_program !== undefined) updateData.name_program = changes.name_program.trim()
    if (changes.numero_semestre !== undefined) {
      updateData.numero_semestre = parseInt(changes.numero_semestre, 10) || 10
    }
    if (changes.id_facultad_programa !== undefined) {
      updateData.id_facultad_programa = changes.id_facultad_programa ? parseInt(changes.id_facultad_programa, 10) : null
    }
    const { data, error } = await supabase
      .from('programas')
      .update(updateData)
      .eq('code_program', code_program)
      .select()
    if (error) throw error
    return data?.[0]
  }
}

export async function deletePrograma(code_program) {
  try {
    return await requestBackend(`/programas/${encodeURIComponent(code_program)}`, {
      method: 'DELETE'
    })
  } catch (err) {
    console.warn('Fallo backend en deletePrograma, fallback a Supabase:', err.message)
    const { error } = await supabase
      .from('programas')
      .delete()
      .eq('code_program', code_program)
    if (error) throw error
    return true
  }
}

// --- ASIGNATURAS ---

export async function getAsignaturas() {
  try {
    return await requestBackend('/asignaturas')
  } catch (err) {
    console.warn('Backend no disponible, usando Supabase directo:', err.message)
    const { data, error } = await supabase
      .from('asignaturas')
      .select('*')
      .order('name_course', { ascending: true })
    if (error) throw error
    return data || []
  }
}

export async function createAsignatura(asignatura) {
  try {
    const creditsVal = parseInt(asignatura.credits, 10)
    const payload = {
      code_course: asignatura.code_course.trim().toUpperCase(),
      name_course: asignatura.name_course.trim(),
      credits: isNaN(creditsVal) ? 0 : Math.max(0, creditsVal),
      is_elective: Boolean(asignatura.is_elective),
      es_complementaria: Boolean(asignatura.es_complementaria),
      es_basica: Boolean(asignatura.es_basica),
      facultad: asignatura.facultad ? asignatura.facultad.trim() : null,
      id_facultad: asignatura.id_facultad ? parseInt(asignatura.id_facultad, 10) : null
    }
    return await requestBackend('/asignaturas', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  } catch (err) {
    console.warn('Fallo backend en createAsignatura, fallback a Supabase:', err.message)
    const creditsVal = parseInt(asignatura.credits, 10)
    const payload = {
      code_course: asignatura.code_course.trim().toUpperCase(),
      name_course: asignatura.name_course.trim(),
      credits: isNaN(creditsVal) ? 0 : Math.max(0, creditsVal),
      is_elective: Boolean(asignatura.is_elective),
      es_complementaria: Boolean(asignatura.es_complementaria),
      es_basica: Boolean(asignatura.es_basica),
      facultad: asignatura.facultad ? asignatura.facultad.trim() : null,
      id_facultad: asignatura.id_facultad ? parseInt(asignatura.id_facultad, 10) : null,
    }
    const { data, error } = await supabase
      .from('asignaturas')
      .insert([payload])
      .select()
    if (error) throw error
    return data?.[0]
  }
}

export async function updateAsignatura(code_course, changes) {
  try {
    const payload = {}
    if (changes.name_course !== undefined) payload.name_course = changes.name_course.trim()
    if (changes.credits !== undefined) {
      const creditsVal = parseInt(changes.credits, 10)
      payload.credits = isNaN(creditsVal) ? 0 : Math.max(0, creditsVal)
    }
    if (changes.is_elective !== undefined) payload.is_elective = Boolean(changes.is_elective)
    if (changes.es_complementaria !== undefined) payload.es_complementaria = Boolean(changes.es_complementaria)
    if (changes.es_basica !== undefined) payload.es_basica = Boolean(changes.es_basica)
    if (changes.id_facultad !== undefined) {
      const facId = parseInt(changes.id_facultad, 10)
      payload.id_facultad = !isNaN(facId) ? facId : null
    }
    if (changes.facultad !== undefined) payload.facultad = changes.facultad ? changes.facultad.trim() : null

    return await requestBackend(`/asignaturas/${encodeURIComponent(code_course)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  } catch (err) {
    console.warn('Fallo backend en updateAsignatura, fallback a Supabase:', err.message)
    const updateData = {}
    if (changes.name_course !== undefined) updateData.name_course = changes.name_course.trim()
    if (changes.credits !== undefined) {
      const creditsVal = parseInt(changes.credits, 10)
      updateData.credits = isNaN(creditsVal) ? 0 : Math.max(0, creditsVal)
    }
    if (changes.is_elective !== undefined) updateData.is_elective = Boolean(changes.is_elective)
    if (changes.es_complementaria !== undefined) updateData.es_complementaria = Boolean(changes.es_complementaria)
    if (changes.es_basica !== undefined) updateData.es_basica = Boolean(changes.es_basica)
    if (changes.id_facultad !== undefined) {
      const facId = parseInt(changes.id_facultad, 10)
      updateData.id_facultad = !isNaN(facId) ? facId : null
    }

    const { data, error } = await supabase
      .from('asignaturas')
      .update(updateData)
      .eq('code_course', code_course)
      .select()

    if (error) throw error
    return data?.[0]
  }
}

export async function deleteAsignatura(code_course) {
  try {
    return await requestBackend(`/asignaturas/${encodeURIComponent(code_course)}`, {
      method: 'DELETE'
    })
  } catch (err) {
    console.warn('Fallo backend en deleteAsignatura, fallback a Supabase:', err.message)
    const { error } = await supabase
      .from('asignaturas')
      .delete()
      .eq('code_course', code_course)
    if (error) throw error
    return true
  }
}

// --- PENSUM ACADÉMICO ---

export async function getPensumByProgram(code_program) {
  try {
    return await requestBackend(`/pensum/programa/${encodeURIComponent(code_program)}`)
  } catch (err) {
    console.warn('Fallo backend en getPensumByProgram, fallback a Supabase:', err.message)
    const { data: pensumData, error: pensumError } = await supabase
      .from('pensum_academico')
      .select('*')
      .eq('code_program', code_program)
      .order('semestre', { ascending: true })

    if (pensumError) throw pensumError
    if (!pensumData || pensumData.length === 0) return []

    const courseCodes = pensumData.map(p => p.code_course)
    const { data: coursesData } = await supabase
      .from('asignaturas')
      .select('*')
      .in('code_course', courseCodes)

    const courseMap = new Map((coursesData || []).map(c => [c.code_course, c]))
    return pensumData.map(item => {
      const course = courseMap.get(item.code_course)
      return {
        ...item,
        name_course: course?.name_course || item.code_course,
        credits: course?.credits !== undefined && course?.credits !== null ? course.credits : 0,
      }
    })
  }
}

export async function getAllPensum() {
  try {
    return await requestBackend('/pensum')
  } catch (err) {
    console.warn('Backend no disponible en getAllPensum, usando Supabase directo:', err.message)
    const { data, error } = await supabase
      .from('pensum_academico')
      .select('*')
    if (error) throw error
    return data || []
  }
}

export async function addCourseToPensum({ code_program, code_course, semestre }) {
  try {
    return await requestBackend('/pensum', {
      method: 'POST',
      body: JSON.stringify({
        code_program,
        code_course,
        semestre: parseInt(semestre, 10)
      })
    })
  } catch (err) {
    console.warn('Fallo backend en addCourseToPensum, fallback a Supabase:', err.message)
    const sem = parseInt(semestre, 10)
    const { data, error } = await supabase
      .from('pensum_academico')
      .insert([{ code_program, code_course, semestre: sem }])
      .select()
    if (error) throw error
    return data?.[0]
  }
}

export async function updateCourseSemester({ code_program, code_course, semestre }) {
  try {
    return await requestBackend('/pensum/semestre', {
      method: 'PUT',
      body: JSON.stringify({
        code_program,
        code_course,
        semestre: parseInt(semestre, 10)
      })
    })
  } catch (err) {
    console.warn('Fallo backend en updateCourseSemester, fallback a Supabase:', err.message)
    const sem = parseInt(semestre, 10)
    const { data, error } = await supabase
      .from('pensum_academico')
      .update({ semestre: sem })
      .eq('code_program', code_program)
      .eq('code_course', code_course)
      .select()
    if (error) throw error
    return data?.[0]
  }
}

export async function removeCourseFromPensum({ code_program, code_course }) {
  try {
    return await requestBackend(`/pensum/${encodeURIComponent(code_program)}/${encodeURIComponent(code_course)}`, {
      method: 'DELETE'
    })
  } catch (err) {
    console.warn('Fallo backend en removeCourseFromPensum, fallback a Supabase:', err.message)
    const { error } = await supabase
      .from('pensum_academico')
      .delete()
      .eq('code_program', code_program)
      .eq('code_course', code_course)
    if (error) throw error
    return true
  }
}

// --- FACULTADES ---

export async function getFacultades() {
  try {
    return await requestBackend('/facultades')
  } catch {
    try {
      const { data, error } = await supabase.from('Facultad').select('*')
      if (!error && data) return data
      const { data: dataLower } = await supabase.from('facultad').select('*')
      if (dataLower) return dataLower
    } catch {
      // Ignorar
    }
    return []
  }
}

export async function createFacultad({ nombre, descripcion }) {
  try {
    return await requestBackend('/facultades', {
      method: 'POST',
      body: JSON.stringify({ nombre, descripcion })
    })
  } catch (err) {
    console.warn('Fallo backend en createFacultad, fallback a Supabase:', err.message)
    const payload = { nombre: (nombre || '').trim() }
    if (descripcion) payload.descripcion = descripcion.trim()
    const { data, error } = await supabase.from('Facultad').insert([payload]).select()
    if (!error && data) return data[0]
    const { data: data2, error: err2 } = await supabase.from('facultad').insert([payload]).select()
    if (!err2 && data2) return data2[0]
    throw err
  }
}

// --- DIAGNÓSTICO DE SALUD ---

export async function checkDatabaseHealth() {
  const results = {
    connected: false,
    backendConnected: false,
    tables: {
      programas: false,
      asignaturas: false,
      pensum_academico: false,
      Facultad: false,
    },
    rlsPermitted: false,
    error: null,
  }

  try {
    const res = await fetch(`${BACKEND_URL}/programas`, { method: 'GET' })
    if (res.ok) {
      results.connected = true
      results.backendConnected = true
      results.tables.programas = true
      results.tables.asignaturas = true
      results.tables.pensum_academico = true
      results.tables.Facultad = true
      return results
    }
  } catch {
    // Backend no disponible
  }

  try {
    const [progRes, asigRes, pensumRes, facultadRes] = await Promise.allSettled([
      supabase.from('programas').select('*').limit(1),
      supabase.from('asignaturas').select('*').limit(1),
      supabase.from('pensum_academico').select('*').limit(1),
      supabase.from('Facultad').select('*').limit(1),
    ])

    results.connected = true
    results.tables.programas = progRes.status === 'fulfilled' && !progRes.value.error
    results.tables.asignaturas = asigRes.status === 'fulfilled' && !asigRes.value.error
    results.tables.pensum_academico = pensumRes.status === 'fulfilled' && !pensumRes.value.error
    results.tables.Facultad = facultadRes.status === 'fulfilled' && !facultadRes.value.error
  } catch (err) {
    results.connected = false
    results.error = err.message
  }

  return results
}


// --- COORDINADORES ---

export async function getCoordinadores() {
  try {
    return await requestBackend('/coordinadores')
  } catch (err) {
    console.warn('Backend no disponible para coordinadores, fallback Supabase:', err.message)
    const { data, error } = await supabase
      .from('coordinadores')
      .select('*, programas(name_program)')
      .order('nombre_completo', { ascending: true })
    if (!error && data) {
      return data.map(c => ({
        ...c,
        name_program: c.programas?.name_program || c.code_program
      }))
    }
    return []
  }
}

export async function createCoordinador(coordinador) {
  try {
    return await requestBackend('/coordinadores', {
      method: 'POST',
      body: JSON.stringify(coordinador)
    })
  } catch (err) {
    console.warn('Fallo backend en createCoordinador, fallback Supabase:', err.message)
    const { data, error } = await supabase
      .from('coordinadores')
      .insert([coordinador])
      .select()
    if (error) throw error
    return data?.[0]
  }
}

export async function updateCoordinador(id, changes) {
  try {
    return await requestBackend('/coordinadores/' + id, {
      method: 'PUT',
      body: JSON.stringify(changes)
    })
  } catch (err) {
    console.warn('Fallo backend en updateCoordinador, fallback Supabase:', err.message)
    const { data, error } = await supabase
      .from('coordinadores')
      .update(changes)
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  }
}

export async function deleteCoordinador(id) {
  try {
    return await requestBackend('/coordinadores/' + id, {
      method: 'DELETE'
    })
  } catch (err) {
    console.warn('Fallo backend en deleteCoordinador, fallback Supabase:', err.message)
    const { error } = await supabase
      .from('coordinadores')
      .delete()
      .eq('id', id)
    if (error) throw error
    return true
  }
}


// --- CATÁLOGOS NORMALIZADOS: CATEGORÍAS Y TIPOS DE CONTRATO ---

export async function getCategorias() {
  try {
    return await requestBackend('/categorias')
  } catch {
    try {
      const { data, error } = await supabase.from('categoria').select('*').order('nombre', { ascending: true })
      if (!error && data && data.length > 0) return data
    } catch {}
    return [
      { id: 1, nombre: 'Auxiliar' },
      { id: 2, nombre: 'Asistente' },
      { id: 3, nombre: 'Asociado' },
      { id: 4, nombre: 'Titular' }
    ]
  }
}

export async function getTiposContrato() {
  try {
    return await requestBackend('/tipos-contrato')
  } catch {
    try {
      const { data, error } = await supabase.from('tipo_contrato').select('*').order('nombre', { ascending: true })
      if (!error && data && data.length > 0) return data
    } catch {}
    return [
      { id: 1, nombre: 'Nombrado' },
      { id: 2, nombre: 'Ocasional' },
      { id: 3, nombre: 'Cátedra' }
    ]
  }
}


// --- DOCENTES ---

export async function getDocentes() {
  try {
    return await requestBackend('/docentes')
  } catch (err) {
    console.warn('Backend no disponible para docentes, fallback Supabase:', err.message)
    const { data, error } = await supabase
      .from('docentes')
      .select('*, programas(name_program)')
      .order('apellidos', { ascending: true })
    if (!error && data) {
      return data.map(d => ({
        ...d,
        nombre_completo: `${d.nombres || ''} ${d.apellidos || ''}`.trim(),
        name_program: d.programas?.name_program || d.code_program
      }))
    }
    return []
  }
}

export async function toggleDocenteEstado(id, nuevoEstado) {
  try {
    return await requestBackend(`/docentes/${id}/estado?estado=${Boolean(nuevoEstado)}`, {
      method: 'PATCH'
    })
  } catch (err) {
    console.warn('Fallo backend en toggleDocenteEstado, fallback Supabase:', err.message)
    const { data, error } = await supabase
      .from('docentes')
      .update({ estado: Boolean(nuevoEstado), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  }
}

export async function toggleCoordinadorActivo(id, nuevoActivo) {
  try {
    return await requestBackend(`/coordinadores/${id}/estado?activo=${Boolean(nuevoActivo)}`, {
      method: 'PATCH'
    })
  } catch (err) {
    console.warn('Fallo backend en toggleCoordinadorActivo, fallback Supabase:', err.message)
    const { data, error } = await supabase
      .from('coordinadores')
      .update({ activo: Boolean(nuevoActivo) })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  }
}

export async function createDocente(docente) {
  try {
    return await requestBackend('/docentes', {
      method: 'POST',
      body: JSON.stringify(docente)
    })
  } catch (err) {
    console.warn('Fallo backend en createDocente, fallback Supabase:', err.message)
    const { data, error } = await supabase
      .from('docentes')
      .insert([docente])
      .select()
    if (error) throw error
    return data?.[0]
  }
}

export async function updateDocente(id, changes) {
  try {
    return await requestBackend(`/docentes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(changes)
    })
  } catch (err) {
    console.warn('Fallo backend en updateDocente, fallback Supabase:', err.message)
    const { data, error } = await supabase
      .from('docentes')
      .update(changes)
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  }
}


// --- DESHABILITACIÓN / HABILITACIÓN (SOFT DELETE) ---

export async function toggleAsignaturaActivo(code_course, nuevoActivo) {
  try {
    return await requestBackend(`/asignaturas/${encodeURIComponent(code_course)}/estado?activo=${Boolean(nuevoActivo)}`, {
      method: 'PATCH'
    })
  } catch (err) {
    console.warn('Fallo backend en toggleAsignaturaActivo, fallback Supabase:', err.message)
    const { data, error } = await supabase
      .from('asignaturas')
      .update({ activo: Boolean(nuevoActivo) })
      .eq('code_course', code_course)
      .select()
    if (error) throw error
    return data?.[0]
  }
}

export async function togglePensumActivo(code_program, code_course, nuevoActivo) {
  try {
    return await requestBackend(`/pensum/${encodeURIComponent(code_program)}/${encodeURIComponent(code_course)}/estado?activo=${Boolean(nuevoActivo)}`, {
      method: 'PATCH'
    })
  } catch (err) {
    console.warn('Fallo backend en togglePensumActivo, fallback Supabase:', err.message)
    const { data, error } = await supabase
      .from('pensum_academico')
      .update({ activo: Boolean(nuevoActivo) })
      .match({ code_program, code_course })
      .select()
    if (error) throw error
    return data?.[0]
  }
}
