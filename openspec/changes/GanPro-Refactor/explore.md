# 🐂 GanPro-Refactor: SDD Explore & Master Plan

## Estado del Proyecto
*   **Fase**: Exploración y Especificación Técnica (`sdd-explore`).
*   **Objetivo**: Refactorizar GanPro hacia una plataforma AgTech profesional, modular, escalable y con soporte offline estricto.

## 1. Reglas Globales, Arquitectura y Clean Code (MANDATORY)
Todos los sub-agentes que operen en los submódulos DEBEN seguir estas reglas sin excepciones:
1.  **Arquitectura Feature-Sliced / Screaming Architecture**: Todo código nuevo debe vivir dentro de su feature (Ej: `src/features/Sanidad/`). Los módulos deben ser autocontenidos y no depender de carpetas genéricas gigantes.
2.  **Container-Presentational Pattern**: Las vistas que interactúan con la base de datos (Containers) DEBEN estar totalmente desacopladas de los componentes puramente visuales (Dumb Components). La reactividad de WatermelonDB se maneja usando el HOC `@withObservables`.
3.  **TypeScript Estricto**: Totalmente prohibido el uso de `any`. Las interfaces para los modelos de WatermelonDB y las props de React deben ser explícitas. Se utilizarán esquemas (Zod/Yup) para toda validación de datos en el cliente.
4.  **UI/UX AgTech (Outdoor Rules)**: Para soportar el uso en el campo (al sol, con guantes, pantallas sucias), los tap targets deben ser mínimos de 44x44pt. El modo alto contraste es obligatorio. Prohibido usar animaciones complejas que degraden la performance en dispositivos de gama baja.
5.  **Offline-First (WatermelonDB)**: Todas las lecturas y escrituras pasan exclusivamente por la base de datos local. Nunca se hacen llamadas directas a una API en componentes de UI. La sincronización se delega a un motor de fondo (`SyncEngine`).

## 2. Definición de Módulos (Master Plan)

### 2.1. Core & Global (Prioridad 1 - Setup Base)
*   **DB Impact**: Actualización masiva de Schemas (creación de `animal_movements`, `operations_catalog`, `scheduled_operations`, `operation_logs`, actualización de `potreros`, `rations_catalog`, `potrero_feeding_logs`, `manga_action_queue`).
*   **Navegación**: Reestructuración del Root y Tab Navigators para alojar los nuevos módulos correctamente (específicamente, aislar 'Escaneo/Manga' de 'Sanidad').
*   **UI Core**: Definición de los Contextual Badges y el Design System base.

### 2.2. Módulo Inventario
*   **UI Principal**: Tabla o Lista desplegable agrupada por categorías (Acordeón).
*   **Ficha de Animal**: Datos vitales, pesos e historial de movimientos.
*   **Tracking**: Lectura inmutable de la tabla `animal_movements`.

### 2.3. Módulo Sanidad
*   **UI Unificada**: Pantalla única con Calendario (arriba, navegación mensual con marcadores de eventos) e Historial continuo (abajo, lista scrolleable cronológica).
*   **ABM Operaciones**: Pestaña dedicada para gestionar el catálogo de vacunas, IATF y tratamientos.
*   **Lógica de Retiro**: Implementación técnica del bloqueo de remitos/venta para animales con `withdrawal_period` activo.

### 2.4. Módulo Potreros y Nutrición
*   **Gestión Potreros**: ABM de potreros, indicador de biomasa, cálculo en tiempo real de Carga Animal (EV/ha).
*   **Nutrición**: ABM de Raciones teóricas y flujo de registro de entregas vinculando ración con potrero (`potrero_feeding_logs`).
*   **Condición Corporal**: UI de slider visual con histórico de evolución.

### 2.5. Módulo Escaneo / Manga (Hardware)
*   **Separación Arquitectónica**: Extraído de Sanidad para optimizar performance y flujo.
*   **Flujo Rápido (Speed UI)**: Lectura RFID -> Auto-selección -> Acción confirmada en 1 tap.
*   **Performance Crítica**: Implementación de `manga_action_queue` para writes concurrentes, asegurando que la UI de React Native no se congele durante el escaneo de docenas de animales por minuto.

### 2.6. Dashboard
*   **Operativo**: GDP, preñez, mortandad. (Requiere observables agregados, cuidado con la performance).
*   **Financiero**: Costo por kg producido, distribución de gastos.

## 3. Workflow de Implementación (Orchestration)
La ejecución se dividirá de forma secuencial y atómica:
1.  **Fase 1 (Global)**: Schemas, Design System, Navigators.
2.  **Fase 2 (Inventario)**: Sub-agente dedicado.
3.  **Fase 3 (Sanidad)**: Sub-agente dedicado.
4.  **Fase 4 (Potreros)**: Sub-agente dedicado.
5.  **Fase 5 (Manga)**: Sub-agente dedicado.
6.  **Fase 6 (Dashboard)**: Sub-agente dedicado.
