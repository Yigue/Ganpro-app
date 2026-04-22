# 🐂 GanPro: Plan Maestro de Refactorización AgTech (Spec v2.0)

## 0. Arquitectura Core & AgTech Fundamentals
*   **Offline-First Estricto**: *WatermelonDB* con motor de sincronización (`SyncEngine`).
*   **Integración de Hardware**: Soporte Bluetooth (RFID y balanzas) delegado al nuevo Módulo de Escaneo.
*   **RBAC (Roles y Permisos)**: Peón, Capataz, Veterinario, Administrador.
*   **UI Outdoor (Alto Contraste)**: Tap targets de 44x44pt.

---

## 🎨 1. Global UI/UX & Design System
*   **Contextual Badges**:
    *   🔴 **Retiro/Carencia**: Animal tratado con medicamentos.
    *   🟡 **Vacía**: Tacto negativo.
    *   ⚠️ **Sobrepoblado**: Potrero excede EV/ha.
*   **Validación Estricta (Zod/Yup)**: Inputs numéricos obligatorios, validaciones lógicas cruzadas.
*   **[DB Impact]**: Se requieren tablas satélite como `animal_health_status` para evaluar de forma rápida los badges sin hacer joins complejos en el frontend.

---

## 🐄 2. Módulo Inventario (Data Hierarchy)
*   **Header Permanente**: Stock total, filtrable rápidamente por Rodeo, Lote o Categoría.
*   **Categorización y Filtros (Vista de Tablas/Acordeón)**:
    *   La UI principal debe ser una tabla o lista agrupada por categoría (Vaca, Vaquillona, Ternero/a, Toro).
    *   Al clickear la categoría, se despliega (acordeón) el listado completo de animales que pertenecen a la misma.
*   **Ficha del Animal (Modal Detallado)**:
    *   **Datos Principales**: Fecha de nacimiento, peso (actual e histórico), categoría actual.
    *   **Ubicación y Tracking**: Potrero actual, lote al que pertenece, y registro histórico de movimientos (dónde estuvo antes).
    *   **Genealogía (Opcional)**: Datos básicos de Padre/Madre si están disponibles, sin bloquear la UI.
*   **[DB Impact]**:
    *   Tabla `animals`: `birth_date`, `current_weight`, `category_id`, `current_potrero_id`.
    *   Tabla `animal_movements`: Log inmutable de cambios de potrero/lote para armar el historial.
    *   Tabla `animal_lineage`: Relaciones opcionales (sire/dam).

---

## 💉 3. Módulo Sanidad (Critical Workflow)
*   **Tab 1: Calendario & Historial Integrado (Vista Vertical)**:
    *   **Arriba (Calendario Mensual)**: Navegación por meses. Al seleccionar un día, se visualizan las operaciones programadas para esa semana/día. Permite "Programar Operación" (ej: Vacunación Aftosa) directamente en un día.
    *   **Abajo (Historial Continuo)**: Haciendo scroll se accede al historial cronológico de todas las intervenciones sanitarias realizadas, con fecha, tipo de operación, y detalles del lote/animal afectado.
*   **Tab 2: Operaciones (ABM y Aplicación)**:
    *   **Definición (ABM)**: Panel para dar de alta/editar/eliminar tipos de vacunas, tratamientos, IATF, etc., definiendo a qué categorías aplican y sus períodos de retiro (withdrawal).
    *   **Aplicación Lote/General**: Desde acá se ejecuta la acción de "Aplicar Protocolo a Todo el Lote", registrando la operación masiva.
*   **[DB Impact]**:
    *   Tabla `operations_catalog`: ABM de drogas, protocolos, retiros.
    *   Tabla `scheduled_operations`: Eventos futuros vinculados a fechas del calendario.
    *   Tabla `operation_logs`: Historial de operaciones ya ejecutadas, vinculadas a animales o lotes (`animal_id` o `lote_id`).

---

## 🌿 4. Módulo Potreros (Analytics & Nutrición)
*   **Tab 1: Gestión de Potreros (ABM & Analytics)**:
    *   **ABM**: Creación y edición de potreros (asignación de hectáreas, tipo de recurso).
    *   **Detalle del Potrero**: Cantidad de animales actuales, disponibilidad de pasto (biomasa), cálculo dinámico de Carga Animal (EV/ha).
    *   **Historial**: Registro de qué lotes pasaron por el potrero.
*   **Tab 2: Nutrición (ABM & Aplicación)**:
    *   **ABM de Raciones**: Creación de dietas basadas en ingredientes con sus valores teóricos (Materia Seca, Proteína Bruta, Energía Metabolizable).
    *   **Aplicación**: Interfaz para registrar que "Al potrero X se le entregaron Y kilos de la ración Z".
*   **Tab 3: Condición Corporal (CC)**:
    *   Slider visual (escala 1-5) e historial de evolución del rodeo.
*   **[DB Impact]**:
    *   Tabla `potreros`: Atributos core (`hectares`, `resource_type`, `capacity`).
    *   Tabla `rations_catalog`: ABM de raciones disponibles.
    *   Tabla `potrero_feeding_logs`: Registro histórico de qué ración se aplicó a qué potrero y cuándo.

---

## 📱 5. Módulo Escaneo / Manga (New Dedicated Module)
*(Extraído de Sanidad por separación de responsabilidades)*
*   **Modo Manga (Speed UI)**:
    *   Pantalla oscura de alto contraste, optimizada para acción ininterrumpida.
    *   **Flujo Hardware**: Lee caravana Bluetooth -> Auto-selecciona animal en pantalla -> El operador ingresa peso o confirma vacuna con botones gigantes -> Siguiente animal.
*   **[DB Impact]**: 
    *   Requiere una tabla de sincronización rápida (`manga_action_queue`) en WatermelonDB para evitar bloqueos en la UI mientras se escriben múltiples registros por segundo.

---

## 📊 6. Dashboard (Decision Intelligence)
*   **Operativo**: GDP promedio, preñez, mortandad, accesos directos ("Nuevo Nacimiento", "Mover").
*   **Económico**: Costo por kg producido, distribución de gastos.
*   **[DB Impact]**: Requiere vistas materializadas o campos precalculados en local (WatermelonDB observables) para no colapsar el dispositivo calculando el GDP de 5,000 animales en tiempo real.
