# Exploración: Animales Genéricos — Integración End-to-End

> Auditoría del flujo completo de "animales genéricos" tras la primera tanda de implementación
> (proposal/spec/design/tasks ya existían y están marcados como hechos en `tasks.md`).
> Objetivo: validar la integración real con Movimientos, Sanidad, Acciones declaradas
> (Operation Logs / Scheduled Operations) y la conversión Genérico → Identificado.

## Estado actual (Current State)

### 1. Modelo de datos
- **Schema (`src/data/schema/schema.ts`)** — la tabla `animals` ya tiene la columna
  `is_generic` (boolean, indexed, optional). Versión activa: `DATABASE_SCHEMA_VERSION = 11`.
- **Migración (`src/data/schema/migrations.ts`)** — el step `toVersion: 11` agrega
  `is_generic` con `addColumns`. Coherente con el schema. OK.
- **Modelo (`src/data/models/AnimalModel.ts`)** — campo `@field('is_generic') isGeneric!: boolean`
  declarado. OK. Hereda asociaciones existentes a `establecimientos | lotes | potreros | eventos`.

### 2. Creación masiva (Bulk Create)
- **Repo (`AnimalRepository.createBulkGenerics`)** — usa `database.write` + `batch(...prepareCreate)`.
  Genera `idCaravana = "GEN-${timestamp}-${i}"`, `isGeneric = true`, `sexo = 'N/A'`,
  `estado = 'ACTIVO'`, `potreroId = potreroId` (ojo: el parámetro se llama `potreroId`,
  pero el spec original decía `loteId` — el repo migró a "potrero" sin actualizar el spec).
- **UI (`src/features/inventory/ui/BulkCreateModal.tsx`)** — selector de potrero (no de lote),
  cantidad, categoría, peso total opcional. Llama a `createBulkGenerics`. Funciona.
- **Integración inventario (`InventoryScreen.tsx`)** — `BulkCreateModal` abre desde un botón
  en el toolbar (`add-circle-outline`). El `useMemo` `groupedItems` agrupa por `potreroId`
  cuando hay ≥2 genéricos en el mismo potrero, mostrando `GenericGroupCard`. OK.

### 3. Vinculación / "Promoción" Genérico → Identificado
- **Trigger UI (`IndividualModeView.tsx`)** — cuando phase = `not_found`, muestra dos botones:
  "Nuevo Animal" y "Vincular Tropa". El segundo abre `LinkGenericModal`.
- **Modal (`LinkGenericModal.tsx`)** — query: `Q.where('estado','ACTIVO') AND Q.where('is_generic', true)`.
  Lista todos los animales genéricos del SISTEMA, sin filtrar por potrero/lote actual.
- **Repo (`AnimalRepository.linkRfidToGeneric`)** — flujo:
  1. `findByRfid(scannedRfid)` → si existe, lanza error.
  2. `findById(animalId)` → valida `isGeneric`.
  3. `database.write` → `animal.update(a => { a.idCaravana = scannedRfid; a.isGeneric = false; })`.

### 4. Movimientos
- **Servicio (`src/core/services/AnimalMovementService.ts`)** — `transferAnimals(animalIds, potreroDestinoId)`
  hace batch update de `potreroId` solamente. El `AnimalRepository.transferToLote` paralelo
  crea un `evento CAMBIO_LOTE` y actualiza `loteId`. **Dos caminos distintos** según quién
  llame (servicio vs repo).
- **Reactividad inventario** — `InventoryScreen` usa `withObservables` sobre la query
  `Q.where('estado', 'ACTIVO')`, así que ante cambios reactiva la lista correctamente.

### 5. Sanidad
- **Pantalla (`SanidadScreen.tsx`)** — pestañas: Calendario / Vademécum / Historial.
  `seedCategoriasIfEmpty` siembra categorías base.
- **Tratamiento (`TratamientoFormModal.tsx`)** — busca animal por `Q.where('id_caravana', rfid)`,
  llama a `repo.createOperationLog({ animalId, operationId, loteId: animal.potreroId ?? animal.loteId, ... })`.
  Acepta UN animal por vez vía caravana.
- **Protocolo (`ProtocoloFormModal.tsx`)** — selector de "lote" pero está poblado con
  `database.get<PotreroModel>('potreros').query().fetch()`. Mezcla conceptos: el campo
  `loteId` del protocolo termina apuntando a un `potrero.id`. Nada lo valida.
- **Repos (`SanidadRepository`)** — `createOperationLog`, `scheduleOperation`,
  `createProtocolo` con etapas. Notificaciones IATF programadas vía `notificationsService`.
- **Servicio masivo (`SanitaryOperationService.applyTreatment`)** — recibe lista de IDs,
  crea un `operation_logs` por animal con `prepareCreate` + `batch`. NO discrimina entre
  genéricos e identificados.

### 6. Acciones declaradas (Operation Logs / Scheduled Operations)
- **Modelos** — `OperationLogModel` y `ScheduledOperationModel` aceptan `animal_id`
  o `lote_id` (ambos opcionales). Los logs se atan al UUID interno del animal,
  por lo que sobreviven al cambio de `idCaravana` durante la promoción.
- **`scheduleOperation`** — crea con `estado = 'PENDING'`, pero `queryScheduledOperations`
  filtra por `Q.where('estado', Q.notEq('DONE'))` y `markScheduledAsDone` lo deja en
  `'DONE'`. Inconsistencia menor: los logs nunca usan `'COMPLETADO' / 'CANCELADO'`
  como dice el comentario del modelo (`PENDIENTE | COMPLETADO | CANCELADO`).

### 7. Acciones sobre genéricos en UI
- **`GenericActionModal.tsx`** — modal con botones MOVER / SANIDAD que solo dispara
  `Alert.alert('Acción en Desarrollo', ...)`. **No ejecuta nada en la DB.** Stub.
- **`PotrerosScreen` (PotreroDetailsModal)** — botones MOVER / SANIDAD / NUTRIR.
  MOVER y SANIDAD: solo `Alert.alert('Próximamente: ...')`. NUTRIR sí abre `AplicarRacionModal`.
- **`InventoryScreen` (bulk action bar)** — botones Mover / Sanidad: ambos solo `Alert.alert`.
- **`BatchActionSheet.tsx`** — el flujo de "trabajo en manga" sí persiste: maneja
  VACUNACION / PESAJE / CAMBIO_LOTE / CAMBIO_CATEGORIA. Filtra `knownItems = queue.filter(animalId != null)`,
  el resto se ignora con un warning. Los genéricos pueden encolarse desde la sesión de manga,
  pero solo si fueron escaneados (no es el caso típico para genéricos sin caravana).

---

## Áreas afectadas (file paths + por qué)

| Archivo | Por qué importa |
|---|---|
| `src/data/repositories/AnimalRepository.ts` | Núcleo del bug: `findByRfid` consulta `id_caravana`, no `rfid`. `linkRfidToGeneric` no setea la columna `rfid` real. `createBulkGenerics` usa `potreroId` pero la firma del spec decía `loteId`. |
| `src/data/models/AnimalModel.ts` | Falta `@field('rfid')` declarado pese a estar en el schema; varios componentes lo usan como si existiera. |
| `src/features/scan/components/IndividualModeView.tsx` | Usa `<TouchableOpacity>` sin importarlo — runtime crash en el branch `not_found`. |
| `src/features/scan/LinkGenericModal.tsx` | No filtra por lote/potrero actual del scanner; lista genéricos del sistema entero. Sin filtro por categoría. |
| `src/features/scan/EventActionSheet.tsx` | Hace `Q.where('rfid', rfid)` (columna real `rfid`), inconsistente con `useRFIDScanner` y `TratamientoFormModal` que buscan por `id_caravana`. |
| `src/features/scan/hooks/useRFIDScanner.ts` | Busca por `id_caravana` — coherente con el flujo bulk-create (que sólo escribe `idCaravana`). Pero al promover, NO actualiza la columna `rfid`, por lo que `EventActionSheet` no encontrará al animal por RFID después. |
| `src/features/sanidad/TratamientoFormModal.tsx` | Sólo permite tratar UN animal individual; sin flujo masivo para tropa genérica. |
| `src/features/sanidad/ProtocoloFormModal.tsx` | El selector "Lote" pobla con potreros y guarda `potrero.id` en `protocolo.loteId`. Ambigüedad lote vs potrero arrastrada. |
| `src/features/inventory/ui/GenericActionModal.tsx` | Stub: las acciones MOVER y SANIDAD no persisten nada. |
| `src/features/inventory/InventoryScreen.tsx` | El bulk action bar también es stub para Mover y Sanidad. La key del `GenericGroupCard` agrupado no incluye potrero, podría colisionar entre potreros si hay misma categoría. `selectedGenericGroup` se setea pero nunca se llama (modal nunca se abre desde la card). |
| `src/features/potreros/PotrerosScreen.tsx` | Botones MOVER / SANIDAD del potrero también son stubs. NUTRIR sí funciona. |
| `src/features/scan/BatchActionSheet.tsx` | Soporta knownItems con `animalId`, los unknowns se ignoran. No tiene branch para "tropa genérica del potrero X" (que no proviene de un scan). |
| `src/data/repositories/SanidadRepository.ts` | `scheduleOperation` graba `estado: 'PENDING'`, `markScheduledAsDone` graba `'DONE'`. El modelo dice `'PENDIENTE | COMPLETADO | CANCELADO'`. Inconsistencia. |
| `src/data/models/OperationLogModel.ts` | Relación `lote` mapea a `'potreros'` en la asociación pero el schema dice `lote_id` indexa hacia... nada concreto (lotes y potreros son tablas distintas). Confusión semántica. |

---

## Gaps e inconsistencias detectados (CRÍTICO → bajo)

### A. Bugs duros (crash o data inválida)

1. **`IndividualModeView` no importa `TouchableOpacity`** (línea 71 y 78). El branch
   `not_found` que muestra los botones "Nuevo Animal" / "Vincular Tropa" CRASHEA en runtime
   apenas se escanea un RFID desconocido. Es el ÚNICO punto de entrada a `LinkGenericModal`.
   → todo el flujo de promoción genérico→identificado por escaneo está roto.

2. **`AnimalRepository.findByRfid` consulta la columna equivocada.**
   Hace `Q.where('id_caravana', rfid)` cuando el método se llama "byRfid" y la columna
   `rfid` existe separadamente. Resultado: si alguien guarda un animal con `rfid` real
   distinto al `idCaravana`, jamás lo va a encontrar por la API que dice buscar por RFID.

3. **`linkRfidToGeneric` no setea la columna `rfid`.** Solo cambia `idCaravana` y baja
   `isGeneric`. Cualquier consulta posterior por la columna `rfid` (ej. `EventActionSheet`
   línea 78: `Q.where('rfid', rfid)`) NO encontrará al animal.
   → El animal recién promovido no aparece en EventActionSheet al escanearlo.

4. **`AnimalModel` no declara `@text('rfid') rfid`**. El schema lo tiene, pero el modelo
   no lo expone como propiedad. Si algún componente intenta leer `animal.rfid`, va a
   ser `undefined` aunque la columna tenga datos.

### B. Inconsistencia conceptual lote vs potrero

5. **`createBulkGenerics` usa `potreroId` y NO `loteId`.** El spec original decía
   "Lote/Potrero (Selector)" pero el repo solo asigna `potreroId`. Los animales bulk-creados
   nacen con `loteId = null`, así que cualquier query del tipo `Q.where('lote_id', ...)`
   los va a ignorar (ej. `queryByLote`, varias pantallas de sanidad).

6. **`ProtocoloFormModal`** llena el selector "LOTE" con `potreros`, y guarda el
   `potrero.id` como `loteId` del protocolo IATF. Funciona "por accidente" porque
   `loteId` es un string libre, pero si en otro lado se hace join con la tabla `lotes`,
   no va a matchear.

7. **`OperationLogModel.lote` declara `relation('potreros', 'lote_id')`** — el FK column
   se llama `lote_id` pero el target table es `potreros`. Mezcla tablas a nivel ORM.

### C. Promoción genérico → identificado: usabilidad y filtrado

8. **`LinkGenericModal` no filtra por lote/potrero actual.** El proposal exigía:
   *"Si elige B, se abre un buscador filtrado por el Lote Actual"* (proposal §2.1.3).
   La implementación lista TODOS los genéricos activos del establecimiento.
   En un campo con 500 genéricos repartidos en 5 potreros, esto es inutilizable.

9. **No hay sort/agrupado por potrero ni búsqueda en `LinkGenericModal`.**

10. **No se valida la categoría/sexo al vincular.** Si el genérico es "TERNERO" y el
    operario lo vincula a otro categoria por error, queda mal categorizado.

### D. Acciones declaradas sobre genéricos: lo CRÍTICO según el usuario

11. **`GenericActionModal` es un stub.** Botón "MOVER": solo Alert. Botón "SANIDAD": solo Alert.
    No existe ningún servicio que mueva una tropa genérica de un potrero a otro
    decrementando/transfiriendo la subcantidad seleccionada.

12. **No hay `applyTreatmentToGenericGroup`.** `SanitaryOperationService.applyTreatment(animalIds[])`
    requiere IDs explícitos. Para tratar a "los 50 genéricos del potrero El Bajo" hay
    que primero hacer un `query` con `is_generic=true AND potrero_id=X`, después construir
    el array de IDs, después llamar al servicio. Nadie hace eso desde la UI.

13. **`InventoryScreen.bulk action bar`** — botones "Mover" y "Sanidad" en bulk-select
    también son `Alert.alert` placeholders.

14. **`PotrerosScreen.PotreroDetailsModal`** — botones MOVER y SANIDAD del potrero
    son placeholders (`Alert.alert('Próximamente: ...')`).

### E. Decremento atómico de tropa genérica

15. **`GenericActionModal` permite seleccionar "a cuántos animales"** (campo `cantidadInput`),
    pero no existe lógica para "tomar N de M genéricos del grupo y aplicarles X".
    Lo correcto sería: ordenar por `created_at`, tomar los primeros N, aplicarles la acción
    (mover/tratar). Hoy el modal te deja elegir el número y termina en `Alert`.

16. **Promoción: el conteo del `GenericGroupCard` SÍ decrementa correctamente.** Es por
    reactividad — `useMemo` reagrupa cuando `withObservables` emite. Esto funciona porque
    `linkRfidToGeneric` baja `isGeneric=false` y el animal sale del bucket "generics".
    Acá no hay bug, solo verificalo manualmente porque depende de que la query
    observable de `InventoryScreen` esté vigente.

### F. Inconsistencias varias

17. **`scheduleOperation` graba `estado: 'PENDING'`, `markScheduledAsDone` graba `'DONE'`,
    `queryScheduledOperations` filtra por `Q.notEq('DONE')`.** Funciona, pero el comentario
    del modelo dice `PENDIENTE | COMPLETADO | CANCELADO`. Documentación desincronizada
    del código.

18. **`InventoryScreen.GenericGroupCard` tiene `loteNombre="Varios/Potrero"` hard-coded.**
    No se está mostrando el nombre real del potrero. La tarjeta es genérica y no informa
    al usuario en cuál potrero están los animales.

19. **`InventoryScreen.selectedGenericGroup` (state)** se setea pero nunca se asigna
    desde el `onPress` de la `GenericGroupCard` — el `onPress` actual es
    `Alert.alert('Tropa Genérica', ...)`. El `<GenericActionModal>` montado al final
    del JSX por lo tanto NUNCA se abre.

20. **`createBulkGenerics` no asigna `loteId`, `establecimientoId` ni `sexo` real**
    (`'N/A'`). Cuando el animal se promueva con `linkRfidToGeneric`, va a quedar con
    sexo `'N/A'` para siempre — la promoción NO te pide sexo en `LinkGenericModal`.

21. **No hay `synced_at` ni hooks de `sync_logs` para los bulk creates.** Si el sistema
    eventualmente sincroniza con server, los bulk creates no quedan marcados como
    pendientes.

22. **No hay tests para `createBulkGenerics` ni `linkRfidToGeneric`.** Búsqueda en
    `__tests__` no devuelve nada relacionado.

---

## Aproximaciones para resolver (con tradeoffs)

### Para los gaps A (bugs duros) — sin alternativas, son fixes obligatorios

| # | Fix |
|---|-----|
| A.1 | Importar `TouchableOpacity` en `IndividualModeView.tsx` |
| A.2 | Renombrar `findByRfid` → `findByCaravana` (coherente con la query) o cambiar la query a `Q.where('rfid', rfid)` y tener AMBOS métodos. Mejor: dos métodos explícitos: `findByCaravana(idCaravana)` y `findByRfid(rfid)`. |
| A.3 | Hacer que `linkRfidToGeneric` setee `a.rfid = scannedRfid` además del `idCaravana`. |
| A.4 | Declarar `@text('rfid') rfid!: string \| null` en `AnimalModel`. |

### Para los gaps B (lote vs potrero) — decisión semántica

| Aproximación | Pros | Contras | Esfuerzo |
|---|---|---|---|
| **B1: Renombrar todo a "potrero"** y eliminar concepto de "lote" del flujo de genéricos. Vincular `loteId` solo cuando sea grupo administrativo. | Simple, coherente con UI actual. | Hay que actualizar `proposal.md`, `spec.md` y partes de Sanidad/IATF. Puede romper análisis de hacienda por lote. | Medio |
| **B2: Mantener ambos**, pero en `createBulkGenerics` exigir AMBOS (`potreroId` y `loteId`) y en UI mostrar dos selectores. | Cubre el modelo de datos completo. | UI más cargada, dos selectores en bulk-create. | Medio |
| **B3: Status quo + warning** — solo agregar validación que avise si falta uno o el otro. | Mínimo cambio. | Sigue siendo ambiguo, deuda técnica. | Bajo |

**Recomendación**: **B1**, con una migración leve: si hoy hay genéricos con `potreroId` y
sin `loteId`, dejar `loteId = null` y los componentes de Sanidad/IATF tienen que aceptarlo.

### Para los gaps C (filtrado en `LinkGenericModal`)

| Aproximación | Pros | Contras | Esfuerzo |
|---|---|---|---|
| **C1: Agregar prop `defaultPotreroId`** al modal y filtrar query por ese potrero, con fallback a "todos" si no se pasa. | Mejor UX, alineado con proposal. | Requiere conocer el potrero "actual" del scanner — agregar al `scanStore`. | Bajo |
| **C2: Búsqueda+chip de filtros por categoría/potrero** dentro del modal. | Más flexible. | Más UI. | Medio |
| **C3: Auto-detectar por geolocalización del usuario.** | Suena lindo. | Saltarse permisos, GPS no siempre. | Alto, NO recomendado. |

**Recomendación**: **C1** primero, **C2** como mejora posterior.

### Para los gaps D y E (acciones reales sobre genéricos)

| Aproximación | Pros | Contras | Esfuerzo |
|---|---|---|---|
| **D1: Servicios genéricos en `core/services/`** que reciben `(potreroId, categoria, count)` y resuelven los IDs concretos por orden FIFO (más viejos primero). | Encapsulado, reutilizable, atómico vía `database.write`. | Hay que decidir el criterio de selección (FIFO, peso, aleatorio). | Medio |
| **D2: Mover toda la lógica al modal (`GenericActionModal`)** con queries directas a la DB. | Implementación rápida. | Dispersión de lógica de negocio en componentes UI, no testeable. | Bajo |
| **D3: Convertir el "grupo" en una tabla real** (`generic_animal_groups` con `count`) y operar sobre el grupo en lugar de N filas. | Más eficiente al escalar. | Refactor mayor, contradice el modelo "1 fila por animal" del proposal §1.1, perdés trazabilidad individual. | Alto |

**Recomendación**: **D1**. Crear:
- `GenericMovementService.moveGenericFromPotrero(originPotreroId, categoria, destPotreroId, count)`
- `GenericSanitaryService.applyTreatmentToGeneric(potreroId, categoria, operationId, count, dosis, responsable)`

Estos servicios resuelven internamente los `animalIds` (los más antiguos primero) y delegan
en `AnimalMovementService.transferAnimals` / `SanitaryOperationService.applyTreatment`.
Así la consistencia con flujos individuales se mantiene.

### Para los gaps F (limpiezas varias)

- **F.17**: Estandarizar valores de `estado` en `scheduled_operations` a `'PENDING' | 'DONE' | 'CANCELLED'`
  o castellanos consistentes. Actualizar comentario del modelo.
- **F.18**: En `InventoryScreen`, leer el potrero real (`withObservables` o fetch sync) y
  mostrar el nombre.
- **F.19**: Conectar `onPress` de `GenericGroupCard` → `setSelectedGenericGroup({ count, sample, potreroId })`.
- **F.20**: O bien (a) hacer obligatorio el sexo en `BulkCreateModal` (hoy es `'N/A'`),
  o (b) pedirlo durante la promoción en `LinkGenericModal`. Recomiendo (a) — más temprano = mejor.
- **F.22**: Tests unitarios mínimos: `createBulkGenerics`, `linkRfidToGeneric`,
  `findByCaravana` vs `findByRfid`.

---

## Recomendación

**Hacer un nuevo change-set llamado `Animales-Genericos-V2`** o continuar este mismo con
una nueva ronda de proposal/spec/tasks que cubra los siguientes hitos:

### Hito 1 — Fixes de bug duros (BLOQUEANTE)
1. `IndividualModeView` import de `TouchableOpacity`.
2. Separar `findByCaravana` / `findByRfid` en el repo.
3. `linkRfidToGeneric` setea `rfid` además de `idCaravana`.
4. Declarar `@text('rfid')` en `AnimalModel`.

### Hito 2 — Servicios para acciones sobre genéricos
1. `GenericMovementService` con FIFO selection.
2. `GenericSanitaryService` con FIFO selection.
3. Conectar `GenericActionModal` y los stubs de `InventoryScreen`/`PotrerosScreen` a estos servicios.

### Hito 3 — UX de promoción y bulk-create
1. `LinkGenericModal` recibe `defaultPotreroId` y filtra.
2. `BulkCreateModal` exige sexo (no más `'N/A'`).
3. Promoción pide confirmar categoría/sexo si el operario quiere ajustarlos en ese momento.

### Hito 4 — Limpieza semántica lote vs potrero
1. Decidir: ¿genéricos en potreros o en lotes? La UI dice potrero, el spec original decía lote.
   Recomiendo potrero como default y `loteId` como opcional.
2. Actualizar `ProtocoloFormModal` para usar `lotes` reales si los protocolos IATF son
   por lote-administrativo, o renombrar a `potreroId` si son por potrero.
3. Corregir `OperationLogModel.lote` relation para que apunte a la tabla correcta.

### Hito 5 — Testing y observabilidad
1. Tests unitarios `AnimalRepository.{createBulkGenerics, linkRfidToGeneric, findByRfid, findByCaravana}`.
2. Test de integración: bulk-create 50 → linkear 1 → el contador del card baja a 49.
3. Logs de telemetría/sync para bulk creates.

---

## Riesgos

- **Datos en producción ya creados con `sexo='N/A'`** — al endurecer el contrato hay que
  decidir qué hacer con los registros existentes. Migración o tolerancia retroactiva.
- **Lote vs potrero**: cualquier cambio de semántica puede romper queries de Sanidad /
  Dashboard / KPIs que asumen el modelo viejo. Mapear todos los call-sites antes.
- **`linkRfidToGeneric` actualmente solo cambia `idCaravana`** — si en producción ya hay
  animales promovidos, su columna `rfid` está vacía. Hay que considerar un backfill.
- **Reactividad de WatermelonDB**: si los servicios nuevos no envuelven todo en un único
  `database.write`, hay riesgo de estados intermedios visibles en UI durante operaciones
  masivas.
- **FIFO de genéricos**: si el criterio de "qué animal específico estoy moviendo/tratando"
  importa para cuentas de stock o ventas, FIFO podría ser inadecuado. Validar con el
  usuario antes de implementar.

---

## ¿Listo para Proposal?

**Sí — pero el orquestador debería avisar al usuario que la implementación previa está
parcialmente rota** (Hito 1 son bugs CRÍTICOS, no mejoras): `IndividualModeView` no
compila/corre el branch `not_found`, lo que deja inutilizable el flujo de promoción.

Sugerencia de mensaje al usuario:
> "Boludo, hice la auditoría completa. La buena: la base de datos, el bulk-create y la
> agrupación visual están bien. La mala: hay 4 bugs duros (uno hace crashear el flujo de
> promoción de genéricos por scan), las acciones MOVER/SANIDAD sobre tropa genérica son
> stubs (sólo Alert.alert, no escriben nada) y hay confusión semántica entre lote y
> potrero arrastrada del proposal original. Recomiendo arrancar `Animales-Genericos-V2`
> con 5 hitos: (1) fixes urgentes, (2) servicios reales para acciones masivas,
> (3) UX de promoción con filtrado por potrero, (4) limpieza lote/potrero, (5) tests.
> ¿Avanzamos con el proposal del V2 o querés que primero te muestre los snippets exactos
> de los 4 bugs duros?"
