# Plan de Tareas: Animales Genéricos

## Tarea 1: Base de Datos y Repositorios
- [x] Modificar `src/data/database/schema.ts` para agregar la columna `is_generic` (boolean) a la tabla `animals`.
- [x] Actualizar `AnimalModel.ts` añadiendo `@field('is_generic') isGeneric!: boolean`.
- [x] Actualizar `AnimalRepository.ts` implementando el método `createBulkGenerics`. Debe usar `database.batch()` y autogenerar el `idCaravana` como `GEN-UUID`.
- [x] Implementar el método `linkRfidToGeneric(animalId, rfid)` en `AnimalRepository.ts`. Validar primero que el RFID no exista.

## Tarea 2: Creación Masiva (Inventario)
- [x] Crear componente UI `BulkCreateModal.tsx` en `src/features/inventory/ui`.
- [x] Integrar `BulkCreateModal` en `InventoryScreen.tsx`. Agregar un botón flotante secundario o una opción en el header para "Ingreso por Tropa".
- [x] Conectar el formulario del modal con `AnimalRepository.createBulkGenerics`.

## Tarea 3: Agrupamiento Visual (Inventario)
- [x] Modificar `InventoryScreen.tsx` o su container para agrupar los animales en `useMemo`.
- [x] Crear componente `GenericGroupCard.tsx` que reciba una cantidad N y detalles (Categoría, Lote) y renderice una tarjeta consolidada.
- [x] Modificar `AnimalListItem.tsx` para mostrar un StatusBadge color gris ("Sin RFID") si `isGeneric` es true.

## Tarea 4: Flujo de Vinculación (Escanear)
- [x] Modificar `ScanScreen.tsx`. Al detectar un RFID fallido, en vez de asumir alta directa, levantar un Modal de Opciones.
- [x] Crear componente UI `LinkGenericModal.tsx` en `src/features/scan/ui`.
- [x] Conectar la selección de ese modal con `AnimalRepository.linkRfidToGeneric`.
- [x] Al finalizar, mostrar toast de éxito y volver al estado inicial del escáner.
