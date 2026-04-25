# Proposal: Módulo Potreros y Nutrición 360°

## 1. Resumen Ejecutivo
El módulo actual de Potreros es meramente visual. Esta propuesta transforma la pantalla de "Potreros" en un **Centro de Mando de Recursos y Nutrición**. Se habilitarán operaciones CRUD para la gestión física de la tierra (Potreros), gestión del stock de alimento (Componentes), formulación de dietas (Raciones) y la logística de alimentación (Aplicación a Lotes). Además, integraremos motores de cálculo para proyección de peso y costos, junto con un módulo especializado en Condición Corporal.

## 2. Objetivos del Sistema
- **Independencia de la UI:** Mover la lógica de cálculos complejos (costos de ración, proyecciones de peso) a servicios de dominio (ej. `NutricionService`), fuera de los modales de React.
- **Trazabilidad:** Toda aplicación de ración a un lote debe dejar un registro en WatermelonDB (movimiento de inventario o registro en `AnimalMovementModel` asociado a la alimentación).
- **Métricas Financieras en Tiempo Real:** Las raciones formularán automáticamente su costo final basado en el valor actual del mercado de sus componentes.

## 3. Alcance Funcional (Scope)

### A. Gestión de Tierra y Animales (Potreros)
- **ABM Potreros:** Creación, edición y baja lógica de potreros.
- **Asignación:** Transferencia de lotes (grupos de animales) a potreros.

### B. Gestión Nutricional (Raciones y Componentes)
- **ABM Suplementos (Componentes):** Catálogo maestro de ingredientes (Silo, Maíz, Núcleo) con precios por tonelada y % de materia seca (MS).
- **ABM Raciones:** Formulador que suma componentes. Valida que el % total sea 100 y calcula el costo final por KG en base a la lista de suplementos.
- **Operativa:** Función "Alimentar Lote / Potrero". Permite seleccionar una Ración activa, la cantidad de KG a suministrar, y la fecha.

### C. Calculadoras Ganaderas
- **Calculadora de Costo de Ración:** Resuelta en tiempo real dentro del formulador.
- **Proyector de Ganancia de Peso (GDP):** Un simulador donde se ingresa la Ración (con su Energía Metabólica/Proteína), peso promedio del lote, y estima la ganancia diaria esperada y el costo del Kilo Producido.

### D. Condición Corporal (C.C.)
- **Auditoría UI:** Modal rápido para ingresar puntuaciones C.C. (escala 1 a 5).
- **Visualización:** Gráfico histórico real leyendo la tabla `condicion_corporal` filtrada por potrero o lote.

## 4. Riesgos Identificados
- **Performance de la DB:** Si hay demasiados ingredientes en una ración y muchos lotes consumiéndolos, las consultas anidadas en WatermelonDB podrían ser pesadas. Usaremos consultas en batch.
- **Errores de UI:** Resolver los FlatList anidados antes de agregar los modales nuevos para evitar crasheos en los `ScrollViews`.

## 5. Criterios de Aceptación
1. El usuario puede crear un ingrediente nuevo y verlo reflejado inmediatamente en el Formulador de raciones.
2. Al formular, se obtiene el costo exacto de esa ración.
3. Se puede registrar una acción de alimentación a un potrero específico sin errores.
4. No quedan hardcodes en el gráfico de Condición Corporal.
