# Documentación Técnica - Sistema Coordinador Técnico MVP v3.3

## 1. Introducción y Visión General

### 1.1 Descripción del Sistema
Sistema de gestión integral para la coordinación de técnicos y órdenes de trabajo. Permite gestionar clientes, locales técnicos, asignación de órdenes, control de horas, facturación, informes técnicos e inventario de equipos.

### 1.2 Objetivos del Proyecto
- Centralizar la gestión de órdenes de trabajo
- Controlar asignación y seguimiento de técnicos
- Registrar horas trabajadas automáticamente
- Gestionar facturación de servicios
- Generar informes técnicos con validación
- Administrar inventario de equipos por local

### 1.3 Alcance del MVP
- ✅ Gestión completa de órdenes de trabajo
- ✅ Control de técnicos y asignaciones
- ✅ Registro diario de actividades
- ✅ Workflow de facturación
- ✅ Informes técnicos con evidencia
- ✅ Dashboard con KPIs
- ✅ Inventario de equipos

---

## 2. Stack Tecnológico

### Backend
| Componente | Tecnología | Versión |
|------------|------------|---------|
| Runtime | Node.js | 18+ |
| Framework | Express.js | ^4.18.2 |
| ORM | Prisma | ^5.10.0 |
| Base de datos | PostgreSQL (producción) / SQLite (desarrollo) | - |
| Autenticación | JWT | ^9.0.2 |
| Validación | express-validator | ^7.0.1 |
| Documentación | Swagger | ^5.0.1 |
| Logging | Winston | ^3.19.0 |
| Excel | xlsx, exceljs | ^0.18.5, ^4.4.0 |
| Encriptación | bcryptjs | ^2.4.3 |
| CORS | cors | ^2.8.5 |

### Frontend
| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | React | ^19.2.4 |
| Lenguaje | TypeScript | ^4.9.5 |
| Estilos | Tailwind CSS | ^3.4.1 |
| Gráficos | Recharts | ^3.8.1 |
| HTTP Client | Axios | ^1.13.6 |
| Router | React Router DOM | ^7.13.2 |
| Excel Export | xlsx | ^0.18.5 |
| Word Export | docx | ^9.6.1 |
| File Saver | file-saver | ^2.0.5 |
| Icons | Lucide React | ^1.7.0 |

### Puertos de Comunicación
- **Backend API**: http://localhost:3002
- **Frontend**: http://localhost:3000 (o 3001)
- **Swagger UI**: http://localhost:3002/api-docs

---

## 3. Arquitectura del Sistema

### 3.1 Estructura de Carpetas
```
coordinador-tecnico-mvp/
├── backend/
│   ├── src/
│   │   ├── config/           (Configuraciones globales)
│   │   ├── controllers/      (Lógica de negocio - 16 archivos)
│   │   ├── routes/           (Endpoints API - 17 archivos)
│   │   ├── services/         (Servicios adicionales)
│   │   ├── middleware/       (Auth, manejo errores)
│   │   ├── repositories/    (Patrón Repository)
│   │   ├── utils/            (Logger, utilerías)
│   │   ├── db.js            (Conexión Prisma)
│   │   ├── index.js         (Punto de entrada Express)
│   │   └── swagger.js       (Configuración Swagger)
│   ├── prisma/
│   │   ├── schema.prisma    (Modelo de datos - 30+ entidades)
│   │   ├── seed.js         (Datos iniciales)
│   │   └── dev.db          (SQLite desarrollo)
│   ├── .env                 (Variables de entorno)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/       (Layout.tsx)
│   │   ├── pages/           (10 páginas principales)
│   │   ├── context/         (AuthContext.tsx)
│   │   ├── services/        (api.ts - Axios)
│   │   ├── types/           (TypeScript interfaces)
│   │   └── utils/           (generarWord.ts)
│   └── package.json
│
└── docs/
```

---

## 4. Modelo de Datos (30+ Entidades)

### 4.1 Entidades Principales

**Cliente**
- id, nombre, ruc (único), telefono, email, direccion, tipo (empresa/persona), estado, timestamps

**Local**
- id, id_cliente (FK), nombre, direccion, ciudad, provincia, tipo, tipo_servicio, fecha_implementacion, estado, timestamps

**Tecnico**
- id, nombre, cedula (único), telefono, email, especialidad, jornada_horaria (default 8), hora_entrada (default 08:00), hora_salida (default 17:00), estado, timestamps

**Usuario**
- id, username (único), password (encriptada), rol (admin/coordinador/tecnico), id_tecnico (FK única), estado, timestamps

**Orden** (Entidad Central)
- id, numero_orden (único - formato ORD-2026-0001), id_cliente, id_local, tipo_trabajo, prioridad, descripcion, estado, fecha_resolucion, resolucion, fecha_creacion, fecha_programada, hora_programada, cantidad_tecnicos, horas_estimadas, fecha_inicio, fecha_fin, facturable, estado_facturacion, numero_factura, informe_adjunto, estado_informe, timestamps

**Representante**
- id, id_cliente (FK), nombre, telefono, email, cargo, principal, estado, timestamps

### 4.2 Entidades de Asignación y Seguimiento

**Asignacion**
- id, id_orden (FK), id_tecnico (FK), fecha_asignacion, hora_inicio_programada, hora_fin_programada, estado, motivo_reprogramacion, fecha_asignacion_real, timestamps

**RegistroDiario**
- id, id_asignacion, id_orden, id_tecnico, fecha, estado_dia, hora_llegada, hora_salida, hora_inicio_trabajo, hora_fin_trabajo, pausas (desayuno/almuerzo/cena), horas_normales, horas_extras, horas_viaje, horas_almuerzo, es_dia_libre, es_fin_semana, tiene_certificacion, observaciones, timestamps

**HoraTecnico**
- id, id_tecnico, id_orden, fecha, hora_inicio, hora_fin, horas_trabajadas, tipo (normal/extra), es_fin_semana, observaciones, timestamps

### 4.3 Entidades de Facturación e Informes

**Factura**
- id, id_orden (único), numero_factura (único), estado (workflow), fecha_emision, fecha_vencimiento, fecha_pago, monto, monto_pagado, observaciones, timestamps

**InformeTecnico**
- id, id_orden, id_tecnico, id_asignacion, descripcion_trabajo, materiales_usados, estado_equipo, recomendaciones, proximo_mantenimiento, firma_cliente, nombre_cliente, cedula_cliente, fotos (JSON), estado, fecha_informe, timestamps

### 4.4 Entidades de Control de Jornada

**RegistroEvento**
- id, id_tecnico, fecha_hora, tipo_evento, descripcion, foto_url, jornada_id, estado, observaciones_coordinador, timestamps

**Jornada**
- id, id_tecnico, fecha, hora_inicio, hora_fin, jornada_continua_id, estado, total_horas, horas_trabajo, horas_extras, total_pausas, observaciones, timestamps

**RegistroJornada**
- id, fecha, hora_entrada, hora_salida, observaciones, estado, timestamps

**TecnicoJornada**
- id, id_registro, id_tecnico, hora_llegada, hora_salida, observaciones

**SegmentoTrabajo**
- id, id_registro, id_orden, descripcion, hora_inicio, hora_fin, tipo (normal/extra), timestamps

**ComidaJornada**
- id, id_registro, tipo (desayuno/almuerzo/cena), hora_inicio, hora_fin

**Ausencia**
- id, id_tecnico, tipo (dia_libre/permiso_medico/vacacion/feriado/compensatorio), fecha_inicio, fecha_fin, descripcion, foto_url, estado, observaciones, timestamps

### 4.5 Entidades de Historial y Auditoría

**HistorialOrden**
- id, id_orden, accion, estado_anterior, estado_nuevo, motivo, fecha_cambio, usuario, timestamps

**Tarea** (Legacy)
- id, id_cliente, id_local, id_tecnico, tipo_trabajo, prioridad, estado, descripcion, fechas, facturable, informe_adjunto, estado_informe, observaciones, timestamps

**HistorialTarea**
- id, id_tarea, accion, estado_anterior, estado_nuevo, motivo, fecha_cambio, usuario, timestamps

**RegistroHoras** (para Tareas legacy)
- id, id_tarea, id_tecnico, fecha, hora_inicio, hora_fin, horas_trabajadas, es_viaje, es_fin_semana, es_hora_extra, observaciones, timestamps

### 4.6 Entidades de Inventario

**Inventario**
- id, id_externo, tipo_local, nombre_local, cliente, provincia, ciudad, tipo_monitoreo, estado_operativo, fecha_implementacion, fecha_cierre, observacion, direccion, gps, horario_apertura, horario_cierre, ip_1, ip_2, ip_3, contacto, correo, tipo_sistema, categoria, cantidad, marca, detalle (JSON), timestamps

---

## 5. Endpoints API (17 Módulos)

| Endpoint | Descripción |
|----------|-------------|
| /api/auth | Autenticación (login, register, test) |
| /api/clientes | CRUD Clientes |
| /api/locales | CRUD Locales |
| /api/tecnicos | CRUD Técnicos |
| /api/ordenes | CRUD Órdenes |
| /api/asignaciones | Gestión Asignaciones |
| /api/registros-diarios | Registro Diario |
| /api/horas | Control de Horas |
| /api/facturas | Gestión Facturación |
| /api/dashboard | KPIs y estadísticas |
| /api/tareas | CRUD Tareas (legacy) |
| /api/informes | Informes Técnicos |
| /api/usuarios | Gestión Usuarios |
| /api/representantes | CRUD Representantes |
| /api/actividades | Registro Actividades (RegistroEvento) |
| /api/ausencias | Gestión Ausencias |
| /api/inventario | Inventario de Equipos |
| /api/archivos | Upload de archivos (imágenes, PDF, DOC) |

**Rutas Especiales:**
- `/api-docs` → Swagger UI
- `/api-docs.json` → especificación OpenAPI
- `/api/health` → Health check
- `/api/test` → Endpoint de prueba (GET y POST)

---

## 6. Frontend - Componentes y Rutas

### 6.1 Páginas (Routes)
| Ruta | Protección | Descripción |
|------|------------|-------------|
| /login | Público | Login de usuario |
| / | Protected | Dashboard principal |
| /ordenes | Admin/Coordinador | Gestión Órdenes |
| /asignaciones | Protected | Asignaciones |
| /horas | Protected | Control de Horas |
| /tecnicos | Admin/Coordinador | Gestión Técnicos |
| /facturas | Admin/Coordinador | Facturación |
| /configuracion | Admin/Coordinador | Configuración |
| /informes | Admin/Coordinador | Informes Técnicos |
| /inventario | Admin/Coordinador | Inventario Equipos |

### 6.2 Componentes Principales
- **Layout**: Layout principal con sidebar y header
- **AuthContext**: Proveedor de autenticación global
- **ProtectedRoute**: Componente de protección de rutas por rol

### 6.3 Servicios
- **api.ts**: Cliente Axios con interceptors para JWT
- **generarWord.ts**: Utilidad para generar documentos Word

---

## 7. Workflows del Sistema

### 7.1 Flujo de Órdenes
```
pendiente → asignada → en_proceso → completada → facturada
     ↓                                    ↓
no_cumplida ←───────────────────── reprogramada
```

### 7.2 Workflow de Facturación
```
no_iniciada → planificada → en_proceso → finalizada → pagada
```

### 7.3 Workflow de Informes
```
pendiente → enviado → aprobado → rechazado
```

### 7.4 Estados de Día (Registro Diario)
```
pendiente, en_proceso, completado, no_cumplido, reprogramado, dia_libre, certificacion
```

### 7.5 Estados de Ausencia
```
pendiente, aprobado, rechazado
```

### 7.6 Estados de Jornada
```
pendiente, abierta, cerrada, observacion
```

---

## 8. Seguridad

### 8.1 Autenticación
- JWT (JSON Web Token) en headers Authorization
- Password encriptadas con bcryptjs
- Tokens con expiración configurable

### 8.2 Roles y Permisos
| Rol | Acceso |
|-----|--------|
| admin | Acceso total al sistema |
| coordinador | Gestión de órdenes, técnicos, clientes, facturación, informes, inventario |
| tecnico | Ver asignaciones, registrar horas, crear informes |

### 8.3 Middleware
- **auth.middleware.js**: Verifica token JWT y extrae usuario

### 8.4 CORS
- Habilitado para cualquier origen (`origin: true`)

---

## 9. Scripts Disponibles

### Backend
```bash
npm start          # Iniciar servidor (production)
npm run dev        # Iniciar con nodemon (development)
npm run db:generate # Generar cliente Prisma
npm run db:push    # Sincronizar schema con DB
npm run db:seed    # Poblar datos iniciales
```

### Frontend
```bash
npm start          # Iniciar React (puerto 3001)
npm run build      # Build production
npm test          # Ejecutar tests
```

---

## 10. Características Destacadas

- **Swagger**: Documentación interactiva en /api-docs
- **CORS habilitado**: Permite conexiones desde cualquier origen
- **Logging**: Todos los requests se registran (Winston)
- **Validación**: express-validator en todos los endpoints
- **Historial**: Auditoría completa de cambios en órdenes y tareas
- **Multi-jornada**: Soporte para jornadas que cruzan medianoche
- **Certificaciones**: Soporte para certificados médicos y ausencias
- **Exportación Word**: Generación de documentos Word para informes
- **Exportación Excel**: Exportar órdenes filtradas a archivo .xlsx
- **Dashboard**: KPIs en tiempo real con gráficos Recharts
- **Filtro por fecha de asignación**: Historial de asignaciones filtra por fecha_asignacion
- **Inventario unificado**: Sistema centralizado de inventario técnico por local
- **Firma digital**: Soporte para firma de clientes en informes técnicos
- **Fotos en informes**: Almacenamiento de fotos como JSON en informes
- **Archivos adjuntos**: Soporte para subir imágenes/PDF/DOC a órdenes y facturas

---

## 11. Variables de Entorno (.env)

```bash
# Backend
DATABASE_URL="postgresql://user:password@host:port/database"
PORT=3002
JWT_SECRET=your_jwt_secret
```

---

## 12. Producción vs Desarrollo

### Desarrollo
- Base de datos: SQLite (dev.db)
- Puerto Frontend: 3000/3001

### Producción
- Base de datos: PostgreSQL
- Puerto Backend: 3002

---

*Documentación actualizada para MVP v3.3 - Coordinador Técnico*
*Fecha: Abril 2026*

---

## 13. Changelog

### v3.3 (Abril 2026)
#### Nuevas Funcionalidades
- ✅ Archivos adjuntos en órdenes: Input file para subir imágenes, PDFs, DOC a órdenes de trabajo
- ✅ Archivos adjuntos en facturas: Input file para subir archivos a facturas
- ✅ Controller de upload con multer (soporta hasta 10MB, tipos: jpg, png, gif, pdf, doc, docx)
- ✅ Visualización de archivos adjuntos con links de descarga en tablas

#### Cambios en Modelo de Datos
- ✅ Agregado campo `archivos_adjuntos` (String, JSON array de URLs) en modelo Orden
- ✅ Agregado campo `archivos_adjuntos` (String, JSON array de URLs) en modelo Factura

### v3.2 (Abril 2026)
#### Nuevas Funcionalidades
- ✅ Firma digital touch para celulares (Asignaciones.tsx)
- ✅ Sección de aprobación de ausencias para coordinador/admin
- ✅ Editar/eliminar/agregar fotos en modal de 编辑 informe
- ✅ Plantilla de órdenes con ejemplos descargables
- ✅ generarWord: firma e información del cliente al final del documento

#### Bug Fixes
- ✅ Botón limpiar firma ahora usa ref en lugar de ID
- ✅ Backend now supports admin role para aprobar/rechazar ausencias
- ✅ Mejorado manejo de errores en descarga de plantilla

### v3.4 (Abril 2026)
#### Nuevas Funcionalidades
- ✅ Encabezado de empresa (imagen) agregado al inicio del documento Word al generar informes técnicos
- ✅ Imagen: `frontend/public/encabezado.png` - Membrete DT360 con logo, teléfonos, email y dirección
- ✅ nueva función `getEncabezadoImage()` en `generarWord.ts` para cargar la imagen
- ✅ Imagen insertada antes del título "INFORME TÉCNICO" en el documento Word

### v3.5 (Abril 2026)
#### Mejoras en Facturación
- ✅ Agregada funcionalidad de subir cotización al crear factura (formulario wizard)
- ✅ Opción de descargar cotización adjunta
- ✅ Botón "Nueva Factura" ahora abre formulario limpio (fix: clean state al abrir)
- ✅ Etapa "Validación Cliente": OC ahora es opcional
- ✅ Nuevo campo "Subir Comprobante de Aprobación del Cliente" - permite subir evidencia de aceptación (imagen/documento)
- ✅ Validación: para avanzar desde validacion_cliente debe tener OC O archivo de aprobación
- ✅ Nuevos campos en BD: archivo_cotizacion, archivo_aprobacion

#### Cambios Técnicos
- ✅ Schema Prisma actualizado con nuevos campos
- ✅ Frontend API: createFactura e iniciarFacturacion actualizados
- ✅ Backend controller: crearFactura e iniciarFacturacion actualizados

### v3.1 (Abril 2026)
#### Bug Fixes
- ✅ Actualizada factura legacy de "planificada" a "no_iniciada" para compatibilidad con nuevo workflow
- ✅ Órdenes con informe aprobado ahora se marcan automáticamente como facturables
- ✅ Resumen de facturación ahora incluye estados legacy (planificada → validacion_cliente, en_proceso → aprobada_cliente)
- ✅ Mejorado manejo de errores en frontend (Asignaciones.tsx, Configuracion.tsx, Dashboard.tsx)
- ✅ Errores del backend ahora visibles para el usuario mediante alerts

#### Mejoras
- ✅ Workflow de facturación v3.1: no_iniciada → validacion_cliente → aprobada_cliente → finalizada → pagada

---

## 14. Backups

### 14.1 Backup de Código Fuente (19/08/2026)
**Ubicación:** `/home/server-dt/coordinador-tecnico-mvp/backup_20260819_171916/`

| Contenido | Tamaño | Notas |
|-----------|--------|-------|
| `backend/` | 20 MB | Sin node_modules ni dev.db |
| `frontend/` | 1.6 MB | Sin node_modules ni build |
| `coordinador-backend.service` | - | Configuración systemd backend |
| `coordinador-frontend.service` | - | Configuración systemd frontend |
| `package.json` + `package-lock.json` | - | Dependencias raíz |
| `.gitignore` | - | Archivos ignorados por git |

### 14.2 Backup de Base de Datos (19/08/2026)
**Archivo:** `/home/server-dt/coordinador-tecnico-mvp/backup_20260819_171916/coordinator_db.dump`

| Propiedad | Valor |
|-----------|-------|
| Tamaño | 199 MB |
| Formato | PostgreSQL Custom (Fc) |
| Base de datos | coordinator_db |
| Usuario | coordinator_user |
| Comando restauración | `pg_restore -U coordinator_user -d coordinator_db coordinator_db.dump` |

### 14.3 Procedimiento de Backup
```bash
# 1. Backup de código fuente (excluir node_modules y build)
rsync -av --exclude='node_modules' --exclude='build' --exclude='*.db' \
  /home/server-dt/coordinador-tecnico-mvp/ \
  /home/server-dt/coordinador-tecnico-mvp/backup_<timestamp>/

# 2. Backup de base de datos PostgreSQL
cd /home/server-dt/coordinador-tecnico-mvp/backend
pg_dump -U coordinator_user -d coordinator_db -Fc > \
  /home/server-dt/coordinador-tecnico-mvp/backup_<timestamp>/coordinator_db.dump
```