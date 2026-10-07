import React, { useState } from 'react'
import { Copy, Check, Database, ShieldCheck, Zap, X, RefreshCw } from 'lucide-react'
import { checkDatabaseHealth } from '../services/academicService'

export default function SqlSetupModal({ isOpen, onClose, onRefreshData }) {
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(false)
  const [healthStatus, setHealthStatus] = useState(null)

  if (!isOpen) return null

  const sqlScript = `-- 0. Asegurar columnas nuevas en asignaturas y programas
ALTER TABLE public.asignaturas ADD COLUMN IF NOT EXISTS credits int4 DEFAULT 0;
ALTER TABLE public.asignaturas ADD COLUMN IF NOT EXISTS es_complementaria BOOLEAN DEFAULT false;
ALTER TABLE public.asignaturas ADD COLUMN IF NOT EXISTS es_basica BOOLEAN DEFAULT false;
ALTER TABLE public.programas ADD COLUMN IF NOT EXISTS numero_semestre int4 DEFAULT 10;

-- 1. Habilitar RLS y otorgar permisos a anon
ALTER TABLE public.asignaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pensum_academico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acceso publico total asignaturas" ON public.asignaturas;
DROP POLICY IF EXISTS "Permitir acceso publico total programas" ON public.programas;
DROP POLICY IF EXISTS "Permitir acceso publico total pensum" ON public.pensum_academico;

CREATE POLICY "Permitir acceso publico total asignaturas"
    ON public.asignaturas FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso publico total programas"
    ON public.programas FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso publico total pensum"
    ON public.pensum_academico FOR ALL USING (true) WITH CHECK (true);

-- 2. Triggers de Lógica de Negocio
CREATE OR REPLACE FUNCTION public.fn_validar_semestre_pensum()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.semestre IS NULL OR NEW.semestre < 1 OR NEW.semestre > 20 THEN
        RAISE EXCEPTION 'El semestre (%) debe ser un número entero entre 1 y 20.', NEW.semestre;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_semestre ON public.pensum_academico;
CREATE TRIGGER trg_validar_semestre
    BEFORE INSERT OR UPDATE OF semestre ON public.pensum_academico
    FOR EACH ROW EXECUTE FUNCTION public.fn_validar_semestre_pensum();

-- Normalización en Asignaturas
CREATE OR REPLACE FUNCTION public.fn_normalizar_asignaturas()
RETURNS TRIGGER AS $$
BEGIN
    NEW.code_course := UPPER(TRIM(NEW.code_course));
    NEW.name_course := TRIM(NEW.name_course);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalizar_asignaturas ON public.asignaturas;
CREATE TRIGGER trg_normalizar_asignaturas
    BEFORE INSERT OR UPDATE ON public.asignaturas
    FOR EACH ROW EXECUTE FUNCTION public.fn_normalizar_asignaturas();

-- Normalización en Programas
CREATE OR REPLACE FUNCTION public.fn_normalizar_programas()
RETURNS TRIGGER AS $$
BEGIN
    NEW.code_program := UPPER(TRIM(NEW.code_program));
    NEW.name_program := TRIM(NEW.name_program);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalizar_programas ON public.programas;
CREATE TRIGGER trg_normalizar_programas
    BEFORE INSERT OR UPDATE ON public.programas
    FOR EACH ROW EXECUTE FUNCTION public.fn_normalizar_programas();`

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlScript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleCheckHealth = async () => {
    setChecking(true)
    try {
      const res = await checkDatabaseHealth()
      setHealthStatus(res)
      if (onRefreshData) onRefreshData()
    } catch (err) {
      setHealthStatus({ connected: false, error: err.message })
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-large">
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <Database className="text-primary" size={24} />
            <h2>Configuración de Base de Datos (Supabase)</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="info-callout">
            <p>
              Para que la aplicación web pueda crear, actualizar y borrar materias y programas,
              ejecuta este script en el <strong>SQL Editor</strong> de tu proyecto en Supabase.
              Configura permisos de acceso (RLS) y lógica de validación a nivel de base de datos.
            </p>
          </div>

          <div className="feature-badges-grid">
            <div className="feature-badge-item">
              <ShieldCheck className="badge-icon success" size={18} />
              <div>
                <strong>Políticas RLS</strong>
                <span>Habilita permisos de lectura y escritura para la llave anon.</span>
              </div>
            </div>
            <div className="feature-badge-item">
              <Zap className="badge-icon warning" size={18} />
              <div>
                <strong>Validación y Normalización</strong>
                <span>Valida que el semestre esté entre 1 y 20 y normaliza códigos a mayúsculas.</span>
              </div>
            </div>
          </div>

          <div className="code-block-container">
            <div className="code-block-header">
              <span>Script SQL (supabase_setup.sql)</span>
              <button className="btn-secondary btn-sm" onClick={handleCopy}>
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                {copied ? '¡Copiado!' : 'Copiar Script SQL'}
              </button>
            </div>
            <pre className="code-pre">
              <code>{sqlScript}</code>
            </pre>
          </div>

          <div className="setup-steps-list">
            <h4>Pasos rápidos para aplicar en Supabase:</h4>
            <ol>
              <li>Haz clic en el botón <strong>"Copiar Script SQL"</strong> de arriba.</li>
              <li>Abre tu consola de Supabase y ve a la sección <strong>SQL Editor</strong> (Nueva Consulta).</li>
              <li>Pega el script y presiona <strong>Run</strong> (Ejecutar).</li>
              <li>Regresa aquí y presiona <strong>"Verificar Conexión"</strong>.</li>
            </ol>
          </div>

          {healthStatus && (
            <div className={`health-status-box ${healthStatus.connected ? 'healthy' : 'unhealthy'}`}>
              <strong>Diagnóstico:</strong>
              {healthStatus.connected ? (
                <div>
                  <p className="text-success">Conexión con Supabase establecida exitosamente.</p>
                  <ul>
                    <li>Tabla <code>programas</code>: {healthStatus.tables?.programas ? 'Disponible' : 'Error'}</li>
                    <li>Tabla <code>asignaturas</code>: {healthStatus.tables?.asignaturas ? 'Disponible' : 'Error'}</li>
                    <li>Tabla <code>pensum_academico</code>: {healthStatus.tables?.pensum_academico ? 'Disponible' : 'Error'}</li>
                  </ul>
                </div>
              ) : (
                <p className="text-danger">Error: {healthStatus.error || 'No se pudo conectar a la base de datos'}</p>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={handleCheckHealth}
            disabled={checking}
          >
            <RefreshCw size={16} className={checking ? 'spin' : ''} />
            {checking ? 'Comprobando...' : 'Verificar Conexión'}
          </button>
          <button type="button" className="btn-primary" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
