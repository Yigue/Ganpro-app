
# Módulo de Sanidad

El módulo de **Sanidad** debe estructurarse mediante una navegación de dos pestañas (tabs) principales: **Calendario** y **Gestión de Tratamientos** (Vademécum).

---

## Tab 1: Calendario de Eventos Sanitarios

Esta pantalla actuará como el planificador visual y operativo de las tareas sanitarias del campo.

**Interfaz de Usuario (UI/UX):**

- El componente principal será un **Calendario Interactivo**.

- Debe soportar **Múltiples Vistas** (Mensual, Semanal) y navegación tipo _drill-down_ (hacer clic en un mes/semana para expandir y ver el detalle de los días).

**Modelo de Datos (Base de Datos):**

- Se requiere crear una entidad/tabla (ej. `ProgramacionSanitaria` o `ScheduledTreatment`) para persistir la planificación.

- **Atributos clave esperados:** `fecha_inicio`, `fecha_fin` (para manejar plazos), `lote_id` (a qué grupo de animales aplica), `tratamiento_id` (FK vinculada al catálogo de tratamientos) y `estado` (Pendiente, Realizado, Cancelado).

**Requerimientos Funcionales / Historias de Usuario:**

1. **CRUD Contextual:** Como usuario, debo poder realizar el CRUD (Crear, Leer, Actualizar, Eliminar) de una programación haciendo clic directamente sobre un día específico en el componente del calendario.

2. **CRUD por Botón Global:** Como usuario, debo poder crear una programación mediante un botón de acción global (ej. "Crear Programación"), sin necesidad de interactuar primero con la grilla del calendario.

3. **Gestión de Plazos:** Como usuario, al crear una programación, debo poder definir su temporalidad: un día específico, un rango de días (ej. una semana) o un plazo mensual.

4. **Historial y Filtrado:** Como usuario, debo poder acceder a un historial (log) de aplicaciones y tratamientos ya realizados. Este registro debe incluir herramientas de filtrado y ordenamiento para auditar y manejar la información de forma eficiente.

---

## Tab 2: Vademécum / Gestión de Tratamientos

Esta pantalla estará dedicada a la administración de los parámetros de los tratamientos (catálogo maestro) y sus categorías. Es el núcleo lógico donde se definen "las reglas" de cada aplicación sanitaria.

**Interfaz de Usuario (UI/UX):**

- Listado general y panel de control para realizar ABM (Altas, Bajas y Modificaciones) del catálogo de tratamientos.

- Capacidad de acceder a la vista de detalle de cada tratamiento para analizar su historial de uso en el establecimiento.

**Modelo de Datos (Base de Datos):**

- Se requiere una entidad/tabla maestra llamada `Tratamiento` (o `ProtocoloSanitario`) y otra llamada `CategoriaTratamiento`.

- **Atributos clave para `Tratamiento`:**

  - `nombre`

  - `categoria_id` (Relación FK con la tabla de categorías)

  - `descripcion` y `notas` (Texto libre para especificaciones)

  - `duracion_dias` (Tiempo estimado del tratamiento)

  - `es_recurrente` (Booleano)

  - `frecuencia_repeticion` (Intervalo de fechas/días si debe repetirse)

  - `cantidad_repeticiones` (Número de veces que se repite la dosis)

  - `dosis_por_kg` (Cálculo de dosificación en base al peso del animal).

**Requerimientos Funcionales / Historias de Usuario:**

1. **ABM de Tratamientos:** Como usuario, debo poder ejecutar un CRUD completo sobre el catálogo de Tratamientos (crear nuevos medicamentos/protocolos, editar sus parámetros de dosis o frecuencias, y eliminarlos o archivarlos).

2. **ABM de Categorías:** Como usuario, debo poder realizar un CRUD sobre las Categorías de Tratamientos (ej. Antibióticos, Vacunas, Antiparasitarios, etc.) para organizar correctamente mi catálogo/vademécum.

3. **Visualización por Categoría:** Como usuario, la interfaz debe permitirme visualizar, agrupar y filtrar los tratamientos existentes basándose en su categoría asignada.

# Módulo de Potreros y Nutrición

**Objetivo del Módulo:** Este módulo está diseñado para centralizar la gestión de los recursos físicos (potreros) y la estrategia nutricional de la hacienda. Permitirá controlar dónde están los animales, qué comen, cuánto cuesta alimentarlos y cómo evoluciona su estado corporal.

Se divide en tres pestañas (tabs) principales:

---

## Tab 1: Gestión de Potreros

Esta pestaña es el "mapa" del establecimiento. Permite realizar el ABM (Alta, Baja, Modificación) de los potreros y visualizar en tiempo real la ocupación y el flujo de la hacienda.

**Estrategia de Diseño (UI/UX):**

- **Vista Principal:** Un listado en formato de tarjetas (cards) visualmente atractivo y fácil de leer al aire libre. Cada tarjeta debe mostrar el nombre del potrero y un resumen de su estado (ej. "Libre", "Ocupado").

- **Vista de Detalle:** Al seleccionar un potrero, se debe abrir un modal o pantalla de detalle que muestre su ficha completa.

**Sección Inferior(por ahora solo visual): Historial de Movimientos:** Debajo del listado de potreros (o en una sección dedicada dentro de esta vista), debe existir un registro histórico de los movimientos de hacienda.

- _Atributos a mostrar:_ Fecha, Origen (Potrero A), Destino (Potrero B), Tipo de Operación (Movimiento interno, Ingreso, Egreso) y Cantidad de cabezas involucradas.

- _Nota Técnica:_ Esta sección será **solo de lectura (Read-Only)** en esta iteración. La capacidad de ejecutar nuevos movimientos desde acá se enviará al documento de Deuda Técnica / Backlog.

**Historias de Usuario / Requerimientos Funcionales:**

1. **CRUD de Potreros:** Como usuario, debo poder realizar Altas, Bajas y Modificaciones de mis potreros, definiendo atributos como Nombre, Hectáreas y Tipo de Recurso (ej. Pastura, Verdeo).

2. **Detalle de Ocupación:** Como usuario, al ingresar al detalle de un potrero específico, debo poder ver no solo sus datos físicos, sino también el **inventario actual de animales asignados**, desglosado por cantidad y categoría (ej. "Total: 50 | 30 Vacas, 20 Terneros").

3. **Auditoría de Movimientos:** Como usuario, debo poder visualizar y consultar el historial cronológico de movimientos de hacienda para rastrear la rotación por los distintos potreros.

---

## Tab 2: Asistencia Nutricional (Raciones)

Esta pestaña es el motor de cálculo y costeo de la alimentación suplementaria.

**Estrategia Funcional:** Debe actuar como un Vademécum Nutricional y una calculadora integrada para asistir en la formulación y entrega de alimento.

**Historias de Usuario / Requerimientos Funcionales:**

1. **Formulación de Raciones:** Como usuario, debo poder crear y calcular raciones (mezclas) definiendo sus ingredientes, y que el sistema calcule los valores nutricionales teóricos (Ej. Energía, % de Proteína, % de Materia Seca).

2. **Cálculo de Costos:** Como usuario, al definir los ingredientes de una ración, debo poder ver el costo por kilogramo (o por tonelada) para evaluar el impacto económico.

3. **Asignación a Potreros:** Como usuario, debo poder registrar la "Entrega" o asignación de una cantidad específica de ración a un potrero en una fecha determinada.

4. **Historial y Totales Nutricionales:** Como usuario, debo poder acceder a un registro (historial) de todas las raciones entregadas, permitiendo ver el total de gastos acumulados en alimentación y el impacto nutricional aportado a cada potrero.

---

## Tab 3: Condición Corporal (CC) e Indicadores

Esta pestaña actúa como el "tablero de control" (dashboard) específico para el estado físico de la hacienda y la eficiencia del módulo.

**Estrategia Funcional:** Debe ofrecer una visión tanto general (del establecimiento) como segmentada (por potrero) sobre cómo impacta el manejo en los animales.

**Historias de Usuario / Requerimientos Funcionales:**

1. **Evolución del Peso:** Como usuario, debo poder visualizar gráficos o indicadores que me muestren la curva de pesos de mis animales.

2. **Registro de Condición Corporal (CC):** Como usuario, debo poder registrar y visualizar la Condición Corporal de los lotes/animales (ej. escala del 1 al 5) para auditar la "calidad" y el estado de la hacienda.

3. **Alertas de Estado:** Como usuario, el sistema debe alertarme de forma visual si los indicadores de CC o de peso caen por debajo de los umbrales esperados.

4. **Resumen Nutricional:** Como usuario, debo poder cruzar estos indicadores corporales con los datos de raciones entregadas (Tab 2) para entender si la estrategia nutricional está dando resultados.

# Módulo de Dashboard

este dashboard debe ser la aprte de mi aplcicon de modulo admintirativva de mi proyecto aca voy a tenre toda las parte de gestion visulicon y datos de mi aplciaon, tambine la parte finnacierae ca voy a tenre 2 tab la parte finaciera y el dashboar

## TAB Dashbord

muestra indicadores, datos relaes de coso progmra tareas ve tareas pendietnes, es comoun poco la gestion empresarioal y administrativa nose que se te ocre que peude ser

- como usaurio queiro ver indicadores del negocio y graficos ver por lotes por todos
  como usairo debi odeir ahcer un crud de Tareas a realziar
  como usaurio deberias

## Tab financiera

gestión integral de la aprte finzancier ade mi aplicaicon ver ignresos egresos, bance grafico por meses, ver hisotirasl de los ultimos meses, ver hstiroa y filtar lso gastos por cateoroias realizados, los ignresos tambien, alguna opcion de gernerar poerne sen base a eso
-como usaurio quiero ahcer un CRUD de la movimientoFincieor
-como suauro debo ¿poder hcer curd de cateroiaDeMoivmietno finaciero

# Módulo: Dashboard Administrativo y Financiero

**Objetivo del Módulo:** Centralizar la inteligencia de negocio del establecimiento. Transformar los datos operativos de la manga y los potreros en indicadores clave de rendimiento (KPIs), gestionar las tareas del personal y llevar un control estricto del flujo de caja (ingresos y egresos).

Se divide en dos pestañas (tabs) principales:

---

## Tab 1: Dashboard Operativo (Centro de Comando)

Esta pestaña es la pantalla de inicio ideal para el Dueño o Administrador. Resume "qué está pasando" en el campo hoy y qué hay que hacer mañana.

**Estrategia de Diseño (UI/UX):**

- **Métricas Clave (KPIs):** Tarjetas superiores (_Widgets_) mostrando datos en tiempo real: Total de cabezas, Mortalidad acumulada (%), y Ganancia Diaria de Peso (GDP) promedio.

- **Gráficos Visuales:** Gráfico de torta (Stock por Categoría) y Gráfico de barras (Evolución de pesajes mensuales). Filtros rápidos para ver datos "Por Lote" o "Global".

- **Panel de Tareas (To-Do List):** Una sección de listas dinámicas mostrando "Tareas Pendientes", "En Progreso" y "Completadas".

**Historias de Usuario / Requerimientos Funcionales:**

1. **Visualización de KPIs:** Como usuario administrador, quiero ver indicadores de rendimiento globales y gráficos segmentables (por lote o general) para evaluar la salud productiva del negocio de un vistazo.

2. **CRUD de Tareas (Task Management):** Como usuario, debo poder crear, editar, eliminar y marcar como completadas las "Tareas" del campo (Ej. "Arreglar alambre potrero 4", "Comprar vacuna aftosa").

3. **Asignación y Plazos:** Como usuario, al crear una tarea, debo poder asignarle una fecha límite (`due_date`) y un nivel de prioridad (Alta/Media/Baja).

---

## Tab 2: Gestión Financiera

Esta pestaña actúa como el libro contable de la aplicación. Permite auditar la rentabilidad, categorizar los gastos y proyectar balances.

**Estrategia de Diseño (UI/UX):**

- **Balance Mensual:** Un gráfico principal (Líneas o Barras superpuestas) comparando Ingresos vs. Egresos de los últimos 6 a 12 meses.

- **Historial Transaccional:** Una lista cronológica de movimientos. Los ingresos en verde (Ej. `+ $5.000.000`), los egresos en rojo (Ej. `- $120.000`).

- **Botonera Rápida (FAB):** Un botón flotante grande con dos opciones rápidas: "Nuevo Ingreso" y "Nuevo Gasto".

**Historias de Usuario / Requerimientos Funcionales:**

1. **CRUD de Movimientos Financieros:** Como usuario, debo poder registrar un nuevo movimiento especificando: Monto, Fecha, Tipo (Ingreso/Egreso), Categoría, y un concepto/nota (Ej. "Venta de 10 novillos gordos").

2. **CRUD de Categorías Financieras:** Como usuario, debo poder administrar (ABM) las categorías de mis transacciones (Ej. Gastos: _Sanidad, Nutrición, Sueldos, Combustible_. Ingresos: _Venta de Hacienda, Venta de fardos_).

3. **Filtros y Búsqueda:** Como usuario, debo poder filtrar el historial de movimientos por rango de fechas y por categoría para analizar en qué se está gastando el dinero.

4. **Generación de Reportes:** Como usuario, quiero un botón para "Exportar Reporte" que me genere un resumen estructurado (idealmente PDF o CSV exportable) basado en los filtros aplicados.

---

## 🗄️ Impacto en Base de Datos (WatermelonDB Schemas)

Para soportar estas funcionalidades offline, necesitamos agregar estas tablas al modelo de datos:

### Tabla: `tasks` (Gestión de Tareas)

- `title` (string): Título de la tarea.

- `description` (string, opcional): Detalles.

- `due_date` (number/timestamp): Fecha límite.

- `status` (string): Ej. 'PENDING', 'IN_PROGRESS', 'COMPLETED'.

- `priority` (string): Ej. 'HIGH', 'MEDIUM', 'LOW'.

### Tabla: `financial_categories` (Categorías de movimientos)

- `name` (string): Ej. 'Sanidad', 'Venta Hacienda'.

- `type` (string): 'INCOME' (Ingreso) o 'EXPENSE' (Egreso).

- `color` (string, opcional): Para pintar los gráficos (Ej. '#FF0000').

### Tabla: `financial_transactions` (Libro Mayor)

- `amount` (number): Valor monetario.

- `transaction_date` (number/timestamp): Cuándo ocurrió.

- `type` (string): 'INCOME' o 'EXPENSE'.

- `category_id` (string - FK): Relación con la tabla de categorías.

- `concept` (string): Descripción breve del movimiento

---

# Módulo de Hacienda e Inventario

**Objetivo del Módulo:** Es el "padrón" de la aplicación. Centraliza la visión individual y grupal del activo biológico del establecimiento, permitiendo búsquedas rápidas, bajas y categorizaciones.

## Tab 1: Lista Maestra de Animales
**Estrategia de Diseño (UI/UX):**
- **Lista Virtualizada:** Un listado (`FlatList`) extremadamente optimizado. Cada fila debe mostrar: Caravana Visual, RFID, Lote actual y un semáforo de estado (Verde=Sano, Rojo=En Carencia/Enfermo).
- **Filtros Rápidos:** Botones horizontales tipo "chips" para filtrar por Categoría (Vaca, Toro, Ternero), Estado Reproductivo (Preñada, Vacía) o Lote.
- **Bottom Sheet de Detalle:** Al tocar un animal, no se cambia de pantalla. Se levanta un panel inferior (Bottom Sheet) con su ficha técnica: Último peso, último tacto, historial de potreros y botones de acción rápida (Editar, Dar de Baja, Cambiar Lote).

**Historias de Usuario / Requerimientos Funcionales:**
1. **CRUD Animal:** Como usuario, debo poder dar de alta un animal, editar sus atributos y registrar bajas (muertes/ventas con motivo obligatorio).
2. **Acciones Masivas (Bacheo):** Como usuario, debo poder seleccionar múltiples animales de la lista (checkboxes) y aplicar una acción masiva (Ej: Mover de lote o aplicar sanidad grupal).

---

# Módulo de Manga (Escaneo Rápido)

**Objetivo del Módulo:** Es el "Campo de Batalla". Su diseño debe estar enfocado en la velocidad extrema, uso con una sola mano, alto contraste para el sol y cero bloqueos.

## Pantalla Única: Modo Escaneo Continuo
**Estrategia de Diseño (UI/UX):**
- **Input Gigante y Auto-focus:** El campo de lectura RFID/Caravana debe ocupar un tercio de la pantalla y recuperar el foco automáticamente tras cada lectura.
- **Feedback Sensorial:** Cada vez que se registra una acción, la pantalla debe destellar (Verde=OK, Rojo=Error) y el teléfono debe vibrar para que el peón no tenga que mirar la pantalla.
- **Queue Local:** Si se escanean 50 vacas rápido, la UI no debe bloquearse. Se procesan usando `database.batch()` por debajo.
- **Panel de Acción Rápida (Action Sheet):** Al escanear un animal individual, salta un panel rápido con 4 botones gigantes: [PESAR], [TACTO], [SANIDAD], [MOVER].

**Historias de Usuario / Requerimientos Funcionales:**
1. **Pre-configuración Masiva (Atajos):** Como veterinario, quiero poder configurar la manga en "Modo Vacunación Aftosa". Así, todo animal que escanee a continuación recibe el evento automáticamente sin preguntar nada.
2. **Conexión Externa:** Como usuario, necesito que la app capture los RFIDs inyectados por un bastón Bluetooth conectado como teclado externo.

---

# Módulo de Reproducción y Genética

**Objetivo del Módulo:** Maximizar la tasa de procreo del campo gestionando tactos, ecografías y cronogramas de IATF.

## Tab 1: Registro de Tactos y Servicios
**Estrategia de Diseño (UI/UX):**
- **Formulario Dinámico:** Si selecciono "Servicio IA", debe desplegar campos para el "Toro (Pajuela)". Si selecciono "Tacto", debe preguntar "Resultado" (Preñada/Vacía).
- **Calculadora de Parto:** Al marcar una vaca como "Preñada", la UI debe mostrar inmediatamente la Fecha Probable de Parto (FPP) estimada.

**Historias de Usuario / Requerimientos Funcionales:**
1. **Registro Reproductivo:** Como veterinario, debo poder registrar tactos y servicios, y que el sistema actualice automáticamente el campo `repro_status` de la vaca.
2. **Detección de Anomalías:** Como usuario, el sistema debe alertarme y frenarme si intento dar servicio a una vaca que ya figura como "PREÑADA" o si no cumplió el puerperio posparto.
