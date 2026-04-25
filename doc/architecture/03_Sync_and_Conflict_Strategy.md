# Estrategia de Sincronización y Resolución de Conflictos

GanPro V3 es un **Vertical ERP Offline-First**. Esto significa que múltiples peones y administradores pueden estar operando en el campo sin internet durante días, y luego sincronizar sus bases de datos contra un backend central.

La estrategia ingenua de *Last Write Wins (LWW)* o "El último que guarda pisa lo anterior" es **destructiva** para el negocio. Si el Peón A pesa a la vaca, y el Peón B le aplica una vacuna, y sincronizan con LWW a nivel de entidad, uno de los dos eventos se pierde.

## 🆔 1. Estrategia de Identidad Global (UUIDv7)

- **Prohibido usar IDs Autonuméricos o RFIDs como Primary Key.**
- **Estándar:** Se utilizará **UUIDv7**.
  - *¿Por qué v7?* Porque a diferencia del v4 (random), el v7 incluye un *timestamp* en sus primeros bits. Esto permite que los registros generados offline mantengan un orden cronológico real y sean eficientes para la indexación de SQLite/PostgreSQL.
- **Inmutabilidad:** El UUID es interno. El RFID, Caravana Visual o DTe son propiedades mutables de búsqueda, pero no rigen la identidad relacional del registro.

---

## ⚔️ 2. Estrategia Híbrida de Resolución de Conflictos

En lugar de aplicar una regla global, la estrategia de resolución de conflictos depende del tipo de dato (Entity-based Conflict Strategy).

### A. Estrategia "Append-Only" (Eventos Inmutables)
Aplica para todos los registros transaccionales que representan algo que "ya pasó en la realidad".
- **Entidades:** `animal_weights`, `operation_logs`, `animal_movements`, `death_logs`, `inventory_movements`, `movimientos_financieros`.
- **Regla:** Estos registros **no se modifican**, solo se insertan. Si un peón se equivocó al pesar una vaca, no "edita" el peso anterior; inserta un nuevo registro de corrección (o un evento compensatorio). 
- **Conflicto:** Imposible. Al ser solo inserciones con UUID único, cuando la app se conecta a internet, simplemente manda todos los nuevos eventos al backend.

### B. Estrategia "State Machine Validation" (Validación de Estados)
Aplica para atributos de los Agregados que siguen reglas estrictas.
- **Entidades:** El estado reproductivo (`repro_status`) de un animal.
- **Regla:** Se basa en *CRDTs (Conflict-free Replicated Data Types)* semánticos o validación central.
- **Ejemplo de Conflicto:** 
  - Vaca X estaba VACÍA.
  - Offline, Usuario A registra tacto: PREÑADA.
  - Offline, Usuario B registra servicio: EN_SERVICIO.
- **Resolución Backend:** El backend evalúa la marca de tiempo (timestamp real del evento) y las reglas de transición. Si el tacto fue el 15/Oct y el servicio el 10/Oct, el estado final es PREÑADA. La base local del Usuario B es sobreescrita (pull) con la verdad del servidor al recuperar la conexión.

### C. Estrategia "LWW de Campo a Nivel Columna" (Field-Level Last Write Wins)
Aplica para la metadata pura y descriptiva.
- **Entidades:** Atributos del animal (`color_caravana`, `raza`, `notas` del potrero).
- **Regla:** Si dos usuarios cambian el color de la caravana estando offline, aquí sí aplica LWW. El último timestamp de modificación de esa **columna específica** (no de la fila entera) gana. Para WatermelonDB, esto puede manejarse guardando timestamps de actualización a nivel de registro o delegando la fusión (merge) al backend.

---

## 🛰️ 3. Evolución del Sync Engine (Roadmap)

Actualmente la app utiliza el motor de sincronización de WatermelonDB (Pull/Push model). 

**Limitaciones Detectadas para Enterprise:**
- WatermelonDB envía los objetos finales, no las "intenciones" o eventos, dificultando el Event Sourcing estricto en el backend.

**Fase Actual:**
- Optimizar el Pull/Push de Watermelon limitando el payload con timestamps estrictos (`updated_at` indexado).
- Procesar los conflictos a nivel de Backend, forzando a los clientes a actualizar sus Read Models locales en el siguiente Pull.

**Fase Futura (Evaluación Arquitectónica):**
Para escalar a integraciones GIS avanzadas y telemetría, se recomienda tener en el radar migrar la capa de sync a **PowerSync** o **ElectricSQL** junto con SQLite local crudo (vía Drizzle ORM o Kysely), permitiendo streaming bidireccional reactivo directo desde PostgreSQL, evitando cuellos de botella en la serialización REST del sync de Watermelon.
