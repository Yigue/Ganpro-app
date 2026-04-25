# Análisis de Deuda Técnica y Evolución (GanPro V3)

## 🐄 Módulo 1: Hacienda e Inventario

### Funciones que faltan

- **Multiestablecimiento:** Falta poder gestionar múltiples campos. Falta `establecimiento_id` en las tablas maestras (`lotes`, `potreros`).
- **Estados Cíclicos Avanzados:** Faltan sub-estados (ej. "Enfermo", "En Cuarentena") además del `estado` base (ACTIVO, VENDIDO).

### Arquitectura o cosas que veo mal

- **Densidad de carga en Lotes vs Potreros:** La densidad real de carga (cabezas por hectárea) es un atributo del Potrero físico. Hay que asegurar que los cálculos crucen área del potrero con la cantidad de cabezas.

### Posibles mejoras

- Dashboard de Stock Dinámico sin joins.

## 🗺️ Módulo 2: Movimientos y Trazabilidad

### Funciones que faltan

- **Guías de Traslado / DTE:** Falta vincular los movimientos externos con el número de DTE oficial de SENASA. (Ya agregado al schema V3).

### Arquitectura o cosas que veo mal

- **Cuellos de Botella en Movimientos Masivos:** Mover 500 animales genera 500 inserts en `animal_movements`. Debe usarse `database.batch()`.

### Posibles mejoras

- Geolocalización automática en `lote_movements` (GPS del teléfono).

## ⚖️ Módulo 3: Crecimiento y Pesajes

### Funciones que faltan

- **Registro de Taras/Desbaste:** Los pesajes requieren un % de desbaste por estrés de transporte.

### Arquitectura o cosas que veo mal

- **Cálculo de GDP (Ganancia Diaria):** Debería ser un campo calculado automáticamente al insertar un pesaje, en lugar de recalcularlo al vuelo leyendo todo el historial.

### Posibles mejoras

- Conexión Bluetooth nativa con balanzas (Tru-Test, Gallagher).

## 🤰 Módulo 4: Reproducción y Genética

### Funciones que faltan

- **Alertas Automatizadas:** Faltan alertas offline para "Vacas próximas a parir".

### Arquitectura o cosas que veo mal

- **Validación de Estados:** Faltan reglas de negocio estrictas. Una vaca PREÑADA no puede recibir evento de SERVICIO_NATURAL sin antes tener un PARTO/ABORTO.

### Posibles mejoras

- Motor de Tareas para protocolos IATF ("Hoy toca prostaglandina").

## 🏥 Módulo 5: Sanidad y Bioseguridad

### Funciones que faltan

- **Bloqueos por Carencia:** Prohibir explícitamente mover a VENDIDO animales en carencia.

### Arquitectura o cosas que veo mal

- **Event Sourcing en Inventario:** La UI actual no soporta `inventory_movements`. Las vistas deben modificarse para inyectar movimientos (+ o -) en lugar de editar stock fijo.

### Posibles mejoras

- Lector de código de barras para cajas de medicamentos.

## 🌽 Módulo 6: Nutrición y Pasturas

### Funciones que faltan

- **Costeo Dinámico de Ración:** Snapshot de costo al entregar comida.

### Arquitectura o cosas que veo mal

- `potrero_feeding_logs` asume que el alimento va al pasto. Debe aceptar `lote_id` o `potrero_id` indistintamente.

### Posibles mejoras

- Integración satelital (NDVI) para popular `biomass_history` automáticamente.

## 💰 Módulo 7: Economía e Indicadores

### Funciones que faltan

- **Multimoneda:** Manejo de USD vs ARS. Falta tipo de cambio.

### Arquitectura o cosas que veo mal

- **Monto sin Moneda:** Un `monto` numérico sin `currency` no sirve en contextos inflacionarios.

### Posibles mejoras

- P&L (Profit and Loss) automatizado por Lote.

## ⚙️ Módulo 8: Infraestructura

### Funciones que faltan

- **Roles y Permisos Offline:** Ocultar el módulo de Economía a usuarios tipo "Peón".

### Arquitectura o cosas que veo mal

- **Purga de Logs:** La tabla de `sync_logs` va a crecer infinitamente. Se necesita un cron job local de purga.

### Posibles mejoras

- OTA updates mediante Expo EAS.

## 📲 Módulo 9: Manga y Escaneo (Scan)

### Funciones que faltan

- **Condición Corporal y Método:** En el V3 Schema definimos `condicion_corporal` y `metodo` (balanza/cinta) para los pesajes, pero el formulario `EventActionSheet` solo pide el "Peso (kg)".
- **Trazabilidad DTE (Cargado en DB):** El formulario de "Cambio de Lote" pide DTE/DTA (excelente), pero recién ahora se lo agregamos a `animal_movements` en el schema.

### Arquitectura o cosas que veo mal

- ~~**[CRÍTICO] Desfasaje Código-Esquema:** `EventActionSheet` sigue usando el viejo `EventoRepository` para insertar tactos y pesajes en la tabla genérica `eventos`. Hay que migrar esto urgente a `animal_weights` y `reproduction_logs`.~~ **[RESUELTO - Fase 3]**
- ~~**Lógica de Negocio Filtrada a la Vista:** En `EventActionSheet`, al cambiar de lote, se recalcula la `densidadCarga` de dos lotes directamente en el componente React. Esto es un anti-patrón enorme. Esa transacción debe ir en `animalRepo.transferToLote()`.~~ **[RESUELTO - Movido a AnimalMovementService]**
- ~~**Bulk Inserts Ineficientes:** En `BulkRegistrationSheet`, se hace un `Promise.all` con `animalsCollection.create(...)`. Para 50+ animales, esto es pesado. WatermelonDB exige usar `database.batch()` pasando un array de prepares para inserciones masivas reales sin bloquear el puente React Native.~~ **[RESUELTO - Fase 3]**

### Posibles mejoras

- **Conexión de Bastón Inteligente:** Detectar por Bluetooth un bastón RFID externo (Allflex) para cargar el bacheo automáticamente.
- **Atajos de Manga:** Modo "Súper Rápido" donde preconfigurás una acción masiva ("Aplicar Vacuna X a todos") y al escanear, el evento se guarda sin requerir abrir el `EventActionSheet` vaca por vaca.

## 🌾 Módulo 10: Potreros y Nutrición (UI)

### Funciones que faltan

- **Formulario de Alimentación Real:** El botón "Suplementar este Potrero" es un *dummy* (solo tira un Alert). Falta el formulario que realmente inserte en `potrero_feeding_logs` pidiendo la cantidad de kilos entregados.
- **Formulario de Alta/Edición:** El botón "Editar" potrero es otro *dummy*. No hay forma en la UI de crear un potrero nuevo o cambiarle las hectáreas.
- **Costo en DB, no en texto:** Al crear una mezcla (Ración), el costo estimado se está guardando como un string dentro de la `descripcion` (`Costo: $15.00/kg`). Esto impide hacer reportes financieros después. La tabla `raciones` necesita un campo numérico `costo_estimado_kg`.

### Arquitectura o cosas que veo mal

- ~~**[CRÍTICO] Conflicto de Condición Corporal:** La pestaña "C.C." consulta a una tabla llamada `condicion_corporal` (`database.get('condicion_corporal')`). En la V3 decidimos que la CC se guarda a nivel individual en `animal_weights`. Si esta tabla es para "Auditorías Visuales de Rodeo" (promedios), tiene que documentarse en el Schema (ej. `batch_cc_audits`) y relacionarse al lote/potrero. Si es individual, hay que borrarla y usar `animal_weights`.~~ **[RESUELTO - Tabla batch_cc_audits agregada en Fase 1]**
- ~~**Performance en Desglose de Categorías:** En `PotreroDetailsModal`, se traen *todos* los objetos `AnimalModel` de la DB a memoria de React para contarlos en un `useMemo` y armar el desglose por categoría. Si tenés 2000 animales en un potrero de cría, el celular se queda sin RAM. Solución: Usar consultas crudas de SQLite (`SELECT categoria, COUNT(*)`) o desnormalizar contadores en la tabla `potreros`.~~ **[RESUELTO - Fase 4 Read Models]**
- **Cálculo de Carga:** La carga animal (Cab/Ha) se calcula usando `animalsCount / potrero.hectareas`. Pero cuidado: si `hectareas` es 0 o nulo, la app va a tirar un `NaN` o `Infinity`. (Falta un fallback de seguridad matemático más allá del `> 0`).

### Posibles mejoras

- **Mapa GIS Interactivo:** En vez de una lista plana de tarjetas, usar `react-native-maps` y dibujar los polígonos (`geo_json`) de los potreros, pintándolos de rojo/verde según la densidad de carga actual para que el productor vea su campo desde arriba.
- **Gráfico Dinámico:** El gráfico de CC actual tiene datos en duro (`labels: ["Ene", "Feb"...], data: [320, 335...]`). Hay que conectarlo con las consultas observadas para que grafique la realidad.

## 📋 Módulo 11: Inventario de Hacienda (UI)

### Funciones que faltan

- **Lógica de Bacheo Real:** La barra de acciones masivas (Bulk) abajo de la pantalla de inventario tiene botones "Mover" y "Sanidad" que solo disparan un `Alert` de mentira. Falta conectarlos a `BatchActionSheet` o los ActionSheets correspondientes para afectar los IDs seleccionados.
- **Formularios de Acción Individual:** Al abrir el detalle de una vaca (Bottom Sheet), los botones "Editar", "Mover", "Pesar" y "Baja" están llamando a una función inexistente, lo que rompe la app (ver Arquitectura).

### Arquitectura o cosas que veo mal

- ~~**[CRÍTICO] App Crash por ReferenceError:** En `InventoryListInner` (línea 410), todos los botones del modal individual hacen `onPress={() => handleAction(...)}`, pero la función `handleAction` **no está definida** en ninguna parte del componente. Si el usuario toca un botón ahí, la app explota y se cierra.~~ **[RESUELTO - UI conectada a Servicios V3]**
- ~~**Datos Hardcodeados (Mock):** El peso de los animales en la lista se genera usando una función matemática inventada `getStableWeight(id)` en vez de leer el nuevo campo desnormalizado `last_weight_kg` de la V3. Lo mismo pasa con la alerta de sanidad (`hasAlert`), que se prende si el RFID termina en '2'. Estos *mocks* hay que reemplazarlos por datos reales de la BD urgente.~~ **[RESUELTO - Mocks eliminados en Fase 3]**
- ~~**Baja Rápida Incompleta:** El gesto de deslizar a la derecha hace un `animalRepo.updateEstado(animal, 'MUERTO')`. Esto cambia el estado, pero **no genera** el registro obligatorio en la tabla `death_logs` que definimos en la V3 para auditoría de mermas. Toda baja tiene que ir acompañada de su log.~~ **[RESUELTO - Delegado a AnimalMovementService.declareDeath]**

### Posibles mejoras

- **N+1 Query en Listas:** Cada fila (`AnimalListItem`) está observando a su `lote` de forma independiente. Si el usuario scrollea rápido 500 vacas, levanta 500 observables a la tabla `lotes`. Una mejora sería desnormalizar el `lote_nombre` en la tabla `animals` (ya que se lee el 90% del tiempo) para que la lista sea totalmente plana y vuele a 60 FPS sin queries anidados.

## 💊 Módulo 12: Sanidad y Vademécum (UI)

### Funciones que faltan

- **Programación IATF Real:** El modal de `ProgramacionFormModal` solo permite agendar un tratamiento por X días consecutivos (ej: Dar penicilina 3 días). No sirve para protocolos IATF que requieren saltos de días (Día 0: Dispositivo, Día 8: Retiro, Día 10: Inseminación). Hay que hacer un formulario específico para Protocolos IATF.
- **Validación Visual de Carencias:** Falta mostrar un *Badge* o banner rojo en la ficha del animal/lote cuando tienen un período de carencia activo (la fecha actual es menor a la `fecha_fin_carencia` del `operation_logs`).

### Arquitectura o cosas que veo mal

- **[CRÍTICO] Filtros Rotos por Falta de JOINs:** En la pestaña "Historial", los botones para filtrar por "Vacunas" o "Antibióticos" están rotos (funcionan como *pass-through*, devuelven todo). Esto pasa porque se está intentando filtrar el historial (`operation_logs`) en memoria JavaScript con un `useMemo`, pero el campo `tipo` vive en la tabla `operation_catalog`. Para arreglar esto, la consulta en `withObservables` tiene que usar `Q.on('operation_catalog', 'tipo', filtro)`.
- **Bloqueos de Venta (Carencias):** Un animal con carencia activa por un antiparasitario NO debe poder moverse a estado "VENDIDO" (riesgo legal para el productor). La UI actualmente no impide esto.

### Posibles mejoras

- **Notificaciones Locales (Push):** Conectar Expo Notifications para que si el peón programó una vacunación para mañana a las 8 AM, el celular le suene, ya que la base es offline.
- **Exportación de Libreta Sanitaria:** Botón para generar un reporte PDF/CSV de `operation_logs` por lote, ya que el SENASA lo pide a menudo para mover hacienda.
