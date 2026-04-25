# Bounded Contexts y Arquitectura de Dominio (GanPro V3)

Este documento define las fronteras lógicas del sistema utilizando los principios de **Domain-Driven Design (DDD)**. Evitamos el modelo de "tablas sueltas" y agrupamos la lógica en contextos altamente cohesivos y débilmente acoplados.

## 🗺️ Mapa de Contextos

### 1. CORE DOMAIN (El corazón del negocio)
Son los contextos que le dan la ventaja competitiva a GanPro y donde la lógica es más compleja.

#### A. Contexto de Inventario y Activo Biológico
- **Responsabilidad:** Conocer qué animales existen, dónde están y en qué estado (Vivo, Muerto, Vendido). Es la única fuente de verdad sobre la identidad del animal.
- **Identidad:** Utiliza **UUIDv7** (generado offline, ordenable temporalmente) como Clave Primaria inmutable. El RFID o la caravana visual son simples *alias* mutables.
- **Agregados Principales:** `Animal`, `Lote`.
- **Comunicación:** Publica eventos cuando un animal nace, muere o se mueve.

#### B. Contexto de Reproducción (Genética y Procreo)
- **Responsabilidad:** Gestionar la máquina de estados reproductivos de los vientres (Vacía -> En Servicio -> Preñada -> Parto). Gestionar la genealogía y el árbol de paternidad.
- **Agregados Principales:** `CicloReproductivo`, `ProtocoloIATF` (Workflow Engine).
- **Consumo:** Escucha al inventario (si un animal muere, el ciclo reproductivo se archiva).

#### C. Contexto de Nutrición y Recurso Forrajero
- **Responsabilidad:** Manejar la oferta forrajera (Potreros, GIS) y la demanda nutricional (Dietas, Suplementación). Evalúa el límite fisiológico (Carga animal máxima).
- **Agregados Principales:** `Potrero` (Polígono GIS), `Racion`, `Biomasa`.

---

### 2. SUPPORTING SUBDOMAINS (Soporte Operativo)
Contextos necesarios para la operativa, pero que acompañan al Core.

#### D. Contexto de Sanidad y Vademécum
- **Responsabilidad:** Control de inventario farmacológico, aplicación de tratamientos, registro de enfermedades y control de carencias legales.
- **Agregados Principales:** `Tratamiento`, `StockFarmacologico`, `Carencia`.
- **Regla Crítica:** Es el dueño de la regla de "Bloqueo por Carencia".

#### E. Contexto de Operaciones en Manga (Execution Context)
- **Responsabilidad:** Absorber ráfagas de alta frecuencia de datos offline (Lecturas RFID continuas). Es un "Buffer" transaccional. Su diseño está optimizado para ráfagas (Batch) y no para validaciones pesadas inmediatas.
- **Agregados Principales:** `SesionManga`, `LecturaRFID`.

---

### 3. GENERIC SUBDOMAINS (Infraestructura y Finanzas)

#### F. Contexto Financiero y Contable
- **Responsabilidad:** Asignación de centros de costos, libro de caja, cálculo de costo por kilo y márgenes brutos.
- **Consumo:** Es altamente reactivo. Escucha cuando se vacuna a un animal (para debitar el costo del Vademécum) o cuando se entrega ración en un potrero (para debitar el costo de la nutrición).

#### G. Contexto de Proyecciones (Read Models / Analytics)
- **Responsabilidad:** Proveer datos instantáneos al Dashboard y reportes sin colapsar el sistema transaccional.
- **Implementación:** Tablas materializadas (`dashboard_metrics`, `potrero_stats`) construidas asíncronamente escuchando el bus de eventos de los otros contextos.

---

## 🔄 Relaciones entre Contextos (Context Map)

- **Inventario -> Reproducción:** Relación *Upstream-Downstream*. La reproducción no puede existir sin el inventario. Si el inventario dicta que es "Macho", el contexto reproductivo lo rechaza como vientre.
- **Sanidad -> Inventario:** *Customer-Supplier*. Sanidad puede bloquear movimientos en Inventario si hay carencia (requiere validación asíncrona o un ACL - Anti-Corruption Layer).
- **Manga -> Todos:** *Event Publisher*. La manga solo captura la realidad física (Lectura RFID, acción) y publica comandos (`AplicarTratamientoCommand`, `RegistrarPesajeCommand`) que los servicios de aplicación procesan en Batch.
