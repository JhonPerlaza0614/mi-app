-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.asignaturas (
  code_course character varying NOT NULL,
  name_course character varying NOT NULL,
  credits integer,
  is_elective boolean NOT NULL DEFAULT false,
  id_facultad integer,
  es_complementaria boolean DEFAULT false,
  es_basica boolean DEFAULT false,
  facultad character varying,
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT asignaturas_pkey PRIMARY KEY (code_course),
  CONSTRAINT asignaturas_id_facultad_fkey FOREIGN KEY (id_facultad) REFERENCES public.Facultad(id)
);
CREATE TABLE public.programas (
  code_program character varying NOT NULL,
  name_program character varying NOT NULL,
  numero_semestre integer,
  id_facultad_programa integer,
  CONSTRAINT programas_pkey PRIMARY KEY (code_program),
  CONSTRAINT programas_id_facultad_programa_fkey FOREIGN KEY (id_facultad_programa) REFERENCES public.Facultad(id)
);
CREATE TABLE public.pensum_academico (
  code_program character varying,
  code_course character varying DEFAULT ''::character varying,
  semestre integer NOT NULL,
  facultad character varying,
  is_elective boolean,
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT pensum_academico_code_course_fkey FOREIGN KEY (code_course) REFERENCES public.asignaturas(code_course),
  CONSTRAINT pensum_academico_code_program_fkey FOREIGN KEY (code_program) REFERENCES public.programas(code_program)
);
CREATE TABLE public.Facultad (
  id integer NOT NULL DEFAULT nextval('"Facultad_id_seq"'::regclass),
  nombre character varying NOT NULL,
  descripcion text,
  CONSTRAINT Facultad_pkey PRIMARY KEY (id)
);
CREATE TABLE public.usuarios (
  id integer NOT NULL DEFAULT nextval('"Usuario_id_seq"'::regclass),
  nombre character varying NOT NULL,
  apellido character varying NOT NULL,
  telefono integer,
  email_institucional character varying NOT NULL,
  email_personal character varying NOT NULL,
  rol integer NOT NULL,
  detalle_docente text,
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id)
);
CREATE TABLE public.flyway_schema_history (
  installed_rank integer NOT NULL,
  version character varying,
  description character varying NOT NULL,
  type character varying NOT NULL,
  script character varying NOT NULL,
  checksum integer,
  installed_by character varying NOT NULL,
  installed_on timestamp without time zone NOT NULL DEFAULT now(),
  execution_time integer NOT NULL,
  success boolean NOT NULL,
  CONSTRAINT flyway_schema_history_pkey PRIMARY KEY (installed_rank)
);
CREATE TABLE public.coordinadores (
  id integer NOT NULL DEFAULT nextval('coordinadores_id_seq'::regclass),
  identificacion character varying NOT NULL UNIQUE,
  nombre_completo character varying NOT NULL,
  correo character varying,
  correo_institucional character varying NOT NULL UNIQUE,
  telefono character varying,
  code_program character varying,
  activo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  categoria character varying DEFAULT 'Auxiliar'::character varying,
  tipo_contrato character varying,
  id_categoria integer,
  id_tipo_contrato integer,
  CONSTRAINT coordinadores_pkey PRIMARY KEY (id),
  CONSTRAINT fk_coordinador_programa FOREIGN KEY (code_program) REFERENCES public.programas(code_program),
  CONSTRAINT fk_coordinador_categoria FOREIGN KEY (id_categoria) REFERENCES public.categoria(id),
  CONSTRAINT fk_coordinador_tipo_contrato FOREIGN KEY (id_tipo_contrato) REFERENCES public.tipo_contrato(id)
);
CREATE TABLE public.tipo_contrato (
  id integer NOT NULL DEFAULT nextval('tipo_contrato_id_seq'::regclass),
  nombre character varying NOT NULL UNIQUE,
  CONSTRAINT tipo_contrato_pkey PRIMARY KEY (id)
);
CREATE TABLE public.categoria (
  id integer NOT NULL DEFAULT nextval('categoria_id_seq'::regclass),
  nombre character varying NOT NULL UNIQUE,
  CONSTRAINT categoria_pkey PRIMARY KEY (id)
);
CREATE TABLE public.docentes (
  id bigint NOT NULL DEFAULT nextval('docentes_id_seq'::regclass),
  codigo character varying NOT NULL UNIQUE,
  nombres character varying NOT NULL,
  apellidos character varying NOT NULL,
  tipo_documento character varying NOT NULL CHECK (tipo_documento::text = ANY (ARRAY['CC'::character varying, 'CE'::character varying, 'PP'::character varying]::text[])),
  numero_documento character varying NOT NULL UNIQUE,
  correo_institucional character varying NOT NULL UNIQUE,
  telefono character varying,
  tipo_docente character varying NOT NULL CHECK (tipo_docente::text = ANY (ARRAY['NOMBRADO'::character varying, 'HORA_CATEDRA'::character varying]::text[])),
  categoria character varying NOT NULL CHECK (categoria::text = ANY (ARRAY['AUXILIAR'::character varying, 'ASISTENTE'::character varying, 'ASOCIADO'::character varying, 'TITULAR'::character varying]::text[])),
  code_program character varying NOT NULL,
  foto_url character varying,
  evaluacion_periodo character varying,
  evaluacion_valor numeric,
  estado boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT docentes_pkey PRIMARY KEY (id),
  CONSTRAINT fk_docentes_programa FOREIGN KEY (code_program) REFERENCES public.programas(code_program)
);
CREATE TABLE public.periodos (
  id bigint NOT NULL DEFAULT nextval('periodos_id_seq'::regclass),
  nombre character varying NOT NULL,
  estado character varying NOT NULL CHECK (estado::text = ANY (ARRAY['VIGENTE'::character varying, 'HISTORICO'::character varying, 'DESACTIVADO'::character varying]::text[])),
  numero_resolucion character varying,
  enlace_resolucion character varying,
  inicio_semestre date NOT NULL,
  fin_semestre date NOT NULL,
  fecha_adicion date,
  fecha_cancelacion date,
  plazo_docentes_inicio timestamp with time zone,
  plazo_docentes_fin timestamp with time zone,
  plazo_coordinadores_inicio timestamp with time zone,
  plazo_coordinadores_fin timestamp with time zone,
  fecha_desactivacion timestamp with time zone,
  CONSTRAINT periodos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.disponibilidades_docentes (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_docente integer,
  dia integer NOT NULL,
  hora_inicio time without time zone,
  hora_fin time without time zone,
  CONSTRAINT disponibilidades_docentes_pkey PRIMARY KEY (id),
  CONSTRAINT disponibilidades_docentes_id_docente_fkey FOREIGN KEY (id_docente) REFERENCES public.usuarios(id)
);
CREATE TABLE public.periodos_academicos (
  id bigint NOT NULL DEFAULT nextval('periodos_academicos_id_seq'::regclass),
  nombre character varying NOT NULL UNIQUE,
  numero_resolucion character varying NOT NULL UNIQUE,
  fecha_resolucion date NOT NULL,
  fecha_inicio_semestre date NOT NULL,
  fecha_fin_semestre date NOT NULL,
  fecha_adicion_inicio date NOT NULL,
  fecha_adicion_fin date NOT NULL,
  fecha_cancelacion_inicio date NOT NULL,
  fecha_cancelacion_fin date NOT NULL,
  plazo_docente_inicio timestamp with time zone NOT NULL,
  plazo_docente_fin timestamp with time zone NOT NULL,
  plazo_coordinador_inicio timestamp with time zone,
  plazo_coordinador_fin timestamp with time zone,
  enlace_resolucion text,
  vigente boolean NOT NULL DEFAULT true,
  estado character varying NOT NULL DEFAULT 'VIGENTE' CHECK (estado IN ('VIGENTE', 'HISTORIAL', 'DESACTIVADO')),
  version bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT periodos_academicos_pkey PRIMARY KEY (id)
);

ALTER TABLE public.disponibilidades_docentes
  ADD COLUMN IF NOT EXISTS periodo_id bigint;

ALTER TABLE public.disponibilidades_docentes
  ADD CONSTRAINT fk_disponibilidad_periodo
  FOREIGN KEY (periodo_id) REFERENCES public.periodos_academicos(id);

CREATE INDEX IF NOT EXISTS ix_disponibilidad_docente_periodo
  ON public.disponibilidades_docentes (id_docente, periodo_id, dia, hora_inicio);