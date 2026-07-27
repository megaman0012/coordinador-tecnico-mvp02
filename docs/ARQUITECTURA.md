# Arquitectura del Sistema - MVP Coordinador Técnico v3.3

## 1. Stack Tecnológico

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

### Frontend
| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | React | ^19.2.4 |
| Lenguaje | TypeScript | ^4.9.5 |
| UI Library | Tailwind CSS | ^3.4.1 |
| Gráficos | Recharts | ^3.8.1 |
| HTTP Client | Axios | ^1.13.6 |
| Router | React Router DOM | ^7.13.2 |
| Excel Export | xlsx | ^0.18.5 |
| Word Export | docx | ^9.6.1 |
| File Saver | file-saver | ^2.0.5 |
| Icons | Lucide React | ^1.7.0 |

### Infraestructura
- **Despliegue**: Docker (preparado)
- **API**: RESTful con Swagger

---

## 2. Estructura de Carpetas

```
coordinador-tecnico-mvp/
├── backend/
│   ├── src/
│   │   ├── config/          (Configuraciones)
│   │   ├── controllers/     (Lógica de negocio - 16 archivos)
│   │   ├── routes/         (Endpoints API - 17 archivos)
│   │   ├── services/       (Servicios auxiliares)
│   │   ├── middleware/     (Auth, manejo de errores)
│   │   ├── repositories/   (Patrón Repository)
│   │   ├── utils/          (Utilidades, logger)
│   │   ├── db.js          (Conexión Prisma)
│   │   ├── index.js       (Punto de entrada Express)
│   │   └── swagger.js     (Configuración Swagger)
│   ├── prisma/
│   │   ├── schema.prisma  (Modelo de datos - 30+ entidades)
│   │   ├── seed.js        (Datos iniciales)
│   │   └── dev.db         (SQLite desarrollo)
│   ├── .env               (Variables de entorno)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/    (Layout.tsx, componentes UI)
│   │   ├── pages/         (10 páginas: Dashboard, Ordenes, etc.)
│   │   ├── context/       (AuthContext.tsx)
│   │   ├── services/      (api.ts - Axios con JWT)
│   │   ├── types/         (Interfaces TypeScript)
│   │   └── utils/         (generarWord.ts)
│   ├── public/
│   ├── package.json
│   └── tailwind.config.js
│
├── docs/
│   ├── ARQUITECTURA.md
│   ├── DOCUMENTACION_TECNICA.md
│   └── MODELO_BASE_DATOS.md
│
└── package.json          (Scripts globales)
```

---

## 3. Flujo de Procesos

### 3.1 Gestión de Órdenes

```
CREAR ORDEN → ASIGNAR TÉCNICO → SEGUIMIENTO → COMPLETAR → FACTURAR
     ↓            ↓               ↓            ↓           ↓
  [Pendiente]  [Asignada]    [En Proceso] [Completada] [Facturada]
                                              ↓
                                    [NO CUMPLIDA] → REPROGRAMAR
                                         ↓
                                   [Reprogramada]
```

### 3.2 Control de Horas

```
INICIO JORNADA → REGISTRO ACTIVIDADES → VALIDACIÓN → REPORTE DIARIO
      ↓                 ↓                  ↓              ↓
  [Hora entrada]    [Eventos]        [8h normales]   [Resumen]
                                          ↓
                                   [Horas extras]
                                          ↓
                              [Fin de semana]
```

### 3.3 Facturación

```
ÓRDENES COMPLETADAS → FILTRO FACTURABLE → VALIDAR INFORME → GENERAR FACTURA
        ↓                   ↓                   ↓                ↓
     [Todas]            [Facturable]      [Con informe]    [Pendiente]
                                                       ↓
                                              [Pagada]
```

---

## 4. Componentes Principales

### 4.1 Módulo de Órdenes
- CRUD completo de órdenes de trabajo
- Asignación múltiple de técnicos
- Workflow de estados completo
- Control de facturación
- Registro de informe técnico

### 4.2 Módulo de Asignaciones
- Asignación de técnicos a órdenes
- Programación por fecha
- Reprogramación con motivo
- Seguimiento por día (RegistroDiario)

### 4.3 Módulo de Técnicos
- CRUD de técnicos
- Control de jornada (hora entrada/salida)
- Registro de horas trabajadas
- Gestión de ausencias

### 4.4 Módulo de Control de Horas
- Registro automático por orden/tarea
- Cálculo de horas extras
- Detección de fines de semana
- Reportes (diario/semanal/mensual)

### 4.5 Módulo de Facturación
- Identificación de órdenes facturables
- Workflow: no_iniciada → planificada → en_proceso → finalizada → pagada
- Control de número de factura

### 4.6 Módulo de Informes Técnicos
- Creación de informes por técnico
- Evidencias: fotos, firma cliente
- Workflow: pendiente → enviado → aprobado → rechazado
- Validación requerida para facturación

### 4.7 Módulo de Inventario
- Inventario unificado de equipos por local
- Categorías: cámaras, NVR, sensores, etc.
- Estados operativos: OPERATIVO, CERRADO
- Tipos de monitoreo: VISUAL 24/7, BAJO ALERTAS

### 4.8 Dashboard
- KPIs principales: órdenes, técnicos, horas, facturación
- Gráficos de estado con Recharts
- Historial de asignaciones

---

## 5. Patrones y Convenciones

### 5.1 Patrón MVC en Backend
- **Routes**: Definición de endpoints
- **Controllers**: Lógica de negocio
- **Services**: Lógica reutilizable
- **Repositories**: Acceso a datos (Prisma)

### 5.2 Autenticación JWT
- Token en header `Authorization: Bearer <token>`
- Middleware de verificación en rutas protegidas
- Roles: admin, coordinador, tecnico

### 5.3 Protección de Rutas (Frontend)
- ProtectedRoute component
- Validación de rol en rutas
- Redirect automático a login

---

## 6. Puertos de Comunicación

| Servicio | Puerto | URL |
|----------|--------|-----|
| Backend API | 3002 | http://localhost:3002 |
| Frontend | 3000/3001 | http://localhost:3000 |
| Swagger UI | 3002 | http://localhost:3002/api-docs |
| PostgreSQL | 5432 | localhost:5432 |

---

## 7. Scripts de Ejecución

### Backend
```bash
cd backend
npm start          # Production
npm run dev        # Development (nodemon)
npm run db:push    # Sincronizar schema
npm run db:seed    # Poblar datos
```

### Frontend
```bash
cd frontend
npm start          # Development
npm run build     # Production build
```

---

*Documento actualizado: Abril 2026 - v3.0*