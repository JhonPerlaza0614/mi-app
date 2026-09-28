# Documentación del Sistema de Programación Académica

Este documento consolida la arquitectura de la base de datos, la lógica de negocio (triggers), la seguridad (RLS) y la estructura del frontend en React para la gestión del pensum académico universitario.

---

## 1. Arquitectura de la Base de Datos (PostgreSQL / Supabase)

El esquema de datos maneja la relación de muchos a muchos entre las carreras (**Programas**) y las materias (**Asignaturas**) a través de la tabla de vinculación (**Pensum Académico**).

### Creación de Tablas

```sql
-- 1. Tabla de Asignaturas
CREATE TABLE public.asignaturas (
    code_course VARCHAR(50) PRIMARY KEY,
    name_course VARCHAR(150) NOT NULL
);

-- 2. Tabla de Programa o Carrera
CREATE TABLE public.programas (
    code_program VARCHAR(50) PRIMARY KEY,
    name_program VARCHAR(150) NOT NULL,
    grupo INT NOT NULL DEFAULT 1
);

-- 3. Tabla Intermedia: Pensum Académico (Malla Curricular)
CREATE TABLE public.pensum_academico (
    code_program VARCHAR(50),
    code_course VARCHAR(50),
    semestre INT NOT NULL,
    
    -- Llave primaria compuesta
    PRIMARY KEY (code_program, code_course),
    
    -- Llaves foráneas con borrado en cascada
    FOREIGN KEY (code_program) REFERENCES public.programas(code_program) ON DELETE CASCADE,
    FOREIGN KEY (code_course) REFERENCES public.asignaturas(code_course) ON DELETE CASCADE
);

-- Índices de optimización
CREATE INDEX idx_pensum_program ON public.pensum_academico(code_program);
CREATE INDEX idx_pensum_course ON public.pensum_academico(code_course);
CREATE INDEX idx_pensum_semestre ON public.pensum_academico(code_program, semestre);
```

---

## 2. Políticas de Seguridad (Row Level Security - RLS)

Para permitir que el cliente frontend interactúe de forma segura a través de Supabase (`anon` key), se activan las políticas RLS:

```sql
ALTER TABLE public.asignaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pensum_academico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acceso publico total asignaturas"
    ON public.asignaturas FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso publico total programas"
    ON public.programas FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso publico total pensum"
    ON public.pensum_academico FOR ALL USING (true) WITH CHECK (true);
```

---

## 3. Lógica de Negocio y Triggers (PL/pgSQL)

### 3.1 Trigger de Validación de Semestre
Asegura que el semestre asignado sea un entero estrictamente positivo y dentro de un rango realista (1 a 20).

```sql
CREATE OR REPLACE FUNCTION public.fn_validar_semestre_pensum()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.semestre IS NULL OR NEW.semestre < 1 OR NEW.semestre > 20 THEN
        RAISE EXCEPTION 'El semestre (%) debe ser un número entero válido entre 1 y 20.', NEW.semestre;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_semestre
    BEFORE INSERT OR UPDATE OF semestre ON public.pensum_academico
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_validar_semestre_pensum();
```

### 3.2 Trigger de Normalización de Asignaturas
Convierte los códigos de asignaturas a mayúsculas sin espacios en blanco redundantes y valida cadenas no vacías.

```sql
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

CREATE TRIGGER trg_normalizar_asignaturas
    BEFORE INSERT OR UPDATE ON public.asignaturas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_normalizar_asignaturas();
```

### 3.3 Trigger de Normalización de Programas
Garantiza códigos consistentes en mayúsculas y valida que el grupo sea un número válido.

```sql
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
    IF NEW.grupo < 1 THEN
        RAISE EXCEPTION 'El número de grupo debe ser al menos 1.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_normalizar_programas
    BEFORE INSERT OR UPDATE ON public.programas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_normalizar_programas();
```

---

## 4. Estructura del Frontend en React

La aplicación frontend está organizada modularmente bajo `src/`:

```
src/
├── assets/                  # Íconos y recursos estáticos
├── components/
│   ├── Navbar.jsx           # Navegación principal entre módulos
│   ├── PensumView.jsx       # Visualizador de malla curricular organizada por semestres
│   ├── ProgramasView.jsx    # Módulo CRUD para programas académicos (carreras)
│   ├── AsignaturasView.jsx  # Módulo CRUD para asignaturas (materias)
│   ├── SqlSetupModal.jsx    # Asistente modal con script SQL y verificador de conexión
│   └── Toast.jsx            # Notificaciones toast flotantes
├── services/
│   └── academicService.js   # Capa de abstracción para consultas y mutaciones en Supabase
├── supabase.ts              # Inicialización del cliente Supabase
├── App.jsx                  # Componente contenedor y enrutamiento por pestañas
├── App.css                  # Estilos del sistema de diseño moderno
├── index.css                # Estilos base y variables CSS
└── main.jsx                 # Punto de entrada de la aplicación React
```

### 4.1 Módulos y Funcionalidades Principales

1. **Gestor de Mallas Curriculares (Pensum Académico)**:
   - Selección dinámica de la carrera a consultar.
   - Distribución de asignaturas en columnas por semestre (Semestre 1 al N).
   - Asignación rápida de asignaturas existentes a un semestre seleccionado.
   - Reasignación de semestre o eliminación de una materia del pensum.
   - Modo de exportación / vista para impresión de la malla curricular.
   - Estadísticas del pensum (total asignaturas, semestres activos, promedio por semestre).

2. **Gestor de Programas Académicos**:
   - Listado en cuadrícula y tabla con búsqueda por código o nombre.
   - Creación y edición con validación de código, nombre y grupo.
   - Eliminación con protección y aviso de cascada.
   - Contador de asignaturas asociadas a cada programa.

3. **Banco de Asignaturas**:
   - Catálogo global de materias disponibles.
   - Búsqueda en tiempo real por código o nombre.
   - Creación, actualización y eliminación de asignaturas.
   - Información de en qué programas está siendo impartida cada asignatura.

4. **Monitoreo y Configuración de Base de Datos**:
   - Diagnóstico en tiempo real del estado de conexión con Supabase.
   - Script SQL listo para ser ejecutado con un clic si las tablas o políticas aún no se han configurado en Supabase.