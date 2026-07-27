# Modelo de Base de Datos - MVP Coordinador Técnico v3.3

> **Nota**: Este documento refleja el modelo de datos real basado en `schema.prisma`. Compatible con PostgreSQL (producción) y SQLite (desarrollo).

## 1. Diagrama de Entidades y Relaciones (Completo)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   CLIENTES │       │    LOCALES  │       │  TÉCNICOS   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)    │◄──────│ id (PK)    │       │ id (PK)    │
│ nombre     │       │ id_cliente │───────│ nombre     │
│ ruc        │       │ nombre     │       │ cedula     │
│ telefono   │       │ direccion  │       │ telefono   │
│ email      │       │ ciudad     │       │ especialidad│
│ estado     │       │ estado     │       │ estado     │
└─────────────┘       └─────────────┘       └─────────────┘
                            │                      │
                            │                      │
                            ▼                      ▼
                      ┌──────────────────────────────────┐
                      │           TAREA                  │
                      ├──────────────────────────────────┤
                      │ id (PK)                          │
                      │ id_cliente (FK)                  │
                      │ id_local (FK)                    │
                      │ id_tecnico (FK)                  │
                      │ tipo_trabajo (enum)              │
                      │ prioridad (enum)                 │
                      │ estado (enum)                    │
                      │ descripcion (text)              │
                      │ fecha_creacion (datetime)        │
                      │ fecha_programada (date)          │
                      │ fecha_inicio (datetime)          │
                      │ fecha_fin (datetime)            │
                      │ facturable (boolean)             │
                      │ informe_adjunto (boolean)         │
                      │ estado_informe (enum)            │
                      └──────────────────────────────────┘
                                    │
                                    ▼
                      ┌──────────────────────────────────┐
                      │      HISTORIAL_TAREA              │
                      ├──────────────────────────────────┤
                      │ id (PK)                          │
                      │ id_tarea (FK)                    │
                      │ accion (enum)                    │
                      │ estado_anterior (enum)           │
                      │ estado_nuevo (enum)              │
                      │ motivo (text)                    │
                      │ fecha_cambio (datetime)          │
                      │ usuario (string)                 │
                      └──────────────────────────────────┘
                                    │
                                    ▼
                      ┌──────────────────────────────────┐
                      │      REGISTRO_HORAS              │
                      ├──────────────────────────────────┤
                      │ id (PK)                          │
                      │ id_tarea (FK)                    │
                      │ id_tecnico (FK)                  │
                      │ fecha (date)                     │
                      │ hora_inicio (time)               │
                      │ hora_fin (time)                  │
                      │ horas_trabajadas (decimal)       │
                      │ es_viaje (boolean)               │
                      │ es_fin_semana (boolean)          │
                      │ es_hora_extra (boolean)          │
                      └──────────────────────────────────┘
```

---

## 2. Definición de Tablas

### 2.1 Tabla: clientes

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | SERIAL | PK, NOT NULL | Identificador único |
| nombre | VARCHAR(255) | NOT NULL | Razón social |
| ruc | VARCHAR(20) | UNIQUE | Número RUC |
| telefono | VARCHAR(20) | | Teléfono de contacto |
| email | VARCHAR(100) | | Correo electrónico |
| direccion | TEXT | | Dirección fiscal |
| estado | VARCHAR(20) | DEFAULT 'activo' | Estado del cliente |
| created_at | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | DEFAULT NOW() | Fecha de actualización |

### 2.2 Tabla: locales

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | SERIAL | PK, NOT NULL | Identificador único |
| id_cliente | INTEGER | FK → clientes.id, NOT NULL | Cliente asociado |
| nombre | VARCHAR(255) | NOT NULL | Nombre del local |
| direccion | TEXT | | Dirección del local |
| ciudad | VARCHAR(100) | | Ciudad |
| zona | VARCHAR(100) | | Zona/sector |
| estado | VARCHAR(20) | DEFAULT 'activo' | Estado |
| created_at | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | DEFAULT NOW() | Fecha de actualización |

### 2.3 Tabla: tecnicos

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | SERIAL | PK, NOT NULL | Identificador único |
| nombre | VARCHAR(255) | NOT NULL | Nombre completo |
| cedula | VARCHAR(20) | UNIQUE | Número de cédula |
| telefono | VARCHAR(20) | | Teléfono de contacto |
| email | VARCHAR(100) | | Correo electrónico |
| especialidad | VARCHAR(100) | | Especialidad técnica |
| jornada_horaria | INTEGER | DEFAULT 8 | Horas diarias programadas |
| estado | VARCHAR(20) | DEFAULT 'activo' | Estado |
| created_at | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | DEFAULT NOW() | Fecha de actualización |

### 2.4 Tabla: tareas

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | SERIAL | PK, NOT NULL | Identificador único |
| id_cliente | INTEGER | FK → clientes.id, NOT NULL | Cliente |
| id_local | INTEGER | FK → locales.id, NOT NULL | Local |
| id_tecnico | INTEGER | FK → tecnicos.id | Técnico asignado |
| tipo_trabajo | VARCHAR(50) | NOT NULL | Tipo: correctivo, preventivo, instalación, visita |
| prioridad | VARCHAR(20) | NOT NULL | Prioridad: baja, media, alta, urgente |
| estado | VARCHAR(20) | DEFAULT 'pendiente' | Estado de la tarea |
| descripcion | TEXT | | Descripción del trabajo |
| fecha_creacion | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| fecha_programada | DATE | | Fecha programada |
| hora_programada | TIME | | Hora programada |
| fecha_inicio | TIMESTAMP | | Fecha de inicio real |
| fecha_fin | TIMESTAMP | | Fecha de finalización |
| facturable | BOOLEAN | DEFAULT false | Si es facturable |
| informe_adjunto | BOOLEAN | DEFAULT false | Si tiene informe técnico |
| estado_informe | VARCHAR(20) | DEFAULT 'pendiente' | Estado del informe |
| observaciones | TEXT | | Observaciones finales |
| created_at | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | DEFAULT NOW() | Fecha de actualización |

### 2.5 Tabla: historial_tareas

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | SERIAL | PK, NOT NULL | Identificador único |
| id_tarea | INTEGER | FK → tareas.id, NOT NULL | Tarea relacionada |
| accion | VARCHAR(50) | NOT NULL | Acción: creado, asignado, estado, reprogramado, etc. |
| estado_anterior | VARCHAR(20) | | Estado anterior |
| estado_nuevo | VARCHAR(20) | | Estado nuevo |
| motivo | TEXT | | Motivo del cambio |
| fecha_cambio | TIMESTAMP | DEFAULT NOW() | Fecha del cambio |
| usuario | VARCHAR(100) | | Usuario que realizó el cambio |

### 2.6 Tabla: registro_horas

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | SERIAL | PK, NOT NULL | Identificador único |
| id_tarea | INTEGER | FK → tareas.id | Tarea asociada |
| id_tecnico | INTEGER | FK → tecnicos.id, NOT NULL | Técnico |
| fecha | DATE | NOT NULL | Fecha del registro |
| hora_inicio | TIME | NOT NULL | Hora de inicio |
| hora_fin | TIME | | Hora de fin |
| horas_trabajadas | DECIMAL(5,2) | NOT NULL | Horas trabajadas |
| es_viaje | BOOLEAN | DEFAULT false | Si es tiempo de viaje |
| es_fin_semana | BOOLEAN | DEFAULT false | Si es fin de semana |
| es_hora_extra | BOOLEAN | DEFAULT false | Si es hora extra |
| observaciones | TEXT | | Observaciones |
| created_at | TIMESTAMP | DEFAULT NOW() | Fecha de creación |

### 2.7 Tabla: usuarios (para autenticación)

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | SERIAL | PK, NOT NULL | Identificador único |
| username | VARCHAR(100) | UNIQUE, NOT NULL | Nombre de usuario |
| password | VARCHAR(255) | NOT NULL | Contraseña encriptada |
| rol | VARCHAR(20) | NOT NULL | Rol: admin, coordinador, tecnico |
| id_tecnico | INTEGER | FK → tecnicos.id | Técnico asociado (si aplica) |
| estado | VARCHAR(20) | DEFAULT 'activo' | Estado |
| created_at | TIMESTAMP | DEFAULT NOW() | Fecha de creación |

---

## 3. Enumeraciones

```sql
-- Tipo de trabajo
CREATE TYPE tipo_trabajo AS ENUM ('correctivo', 'preventivo', 'instalacion', 'visita_tecnica');

-- Prioridad
CREATE TYPE prioridad AS ENUM ('baja', 'media', 'alta', 'urgente');

-- Estado de tarea
CREATE TYPE estado_tarea AS ENUM ('pendiente', 'en_proceso', 'finalizado', 'no_cumplido', 'reprogramado');

-- Estado del informe
CREATE TYPE estado_informe AS ENUM ('pendiente', 'enviado', 'aprobado', 'rechazado');

-- Acción en historial
CREATE TYPE accion_historial AS ENUM ('creado', 'asignado', 'iniciado', 'finalizado', 'reprogramado', 'no_cumplido', 'actualizado');
```

---

## 4. Índices Recomendados

```sql
-- Índices para optimización de consultas
CREATE INDEX idx_tareas_estado ON tareas(estado);
CREATE INDEX idx_tareas_fecha_programada ON tareas(fecha_programada);
CREATE INDEX idx_tareas_id_tecnico ON tareas(id_tecnico);
CREATE INDEX idx_tareas_id_cliente ON tareas(id_cliente);
CREATE INDEX idx_registro_horas_fecha ON registro_horas(fecha);
CREATE INDEX idx_registro_horas_tecnico ON registro_horas(id_tecnico);
CREATE INDEX idx_historial_tarea ON historial_tareas(id_tarea);
```

---

## 5. Relaciones y Constraints

```sql
-- Foreign Keys
ALTER TABLE locales ADD CONSTRAINT fk_locales_cliente 
    FOREIGN KEY (id_cliente) REFERENCES clientes(id);

ALTER TABLE tareas ADD CONSTRAINT fk_tareas_cliente 
    FOREIGN KEY (id_cliente) REFERENCES clientes(id);

ALTER TABLE tareas ADD CONSTRAINT fk_tareas_local 
    FOREIGN KEY (id_local) REFERENCES locales(id);

ALTER TABLE tareas ADD CONSTRAINT fk_tareas_tecnico 
    FOREIGN KEY (id_tecnico) REFERENCES tecnicos(id);

ALTER TABLE historial_tareas ADD CONSTRAINT fk_historial_tarea 
    FOREIGN KEY (id_tarea) REFERENCES tareas(id);

ALTER TABLE registro_horas ADD CONSTRAINT fk_horas_tarea 
    FOREIGN KEY (id_tarea) REFERENCES tareas(id);

ALTER TABLE registro_horas ADD CONSTRAINT fk_horas_tecnico 
    FOREIGN KEY (id_tecnico) REFERENCES tecnicos(id);
```

---

## 7. Entidades Adicionales (v3.0)

El modelo actual incluye más entidades que las definidas arriba. Ver `schema.prisma` completo para referencia.

---

## 8. Modelo de Datos Real (Schema.prisma)

> El archivo `backend/prisma/schema.prisma` contiene el modelo completo con 30+ entidades. A continuación una referencia de las entidades principales basadas en el schema real:

### Entidades Principales (Schema.prisma)

| Entidad | Descripción |
|---------|-------------|
| Cliente | Datos de clientes (empresas/personas) |
| Local | Locales técnicos asociados a clientes |
| Tecnico | Técnicos del sistema |
| Usuario | Usuarios para autenticación (relación 1:1 con Técnico) |
| Orden | **Entidad central** - Órdenes de trabajo |
| Asignacion | Asignación de técnicos a órdenes |
| RegistroDiario | Seguimiento diario por técnico |
| HoraTecnico | Resumen de horas por técnico |
| Factura | Control de facturación |
| InformeTecnico | Informes técnicos con evidencias |
| Representante | Contactos de clientes |
| Tarea | Entidad legacy |
| HistorialTarea | Historial de cambios en tareas |
| RegistroHoras | Horas registradas en tareas legacy |
| RegistroEvento | Bitácora de eventos/actividades |
| Jornada | Control de jornadas laborales |
| RegistroJornada | Registro grupal de jornadas |
| TecnicoJornada | Técnicos en registro grupal |
| SegmentoTrabajo | Segmentos de trabajo en jornadas |
| ComidaJornada | Comidas durante jornadas |
| Ausencia | Gestión de ausencias |
| Inventario | Inventario unificado de equipos |

### Estados de las Entidades (Enums)

**Orden.estado:**
```
pendiente → asignada → en_proceso → completada → facturada
     ↓                                    ↓
no_cumplida ←───────────────────── reprogramada
```

**Orden.estado_facturacion:**
```
no_iniciada → planificada → en_proceso → finalizada → pagada
```

**Orden.estado_informe:**
```
pendiente → enviado → aprobado → rechazado
```

**RegistroDiario.estado_dia:**
```
pendiente, en_proceso, completado, no_cumplido, reprogramado, dia_libre, certificacion
```

**Ausencia.tipo:**
```
dia_libre, permiso_medico, vacacion, feriado, compensatorio
```

**Ausencia.estado:**
```
pendiente, aprobado, rechazado
```

**Jornada.estado:**
```
pendiente, abierta, cerrada, observacion
```

### Relaciones Principales

```
Cliente 1──M Local
Cliente 1──M Orden
Cliente 1──M Representante
Local 1──M Orden
Tecnico 1──M Asignacion
Tecnico 1──M RegistroDiario
Tecnico 1──M HoraTecnico
Tecnico 1──M Ausencia
Tecnico 1──M Jornada
Orden 1──M Asignacion
Orden 1──M RegistroDiario
Orden 1──M HoraTecnico
Orden 1──1 Factura
Orden 1──M InformeTecnico
Asignacion 1──M RegistroDiario
```

### Índices Definidos en Schema

```prisma
// Orden
@@index([estado])
@@index([fecha_programada])
@@index([id_cliente])
@@index([id_local])
@@index([estado_facturacion])
@@index([prioridad])
@@index([fecha_creacion])

// Local
@@index([id_cliente])

// Asignacion
@@index([id_orden])
@@index([id_tecnico])
@@index([fecha_asignacion])

// RegistroDiario
@@index([fecha])
@@index([id_tecnico])
@@index([id_orden])
@@index([id_asignacion])
@@index([estado_dia])
@@index([es_dia_libre])
@@index([es_fin_semana])

// HoraTecnico
@@index([fecha])
@@index([id_tecnico])

// Factura
@@index([estado])
@@index([id_orden])
@@index([fecha_emision])
@@index([fecha_vencimiento])
@@index([fecha_pago])

// InformeTecnico
@@index([id_orden])
@@index([id_tecnico])
@@index([estado])

// Inventario
@@index([id_externo])
@@index([tipo_local])
@@index([nombre_local])
@@index([cliente])
@@index([provincia])
@@index([ciudad])
@@index([tipo_sistema])
@@index([categoria])
@@index([estado_operativo])

// Unique
@@unique([id_externo, tipo_sistema, categoria]) // Inventario
```

---

## 9. Notas de Implementación

### PostgreSQL vs SQLite
- El schema está configurado para PostgreSQL (producción)
- Para desarrollo SQLite: cambiar provider y url en `schema.prisma`

### Timestamps
- Todas las entidades incluyen `createdAt` y `updatedAt`
- Manejados automáticamente por Prisma

### Tipos de Datos Especiales
- **detalle (Inventario)**: Campo JSONB para datos flexibles
- **fotos (InformeTecnico)**: Almacenado como JSON string

---

*Documento actualizado: Abril 2026 - v3.0*
*Referencia: backend/prisma/schema.prisma*