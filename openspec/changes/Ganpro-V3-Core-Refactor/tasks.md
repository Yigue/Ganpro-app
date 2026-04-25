# Plan de Implementación: Ganpro-V3-Core-Refactor

Este documento contiene el desglose estructurado de tareas (Task Breakdown) para la refactorización arquitectónica de GanPro hacia un ERP Offline-First basado en Domain-Driven Design (DDD).

## 🏗️ Fase 1: Fundaciones de Base de Datos y Modelos V3
El objetivo de esta fase es adecuar WatermelonDB a los requerimientos del `DATABASE_SCHEMA.md` V3.

- [ ] **1.1 Actualizar Schema Principal (`schema.ts`):**
  - Agregar tabla `establecimientos`.
  - Agregar tabla `scheduled_operations`.
  - Agregar tabla `batch_cc_audits`.
  - Modificar `animals`, `lotes`, `potreros` para incluir `establecimiento_id`.
  - Modificar `operation_logs` (agregar `tipo_operacion`).
  - Modificar `movimientos_financieros` (agregar `moneda`, `tipo_cambio`, `category_id`).
  - Modificar `raciones` (agregar `costo_estimado_kg`, `moneda`).
- [ ] **1.2 Crear/Actualizar Modelos de WatermelonDB:**
  - Crear `EstablecimientoModel.ts`, `ScheduledOperationModel.ts`, `BatchCcAuditModel.ts`.
  - Actualizar decoradores (`@field`, `@relation`, `@children`) en los modelos existentes.
- [ ] **1.3 Incrementar versión y generar migración:**
  - Crear archivo de migración para evitar romper las instalaciones existentes.

## 🚌 Fase 2: Application Services y Event Bus
El objetivo de esta fase es sacar la lógica de negocio de los componentes React y crear la capa de servicios.

- [ ] **2.1 Implementar Event Bus Local:**
  - Crear clase singleton `DomainEventBus` (basado en RxJS o EventEmitter).
- [ ] **2.2 Crear `AnimalMovementService.ts`:**
  - Implementar comando `transferAnimals` (movimiento de lotes/potreros).
  - Implementar comando `declareDeath` (crea log de muerte obligatorio).
- [ ] **2.3 Crear `SanitaryOperationService.ts`:**
  - Implementar comando `applyTreatment` (impacta `operation_logs` y alerta carencia).
  - Escuchar eventos para descontar stock farmacológico.
- [ ] **2.4 Crear `ReproductionService.ts`:**
  - Implementar comando `registerTacto` (máquina de estados `repro_status`).
- [ ] **2.5 Crear `DashboardAnalyticsService.ts` (Read Models):**
  - Implementar *Listeners* que escuchen los eventos anteriores para pre-calcular GDP y porcentajes de preñez/mortalidad en background.

## 🖥️ Fase 3: Refactorización Crítica de Interfaz (Módulo Inventario y Manga)
Conectar la UI existente a los nuevos servicios y eliminar deuda técnica grave.

- [ ] **3.1 Arreglar Crash en `InventoryScreen`:**
  - Implementar la función `handleAction` faltante en los Bottom Sheets.
  - Eliminar los mocks matemáticos (`getStableWeight`) y conectar al campo `last_weight_kg`.
- [ ] **3.2 Refactorizar Manga de Escaneo (Batching):**
  - Reemplazar todas las inserciones múltiples (`Promise.all`) por `database.batch()`.
  - Eliminar el uso del repositorio viejo (`EventoRepository`) y apuntar los botones de acción rápida a los Application Services.
- [ ] **3.3 Bloqueos Legales en UI:**
  - Deshabilitar el botón "Vender" y mostrar Badge rojo en animales con carencia activa.

## 📊 Fase 4: Refactorización del Dashboard y Finanzas
- [ ] **4.1 Dashboard Operativo:**
  - Refactorizar las KPIs para leer desde las tablas de proyecciones precalculadas (Aggregated Read Models) en lugar de mapear toda la base de datos en memoria.
- [ ] **4.2 Dashboard Financiero:**
  - Conectar los selectores de moneda.
  - Generar el gráfico real cruzando `movimientos_financieros` usando queries SQL crudos (agregación en SQLite).

---
**Estado:** PENDIENTE
**Siguiente Paso Recomendado:** Iniciar ejecución de la **Fase 1 (Fundaciones de BD)**.
