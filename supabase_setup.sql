-- ==============================================================================
-- SISTEMA DE PROGRAMACIÓN ACADÉMICA - SETUP COMPLETO DE BASE DE DATOS
-- ==============================================================================
-- Este script configura las tablas, índices, triggers de validación y políticas
-- de Row Level Security (RLS) para permitir el funcionamiento completo del sistema
-- tanto en el SQL Editor de Supabase como a través del frontend con anon key.
-- ==============================================================================

-- 1. CREACIÓN DE TABLAS (Si aún no existen)
-- ------------------------------------------------------------------------------

-- Tabla de Asignaturas
CREATE TABLE IF NOT EXISTS public.asignaturas (
    code_course VARCHAR(50) PRIMARY KEY,
    name_course VARCHAR(150) NOT NULL,
    credits INT DEFAULT 0,
    is_elective BOOLEAN DEFAULT false,
    es_complementaria BOOLEAN DEFAULT false,
    es_basica BOOLEAN DEFAULT false,
    facultad VARCHAR(150),
    id_facultad INT
);

-- Asegurar que las columnas existan si la tabla ya estaba creada previamente
ALTER TABLE public.asignaturas ADD COLUMN IF NOT EXISTS es_complementaria BOOLEAN DEFAULT false;
ALTER TABLE public.asignaturas ADD COLUMN IF NOT EXISTS es_basica BOOLEAN DEFAULT false;


-- Tabla de Programas Académicos (Carreras)
CREATE TABLE IF NOT EXISTS public.programas (
    code_program VARCHAR(50) PRIMARY KEY,
    name_program VARCHAR(150) NOT NULL,
    numero_semestre INT NOT NULL DEFAULT 10
);

-- Tabla Intermedia: Pensum Académico (Malla Curricular)
CREATE TABLE IF NOT EXISTS public.pensum_academico (
    code_program VARCHAR(50) NOT NULL,
    code_course VARCHAR(50) NOT NULL,
    semestre INT NOT NULL,
    is_elective BOOLEAN DEFAULT false,
    facultad VARCHAR(150),
    
    PRIMARY KEY (code_program, code_course),
    FOREIGN KEY (code_program) REFERENCES public.programas(code_program) ON DELETE CASCADE,
    FOREIGN KEY (code_course) REFERENCES public.asignaturas(code_course) ON DELETE CASCADE
);

-- Tabla de Facultades ("Facultad" con id, nombre, descripcion)
CREATE TABLE IF NOT EXISTS public."Facultad" (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT
);

-- Índices para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_pensum_program ON public.pensum_academico(code_program);
CREATE INDEX IF NOT EXISTS idx_pensum_course ON public.pensum_academico(code_course);
CREATE INDEX IF NOT EXISTS idx_pensum_semestre ON public.pensum_academico(code_program, semestre);


-- 2. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
-- Habilitamos RLS en todas las tablas y otorgamos acceso de lectura/escritura 
-- para el rol 'anon' y 'authenticated' en el cliente web.

ALTER TABLE public.asignaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pensum_academico ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas existentes previas
DROP POLICY IF EXISTS "Permitir acceso publico total asignaturas" ON public.asignaturas;
DROP POLICY IF EXISTS "Permitir acceso publico total programas" ON public.programas;
DROP POLICY IF EXISTS "Permitir acceso publico total pensum" ON public.pensum_academico;

-- Crear políticas permisivas para la aplicación
CREATE POLICY "Permitir acceso publico total asignaturas"
    ON public.asignaturas FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir acceso publico total programas"
    ON public.programas FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir acceso publico total pensum"
    ON public.pensum_academico FOR ALL
    USING (true)
    WITH CHECK (true);


-- 3. TRIGGERS Y LÓGICA DE NEGOCIO
-- ------------------------------------------------------------------------------

-- Función y Trigger 1: Validación del número de semestre (debe ser entre 1 y 20)
CREATE OR REPLACE FUNCTION public.fn_validar_semestre_pensum()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.semestre IS NULL OR NEW.semestre < 1 OR NEW.semestre > 20 THEN
        RAISE EXCEPTION 'El semestre (%) debe ser un número entero válido entre 1 y 20.', NEW.semestre;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_semestre ON public.pensum_academico;
CREATE TRIGGER trg_validar_semestre
    BEFORE INSERT OR UPDATE OF semestre ON public.pensum_academico
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_validar_semestre_pensum();


-- Función y Trigger 2: Normalización de códigos y nombres en Asignaturas
CREATE OR REPLACE FUNCTION public.fn_normalizar_asignaturas()
RETURNS TRIGGER AS $$
BEGIN
    NEW.code_course := UPPER(TRIM(NEW.code_course));
    NEW.name_course := TRIM(NEW.name_course);
    
    IF NEW.code_course = '' THEN
        RAISE EXCEPTION 'El código de la asignatura no puede estar vacío.';
    END IF;
    IF NEW.name_course = '' THEN
        RAISE EXCEPTION 'El nombre de la asignatura no puede estar vacío.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalizar_asignaturas ON public.asignaturas;
CREATE TRIGGER trg_normalizar_asignaturas
    BEFORE INSERT OR UPDATE ON public.asignaturas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_normalizar_asignaturas();


-- Función y Trigger 3: Normalización de códigos y nombres en Programas
CREATE OR REPLACE FUNCTION public.fn_normalizar_programas()
RETURNS TRIGGER AS $$
BEGIN
    NEW.code_program := UPPER(TRIM(NEW.code_program));
    NEW.name_program := TRIM(NEW.name_program);
    
    IF NEW.code_program = '' THEN
        RAISE EXCEPTION 'El código del programa no puede estar vacío.';
    END IF;
    IF NEW.name_program = '' THEN
        RAISE EXCEPTION 'El nombre del programa no puede estar vacío.';
    END IF;
    IF NEW.numero_semestre < 1 OR NEW.numero_semestre > 20 THEN
        RAISE EXCEPTION 'El número de semestres debe estar entre 1 y 20.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalizar_programas ON public.programas;
CREATE TRIGGER trg_normalizar_programas
    BEFORE INSERT OR UPDATE ON public.programas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_normalizar_programas();

