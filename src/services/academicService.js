import { supabase } from '../supabase'

/**
 * Servicio para la gestión de Programas, Asignaturas y Pensum Académico
 */

// --- PROGRAMAS ---

export async function getProgramas() {
  const { data, error } = await supabase
    .from('programas')
    .select('*')
    .order('name_program', { ascending: true })
  
  if (error) throw error
  return data || []
}

export async function createPrograma(programa) {
  const { data, error } = await supabase
    .from('programas')
    .insert([
      {
        code_program: programa.code_program.trim().toUpperCase(),
        name_program: programa.name_program.trim(),
        grupo: parseInt(programa.grupo, 10) || 1,
        numero_semestre: parseInt(programa.numero_semestre, 10) || 10,
      }
    ])
    .select()

  if (error) throw error
  return data?.[0]
}

export async function updatePrograma(code_program, changes) {
  const updateData = {}
  if (changes.name_program !== undefined) updateData.name_program = changes.name_program.trim()
  if (changes.grupo !== undefined) updateData.grupo = parseInt(changes.grupo, 10)
  if (changes.numero_semestre !== undefined) {
    updateData.numero_semestre = parseInt(changes.numero_semestre, 10) || 10
  }

  const { data, error } = await supabase
    .from('programas')
    .update(updateData)
    .eq('code_program', code_program)
    .select()

  if (error) throw error
  return data?.[0]
}

export async function deletePrograma(code_program) {
  const { error } = await supabase
    .from('programas')
    .delete()
    .eq('code_program', code_program)

  if (error) throw error
  return true
}


// --- ASIGNATURAS ---

export async function getAsignaturas() {
  const { data, error } = await supabase
    .from('asignaturas')
    .select('*')
    .order('name_course', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createAsignatura(asignatura) {
  const creditsVal = parseInt(asignatura.credits, 10)
  const { data, error } = await supabase
    .from('asignaturas')
    .insert([
      {
        code_course: asignatura.code_course.trim().toUpperCase(),
        name_course: asignatura.name_course.trim(),
        credits: isNaN(creditsVal) ? 0 : Math.max(0, creditsVal),
      }
    ])
    .select()

  if (error) throw error
  return data?.[0]
}

export async function updateAsignatura(code_course, changes) {
  const updateData = {}
  if (changes.name_course !== undefined) updateData.name_course = changes.name_course.trim()
  if (changes.credits !== undefined) {
    const creditsVal = parseInt(changes.credits, 10)
    updateData.credits = isNaN(creditsVal) ? 0 : Math.max(0, creditsVal)
  }

  const { data, error } = await supabase
    .from('asignaturas')
    .update(updateData)
    .eq('code_course', code_course)
    .select()

  if (error) throw error
  return data?.[0]
}

export async function deleteAsignatura(code_course) {
  const { error } = await supabase
    .from('asignaturas')
    .delete()
    .eq('code_course', code_course)

  if (error) throw error
  return true
}


// --- PENSUM ACADÉMICO ---

export async function getPensumByProgram(code_program) {
  // Obtenemos los registros de la tabla intermedia
  const { data: pensumData, error: pensumError } = await supabase
    .from('pensum_academico')
    .select('*')
    .eq('code_program', code_program)
    .order('semestre', { ascending: true })

  if (pensumError) throw pensumError

  if (!pensumData || pensumData.length === 0) {
    return []
  }

  // Obtenemos las asignaturas para combinar nombre y detalles
  const courseCodes = pensumData.map(p => p.code_course)
  const { data: coursesData, error: coursesError } = await supabase
    .from('asignaturas')
    .select('*')
    .in('code_course', courseCodes)

  if (coursesError) {
    console.warn('Error fetching courses detail, returning raw pensum data:', coursesError)
    return pensumData
  }

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

export async function getAllPensum() {
  const { data, error } = await supabase
    .from('pensum_academico')
    .select('*')

  if (error) throw error
  return data || []
}

export async function addCourseToPensum({ code_program, code_course, semestre }) {
  const sem = parseInt(semestre, 10)
  if (isNaN(sem) || sem < 1 || sem > 20) {
    throw new Error('El semestre debe ser un número entero entre 1 y 20')
  }

  const { data, error } = await supabase
    .from('pensum_academico')
    .insert([
      {
        code_program,
        code_course,
        semestre: sem,
      }
    ])
    .select()

  if (error) throw error
  return data?.[0]
}

export async function updateCourseSemester({ code_program, code_course, semestre }) {
  const sem = parseInt(semestre, 10)
  if (isNaN(sem) || sem < 1 || sem > 20) {
    throw new Error('El semestre debe ser un número entero entre 1 y 20')
  }

  const { data, error } = await supabase
    .from('pensum_academico')
    .update({ semestre: sem })
    .eq('code_program', code_program)
    .eq('code_course', code_course)
    .select()

  if (error) throw error
  return data?.[0]
}

export async function removeCourseFromPensum({ code_program, code_course }) {
  const { error } = await supabase
    .from('pensum_academico')
    .delete()
    .eq('code_program', code_program)
    .eq('code_course', code_course)

  if (error) throw error
  return true
}

// --- DIAGNÓSTICO DE BASE DE DATOS ---

export async function checkDatabaseHealth() {
  const results = {
    connected: false,
    tables: {
      programas: false,
      asignaturas: false,
      pensum_academico: false,
    },
    rlsPermitted: false,
    error: null,
  }

  try {
    const [progRes, asigRes, pensumRes] = await Promise.allSettled([
      supabase.from('programas').select('*').limit(1),
      supabase.from('asignaturas').select('*').limit(1),
      supabase.from('pensum_academico').select('*').limit(1),
    ])

    results.connected = true
    results.tables.programas = progRes.status === 'fulfilled' && !progRes.value.error
    results.tables.asignaturas = asigRes.status === 'fulfilled' && !asigRes.value.error
    results.tables.pensum_academico = pensumRes.status === 'fulfilled' && !pensumRes.value.error

    if (progRes.status === 'fulfilled' && progRes.value.error) {
      results.error = progRes.value.error.message
    }
  } catch (err) {
    results.connected = false
    results.error = err.message
  }

  return results
}
