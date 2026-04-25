# Propuesta Técnica: Animales Genéricos (Identidad Dual)

## 1. Arquitectura de Datos: El Concepto de "Animal Fantasma"
Para que el sistema no explote al buscar un ID que no existe, debemos manejar una **Identidad Dual**.

### 1.1. Refactorización del Modelo Animal
En la base de datos, el registro debe ser capaz de vivir en dos estados.

| Campo | Tipo | Lógica Técnica |
| :--- | :--- | :--- |
| `internal_id` | UUID | ID primario de WatermelonDB (siempre existe). |
| `id_caravana` | String? | Nullable. Si es null, el sistema lo trata como genérico. |
| `is_generic` | Boolean | `@field('is_generic')`. Indexado para filtros rápidos. |
| `display_name` | Computed | Si `is_generic` es true, muestra "Genérico #[N]"; si no, muestra `id_caravana`. |

### 1.2. El "Batch Creation" (Performance)
Al crear 100 animales genéricos, el costo de escritura en disco puede freezar la UI.
*   **Técnica:** Utilizar `database.write(async () => { await database.batch(...) })`.
*   **Cálculo de Peso:** Si el usuario ingresa un lote de 50 terneros con un peso total de 10,000 kg, el sistema debe prorratear: $Peso_{individual} = \frac{Peso_{total}}{Cantidad}$.

## 2. Flujo Funcional: La "Manga" como Centro de Identificación
El momento crítico es cuando el animal genérico entra al cepo (manga) y se le coloca su caravana definitiva.

### 2.1. Proceso de "Promoción" (Generic -> Identified)
Este es el flujo de trabajo en el módulo de escaneo:
1.  **Detección:** El bastón RFID lee un chip. El sistema busca en `animals`.
2.  **Not Found:** Si no existe, el sistema lanza un "Action Sheet" con tres opciones:
    *   *A: Crear nuevo (Individual).*
    *   *B: Vincular a un Genérico existente (Recomendado).*
    *   *C: Ignorar.*
3.  **Maching:** Si elige B, se abre un buscador filtrado por el Lote Actual.
4.  **Update:** El sistema ejecuta una transacción que actualiza el registro genérico:
    `animal.update(draft => { draft.idCaravana = scannedRfid; draft.isGeneric = false; })`

## 3. Módulo de Inventario: Visualización y Densidad
Tener 500 filas que digan "Ternero Genérico" es inútil para el usuario.

### 3.1. Agrupamiento Lógico (Grouping)
En la lista de inventario, debemos implementar una **Vista de Colapso**:
*   **Regla:** Si un Lote tiene más de $X$ animales genéricos de la misma categoría, se muestran como una única tarjeta:
    `[Icono Grupo] 45 Terneros Genéricos - Lote: El Bajo`
*   Al tocar la tarjeta, se expande el desglose (o se abre el modal de edición masiva).

### 3.2. Badges de Estado
Implementar un sistema de colores para las etiquetas (badges) en la lista:
*   **Verde:** Identificado (RFID/Visual).
*   **Gris Oscuro:** Genérico (Sin ID).
*   **Naranja:** Pendiente de Sincronización.

## 4. Impacto en Sanidad y Nutrición
Aquí es donde los "Genéricos" demuestran su valor: Costeo y Carencia.

### 4.1. Sanidad Masiva
Cuando se realiza una vacunación al lote "Terneros Comprados" (que son 100 genéricos), el sistema crea 100 `operation_logs`.
*   **Beneficio:** Si a los 10 días individualizas a uno de esos terneros, su historial sanitario ya existe, porque el registro de la base de datos es el mismo, solo cambió su nombre/ID.

### 4.2. Nutrición y Equivalente Vaca ($EV$)
El cálculo de carga animal no se rompe:
$$Carga_{total} = \sum (EV_{identificados}) + \sum (EV_{genericos})$$
Los genéricos siguen consumiendo pasto y costando dinero en la tabla de raciones.

## 5. Desafíos Técnicos y Manejo de Errores

> [!danger] Riesgo de Duplicidad
> ¿Qué pasa si el usuario intenta vincular un RFID a un genérico, pero ese RFID ya existe en otro animal (ej. un animal que se vendió y volvió al campo)?
> **Solución:** El `linkRfidToGeneric` debe hacer una pre-consulta `Q.where('id_caravana', newId)`. Si existe, debe preguntar si se desea "Fusionar" o "Reemplazar".

### 5.1. UX en el Formulario de Bulk Create
El formulario de ingreso por tropa debe capturar datos mínimos para no frenar la descarga del camión:
*   Cantidad (Número entero).
*   Categoría (Dropdown).
*   Lote/Potrero (Selector).
*   Peso Promedio (Opcional, pero recomendado para el Dashboard).
*   Costo de Compra (Para el Módulo Financiero).

## 6. Roadmap de Implementación (SDD)

| Fase | Tarea | Prioridad |
| :--- | :--- | :--- |
| **Data** | Migración de Schema (`is_generic`) y Logic de `internal_id`. | ⭐⭐⭐ |
| **UX** | Componente `BulkCreateForm` con validación de cantidad. | ⭐⭐⭐ |
| **Workflow** | Lógica de "Vínculo" en el `ScanScreen`. | ⭐⭐ |
| **UI** | Agrupamiento visual en `InventoryList` para evitar lag de scroll. | ⭐ |
