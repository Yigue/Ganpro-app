# Diseño: Animales Genéricos

## 1. Patrones de UX/UI

### 1.1 `BulkCreateModal`
- **Tipo:** Modal tipo "Bottom Sheet" (similar al `AddTransactionModal`).
- **Campos:**
  - `Cantidad` (Input numérico, grande).
  - `Categoría` (Selector de chips horizontales).
  - `Lote Destino` (Dropdown/Selector modal).
  - `Peso Total` (Input numérico opcional).
- **Acción principal:** Botón "Ingresar N Animales" (Color Primary).
- **Feedback:** Mostrar un toast/alerta al finalizar ("Se crearon 50 terneros genéricos en El Bajo").

### 1.2 `GenericGroupCard` (Inventario)
En la lista de inventario, para evitar renderizar 50 filas iguales:
- **Agrupamiento:** El renderizador del `FlatList` detecta consecutivos genéricos con misma Categoría y Lote.
- **Visual:**
  - Borde punteado oscuro.
  - Título: "50x Terneros (Genéricos)".
  - Subtítulo: "Lote: El Bajo | Peso prom: 200kg".
  - Icono: `layers-outline` o `copy-outline`.
- **Interacción:** Al tocar la tarjeta agrupada, NO abre el modal individual, abre un Action Sheet: "Mover Lote Completo", "Sanidad Masiva", "Desagrupar Vista".

### 1.3 `ScanScreen` - Modal de Vinculación
- **Trigger:** RFID no encontrado.
- **Componente:** `LinkGenericModal`
- **UI:** 
  - Título: "Caravana No Registrada".
  - Texto: "La caravana XXXXX no pertenece a ningún animal. ¿Querés crear un animal nuevo o vincularla a uno genérico?".
  - Botones: [Crear Nuevo] [Vincular a Genérico].
- **Vista de Selección:** Lista de animales genéricos, ordenados por Lote actual. 

## 2. Decisiones Arquitectónicas
- **Optimización de Render:** La agrupación en inventario se calculará en un `useMemo` intermedio antes de pasar los datos al `FlatList`.
- **Integridad:** El ID interno (`internal_id`) garantiza que aunque el `idCaravana` cambie, el historial en la DB permanece inmutable.
