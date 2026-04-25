# Especificación Técnica: Animales Genéricos

## 1. Cambios en Modelos y Base de Datos

### 1.1 `schema.ts`
Localizar la tabla `animals` en el esquema de WatermelonDB y agregar la columna:
- `is_generic`: tipo `boolean`, opcional (por defecto `false`), indexado para optimizar búsquedas.

### 1.2 `AnimalModel.ts`
Agregar la propiedad `@field('is_generic') isGeneric!: boolean`.
Asegurarse de que `idCaravana` permita strings como `GEN-YYYYMMDD-XXXX`.

## 2. Repositorios

### 2.1 `AnimalRepository.ts`
Implementar métodos para el manejo masivo y la vinculación:

```typescript
// Crea N genéricos usando database.batch()
async createBulkGenerics(
  cantidad: number,
  categoria: string,
  loteId: string,
  pesoTotal: number
): Promise<void>

// Vincula un RFID a un genérico
async linkRfidToGeneric(
  animalId: string,
  scannedRfid: string
): Promise<void>
```

## 3. Cambios en Interfaces y Componentes

### 3.1 `ScanScreen.tsx`
- Si `animalRepo.findByRfid(rfid)` devuelve nulo, abrir modal (Action Sheet).
- Opciones: "Crear Nuevo", "Vincular a Genérico".
- Al tocar "Vincular a Genérico", abrir `GenericLinkModal`.

### 3.2 `InventoryScreen.tsx`
- **Bulk Action UI:** Añadir botón global "Ingreso Masivo" o reutilizar FAB.
- **Componente `GenericGroupCard`:** Si una categoría/lote tiene > 5 genéricos, agruparlos visualmente en lugar de renderizar 50 tarjetas idénticas.
- **Badges:** Actualizar `StatusBadge` para reflejar visualmente la falta de RFID si `isGeneric == true`.

### 3.3 Formularios
- **`BulkCreateModal`**: Formulario que acepta `cantidad`, `categoria`, `lote_id`, `peso_total_estimado`, `costo_compra`.

## 4. Contratos de Datos
La conversión de Genérico a Identificado no destruye el registro. Se ejecuta un `update`:
```javascript
await animal.update(draft => {
  draft.idCaravana = scannedRfid;
  draft.isGeneric = false;
});
```
Todos los registros en `operation_logs`, `events` y `movements` vinculados a este animal mantienen su integridad relacional automáticamente al usar el UUID interno de WatermelonDB.
