# Coordinador Técnico MVP

Sistema de gestión para técnicos de campo con registro de horas, asignaciones e informes.

---

## Estructura del Proyecto

```
coordinador-tecnico-mvp/
├── backend/           # API REST (Node.js + Express + Prisma)
├── frontend/          # React + TypeScript + Tailwind CSS
└── docs/            # Documentación técnica
```

---

## Módulos Principales

### 1. Horas (Horas.tsx)
- **Registro individual**: Modal para registrar horas de un técnico (ELIMINADO - código muerto)
- **Registro grupal**: Modal para registrar múltiples técnicos en una jornada
- **Pestañas**:
  - `resumen`: Vista diaria/semanal/mensual de horas trabajadas
  - `ausencias`: Solicitar/revisar ausencias (enfermedad, día libre, etc.)
  - `registros`: Tabla de horas individuales (solo coordinador)

**Estados:**
- `showRegistroGrupal`: Modal de jornada grupal
- `showAusenciaModal`: Modal de ausencias
- `activeTab`: Pestaña activa

**Funciones del modal grupal:**
- Seleccionar múltiples técnicos
- Asignar múltiples órdenes/segmentos
- Registrar pausas (desayuno, almuerzo, cena)
- Horas calculadas automáticamente

---

### 2. Asignaciones (Asignaciones.tsx)
- **Crear**: Asignar órdenes a técnicos con fecha y hora
- **Gestionar**: Cambiar estado (pendiente → asignada → completada)
- **Reprogramar**: Reprogramar asignaciones con motivo
- **Informe**: Generar informe Word con fotos y descripción

**Estados:**
- `asignaciones`: Lista de todas las asignaciones
- `asignacionesFiltradas`: Lista filtrada (por filtros activos)
- `asignacionesAgrupadas`: Agrupadas por orden + fecha

**Filtros disponibles:**
- 🔍 Buscar: por número de orden, técnico o local
- 📌 Estado: pendiente, asignada, completada, reprogramado, no_cumplida
- 👤 Técnico: dropdown
- 📅 Fecha: rango Desde/Hasta

---

### 3. Órdenes (Ordenes.tsx)
- **Crear**: Nueva orden con local, tipo, horas estimadas
- **Estado**: Pendiente / En proceso / Completada
- **Gestionar**: Ver técnicos asignados, progreso

---

### 4. Informes (Informes.tsx)
- **Crear**: Informe técnica con firma, fotos, descripción
- **Exportar**: Generar Word/PDF
- **Historial**: Ver informes anteriores por orden
- **Paginación**: Selector de cantidad (20/50/80), botones navegación («« « » »»), ir a página específica

---

## Base de Datos (PostgreSQL)

### Tablas Principales

| Tabla | Descripción |
|-------|-----------|
| `Usuario` | Usuarios del sistema (técnicos, coordinadores, admins) |
| `Tecnico` | Perfiles de técnicos |
| `Orden` | Órdenes de trabajo |
| `Asignacion` | Relación orden-técnico-fecha |
| `RegistroDiario` | Horas diarias de cada técnico |
| `RegistroJornada` | jornadas grupales |
| `Ausencia` | Solicitudes de ausencia |
| `Informe` | Informes técnicos |
| `Local` | Locales/clientes |

---

## API Endpoints

### Horas
- `GET /api/horas` - 获取 Horas (con filtros fecha, técnico)
- `POST /api/horas` - Crear registro individual
- `POST /api/jornadas-grupo` - Crear jornada grupal
- `DELETE /api/jornadas/:id` - Eliminar jornada

### Asignaciones
- `GET /api/asignaciones` - Lista con relaciones
- `POST /api/asignaciones` - Crear asignación
- `PUT /api/asignaciones/:id` - Actualizar estado
- `POST /api/asignaciones/:id/reprogramar` - Reprogramar
- `POST /api/asignaciones/:id/completar` - Completar con informe

### Órdenes
- `GET /api/ordenes` - Lista
- `POST /api/ordenes` - Crear
- `PUT /api/ordenes/:id` - Actualizar

---

## Variables de Entorno

### Backend (.env)
```
DATABASE_URL="postgresql://user:pass@localhost:5432/db"
JWT_SECRET="secret-key"
PORT=5000
```

### Frontend (.env)
```
REACT_APP_API_URL="http://localhost:5000"
```

---

## Scripts

### Backend
```bash
cd backend
npm install
npx prisma migrate deploy
npm start
```

### Frontend
```bash
cd frontend
npm install
npm start        # Desarrollo
npm run build     # Producción
```

---

## Roles de Usuario

| Rol | Permisos |
|-----|--------|
| `admin` | full access |
| `coordinator` | ver/crear/editar todo |
| `tecnico` | ver sus asignaciones, registrar horas |

---

## Notas Técnicas

### Consolidación (2026-04-20)
- ✅ Eliminado `showModal` muerto en Horas.tsx
- ✅ Eliminado `handleSubmit` y `formData` individuales
- ✅ Pestaña "Registros" consolidada (solo RegistroDiario)
- ✅ Auto-carga de registros al entrar a pestaña

### Filtros (2026-04-21)
- ✅ Filtros en Asignaciones: estado, técnico, fecha, búsqueda
- ✅ useMemo para rendimiento

### Mejoras Órdenes (2026-05-07)
- ✅ Búsqueda rápida por número, cliente o local
- ✅ Ordenamiento por columnas (asc/desc)
- ✅ Ver informes relacionados desde detalle de orden

### Mejoras Filtros (2026-05-07)
- ✅ Filtro por técnico en resúmenes de horas (diario/semanal/mensual)
- ✅ Filtros por rango de fechas en informes
- ✅ Búsqueda avanzada en informes (número orden, local, técnico)

### Mejoras UI/UX (2026-05-07)
- ✅ Dashboard: validar datos para gráficos (mostrar "sin datos" si está vacío)
- ✅ Facturas: búsqueda de órdenes con datalist
- ✅ Informes: mostrar nombre de Local en lugar de Cliente

### Restauración (2026-05-18)
- ✅ Restaurado Informes.tsx y api.ts al backup del 2026-05-06
- ❌ Descartados filtros de búsqueda y fecha en Informes (no funcionaban correctamente)
- ❌ Descartado parámetro id_tecnico en resúmenes de horas

### Paginación Informes (2026-06-29)
- ✅ Selector de cantidad: 20, 50, 80 informes por página
- ✅ Botones navegación: «« (primera), « (anterior), » (siguiente), »» (última)
- ✅ Input para ir a página específica
- ✅ Backend soporta paginación (page, limit, total, totalPages)
- ✅ Interceptor preserva respuesta completa para informes

---

## Dependencias

### Frontend
- React 18
- TypeScript
- Tailwind CSS 3.4.1
- Recharts (gráficos)
- Lucide React (iconos)

### Backend
- Node.js + Express
- Prisma ORM
- PostgreSQL
- JWT auth

---

## Autor

Desarrollado para gestión de técnicos de campo.