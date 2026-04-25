# Exploration: Mejoras Potreros y Nutrición

## 1. Contexto Actual
El módulo `potreros` actualmente maneja tres verticales dentro de `PotrerosScreen.tsx`:
- **Potreros (Inventario Físico):** Muestra la lista de potreros y un desglose de los animales (carga animal, categorías, etc.).
- **Nutrición:** Permite listar raciones y abre un "Mezclador de Raciones" (Formulador).
- **Condición Corporal (C.C.):** Presenta una evolución gráfica estática (hardcodeada) y un listado de auditorías previas.

## 2. Deuda Técnica y Errores (Bugs)
- **VirtualizedLists anidados en ScrollView:** El modal `PotreroDetailsInner` y el propio tabulador están metiendo componentes virtualizados (FlatList) dentro de estructuras que no lo soportan adecuadamente o usando `ScrollView` como contenedor de listas largas (ej. en `RacionMixerModal`), lo que causa el error `VirtualizedLists should never be nested inside plain ScrollViews...`.
- **RacionMixerModal bloqueante:** El formulador de raciones no tiene un botón de "Cerrar/Cancelar". Si el usuario no logra sumar exactamente el 100% en la mezcla, el botón "Guardar" rechaza la acción con un `Alert` y el usuario queda atrapado en el modal sin poder salir.
- **setLayoutAnimationEnabledExperimental:** Existe una llamada heredada a esta función de `UIManager` en el entry point de la app que está lanzando un *Warning* en la nueva arquitectura de React Native (Fabric).

## 3. Funcionalidades Faltantes (Gaps del MVP)

### Potreros
- Falta el botón/formulario para **Crear Potrero Nuevo**.
- Falta la capacidad de **Editar** un potrero existente (el botón actual hace un `Alert`).

### Nutrición
- No hay forma de **crear o agregar nuevos ingredientes/suplementos** a la base de datos para usarlos en las raciones.
- Faltan acciones de edición/eliminación en el catálogo de Raciones (`RacionCard`).

### Condición Corporal (C.C.)
- La sección de C.C. es "bastante básica". El gráfico tiene datos en duro (`data: [320, 335...]`).
- Falta una **Calculadora/Formulario de Auditoría de C.C.** para registrar nuevos puntajes en el lote o por animal.

## 4. Propuesta de Arquitectura y Solución

Para que el módulo sea funcional y robusto (v3 Enterprise), proponemos:

1. **Refactorización de Navegación y UI (Resolver Errores):**
   - Reemplazar los `ScrollView` contenedores por el `ListHeaderComponent` del `FlatList` principal en `PotrerosScreen.tsx`.
   - Agregar un `header` modal estándar a `RacionMixerModal` con un botón `Ionicons name="close"` que ejecute `onClose()`.
   
2. **CRUD de Potreros:**
   - Crear un modal `PotreroFormModal.tsx` para Alta y Edición de Potreros (nombre, hectáreas, recurso forrajero).
   - Agregar el Floating Action Button (FAB) en la vista de Potreros para abrir este modal.

3. **CRUD de Nutrición e Ingredientes:**
   - Crear un `SuplementosManagerModal.tsx` para agregar ingredientes (Maíz, Silo, etc.) con sus costos y propiedades.
   - Conectar la lista de suplementos en el Formulador (`RacionMixerModal`) para que sea dinámica y refleje el inventario real.

4. **Auditoría de Condición Corporal:**
   - Crear un componente interactivo `CalculadoraCCModal.tsx` que permita cargar un puntaje de C.C. (1 a 5) y actualizar el modelo `CondicionCorporalModel`.
   - Conectar el gráfico de evolución a los datos reales de WatermelonDB (`ccs` observable).

## Próximo Paso Recomendado
Continuar con la fase de Propuesta (`sdd-propose`) para detallar las interfaces de base de datos y la división de los modales.
