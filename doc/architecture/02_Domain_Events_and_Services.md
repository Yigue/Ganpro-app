# Domain Events y Application Services (Event Bus Local)

El problema de llamar directamente a los repositorios desde la UI (ej. `animalRepo.update()`) es que la lógica de negocio se fragmenta. En GanPro V3, utilizaremos **Application Services** que ejecutarán *Comandos*, actualizarán el estado en la base de datos (SQLite) y publicarán **Domain Events** a un Event Bus local.

## 🚌 Arquitectura del Bus de Eventos Local

Dado que React Native/WatermelonDB corren en el cliente, el "Event Bus" es un despachador síncrono/asíncrono en memoria (usando RxJS o un EventEmitter simple) que orquesta las transacciones secundarias.

### Flujo Típico:
`UI (Boton)` -> `SanidadService.aplicarTratamiento(cmd)` -> `Tratamiento Registrado (DB)` -> `Bus.publish(AnimalVaccinatedEvent)` -> `InventoryListener descuenta stock` & `AnalyticsListener actualiza gasto`.

---

## 🛠️ Catálogo de Application Services y Eventos

### 1. `AnimalMovementService` (Contexto: Inventario)
Se encarga de rotaciones, altas y bajas.

- **Comando:** `TransferAnimalsCommand(animalIds, potreroDestinoId)`
  - **Lógica:** Valida que el potrero destino exista.
  - **Evento Emitido:** `AnimalMovedEvent`
  - **Listeners:**
    - `PotreroAnalyticsListener` (Recalcula carga animal de potrero origen y destino).
    - `BiomassValidatorListener` (Lanza warning si la carga excede la biomasa).

- **Comando:** `DeclareAnimalDeathCommand(animalId, causa)`
  - **Lógica:** Actualiza estado a `MUERTO` y crea `death_log`.
  - **Evento Emitido:** `AnimalDiedEvent`
  - **Listeners:**
    - `ReproductionArchiverListener` (Si era vaca, cancela y archiva sus ciclos IATF o preñez activos).
    - `FinancialLossListener` (Registra la pérdida económica al precio de mercado actual).

### 2. `SanitaryOperationService` (Contexto: Sanidad)
Maneja las aplicaciones de medicamentos.

- **Comando:** `ApplyTreatmentCommand(animalIds, treatmentId, dosis)`
  - **Evento Emitido:** `TreatmentAppliedEvent`
  - **Listeners:**
    - `VademecumStockListener` (Genera un `inventory_movement` de tipo EGRESO para restar las botellas usadas).
    - `FinancialCostListener` (Calcula el costo de las dosis y lo carga al centro de costos del lote).
    - `LegalLockListener` (Si el tratamiento tiene carencia, programa un bloqueo lógico de venta hasta la fecha estipulada).

### 3. `ReproductionService` (Contexto: Reproducción)
Maneja el estado reproductivo (La Máquina de Estados).

- **Comando:** `RegisterPregnancyDiagnosisCommand(animalId, resultado)`
  - **Lógica:** Si resultado es PREÑADA, cambia el `repro_status` a PREÑADA.
  - **Evento Emitido:** `PregnancyConfirmedEvent` o `PregnancyFailedEvent`
  - **Listeners:**
    - `DashboardAnalyticsListener` (Actualiza el KPI de "% de Preñez" en la tabla materializada).

### 4. `WorkflowEngineService` (Contexto: Reproducción - IATF)
Para gestionar protocolos de múltiples pasos en el tiempo.

- **Comando:** `StartIatfProtocolCommand(loteId, protocolId, startDate)`
  - **Lógica:** Lee el JSON del protocolo y genera N registros en la tabla `scheduled_operations`.
  - **Evento Emitido:** `IatfProtocolStartedEvent`
  - **Listeners:**
    - `NotificationSchedulerListener` (Programa notificaciones push locales en el dispositivo para los días D8, D10, etc.).

---

## 📈 Tablas de Snapshots (Aggregated Read Models)

Para que el Dashboard no colapse, los Listeners anteriores deben actualizar tablas específicas orientadas solo a la lectura (CQRS básico).

- **`dashboard_kpis_snapshot`**:
  - Un solo registro (o uno por mes) actualizado iterativamente.
  - Campos: `total_cabezas`, `porcentaje_preñez_global`, `porcentaje_mortalidad_global`, `costo_por_kg_producido`.
- **`potrero_snapshots`**:
  - Campos: `potrero_id`, `carga_animal_actual`, `gasto_acumulado_mes`.

*Regla:* El Dashboard **solo lee** de estas tablas. La carga computacional pesada ocurre en fragmentos de milisegundos cuando suceden los eventos, no cuando el dueño abre la app.
