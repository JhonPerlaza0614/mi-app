// Servicio de Docentes (HU-026 y HU-022)
// Misma URL base que usa el login (ya incluye /api) y mismo token de sesión.
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080/api').replace(/\/+$/, '')
const SESSION_KEY = 'cda.auth.session'

function authHeaders() {
    try {
        const raw = window.sessionStorage.getItem(SESSION_KEY)
        const token = raw ? JSON.parse(raw)?.token : null
        return token ? { Authorization: `Bearer ${token}` } : {}
    } catch {
        return {}
    }
}

// Error con status y cuerpo, para que la vista pueda distinguir 400 / 409 / 500
export class ApiError extends Error {
    constructor(message, status, body) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.body = body
    }
}

async function request(path, options = {}) {
    let res
    try {
        res = await fetch(`${BACKEND_URL}${path}`, {
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            ...options
        })
    } catch {
        throw new ApiError('No se pudo conectar con el servidor', 0, null)
    }

    let body = null
    try {
        body = await res.json()
    } catch {
        // respuesta sin cuerpo JSON
    }

    if (!res.ok) {
        throw new ApiError(body?.message || `Error ${res.status}`, res.status, body)
    }
    return body
}

// GET /api/docentes
export const getDocentes = () => request('/docentes')

// POST /api/docentes
export const createDocente = (payload) =>
    request('/docentes', { method: 'POST', body: JSON.stringify(payload) })

// PUT /api/docentes/{id}
export const updateDocente = (id, payload) =>
    request(`/docentes/${id}`, { method: 'PUT', body: JSON.stringify(payload) })

// GET /api/docentes/me?correo=...
export const getMiPerfil = (correo) =>
    request(`/docentes/me?correo=${encodeURIComponent(correo)}`)

// GET /api/coordinadores/me?correo=...
export const getMiPerfilCoordinador = (correo) =>
    request(`/coordinadores/me?correo=${encodeURIComponent(correo)}`)