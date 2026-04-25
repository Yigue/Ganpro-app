# 🗄️ GanPro Database Blueprint (V3 Enterprise)

Este documento define la arquitectura definitiva de la base de datos de GanPro (WatermelonDB). 
Se aplica **Screaming Architecture**: los dominios de negocio están separados (no más tablas genéricas de "eventos") y se desnormalizan campos clave para rendimiento offline extremo.

---

## 🐄 1. Hacienda e Inventario (Activo Biológico)

### `establecimientos` (NUEVO)
Soporte para productores con múltiples campos.
- **Campos Clave:** `nombre`, `ubicacion`, `hectareas_totales`, `renspa`.

### `animals` (Tabla Maestra)
Representa la unidad productiva. Altamente optimizada para renderizado rápido en listas.
- **Campos Clave:** `id_caravana`, `rfid` (Unique Index), `sexo`, `categoria`, `raza`, `color_caravana`, `fecha_nacimiento`, `procedencia`.
- **Desnormalizados (V3):** `last_weight_kg`, `last_weight_date`, `repro_status` (VACÍA, PREÑADA, EN_SERVICIO). Evitan joins pesados.
- **Estado:** `estado` (ACTIVO, VENDIDO, MUERTO).
- **Relaciones (belongs_to):** `establecimiento_id`, `lote_id`, `potrero_id`.
- **Relaciones (has_many):** `animal_weights`, `reproduction_logs`, `operation_logs`, `animal_movements`, `death_logs`.

### `lotes`
Agrupaciones lógicas/contables de animales.
- **Campos Clave:** `nombre`, `descripcion`, `objetivo` (CRÍA, RECRÍA, ENGORDE), `densidad_carga_objetivo`.
- **Relaciones (has_many):** `animals`, `lote_movements`, `movimientos_financieros`, `operation_logs`.
- **Relaciones (belongs_to):** `establecimiento_id`.

### `potreros`
Recurso físico (tierra).
- **Campos Clave:** `nombre`, `hectareas`, `recurso_forrajero`, `geo_json` (GIS).
- **Relaciones (has_many):** `animals`, `animal_movements`, `lote_movements`, `potrero_feeding_logs`, `biomass_history`, `movimientos_financieros`.
- **Relaciones (belongs_to):** `establecimiento_id`.

---

## 🗺️ 2. Movimientos y Trazabilidad

### `animal_movements`
Historial de rotación individual.
- **Campos Clave:** `fecha`, `motivo` (ROTACIÓN, DESTETE, VENTA), `dte_numero` (Guía/DTA opcional).
- **Relaciones:** `animal_id`, `potrero_origen_id`, `potrero_destino_id`, `lote_origen_id`, `lote_destino_id`.

### `lote_movements` (NUEVO)
Para cuando el productor mueve la tropa entera de un potrero a otro.
- **Campos Clave:** `fecha`, `motivo`, `dte_numero` (Guía/DTA opcional).
- **Relaciones:** `lote_id`, `potrero_origen_id`, `potrero_destino_id`.

---

## ⚖️ 3. Crecimiento y Pesajes

### `animal_weights`
Reemplaza los "eventos" genéricos para tener métricas precisas de GDP (Ganancia Diaria).
- **Campos Clave:** `peso_kg`, `fecha`, `condicion_corporal` (1.0 - 5.0), `metodo` (BALANZA, ESTIMADO, CINTA).
- **Relaciones:** `animal_id`.

### `batch_cc_audits` (NUEVO)
Auditorías visuales de Condición Corporal a nivel grupal (reemplaza la tabla `condicion_corporal` suelta).
- **Campos Clave:** `fecha`, `score_promedio` (1.0 - 5.0), `notas`.
- **Relaciones:** `lote_id`, `potrero_id` (Opcionales, depende de qué se auditó).

---

## 🤰 4. Reproducción y Genética

### `reproduction_logs`
Trazabilidad de preñez y tactos.
- **Campos Clave:** `fecha_evento`, `tipo_evento` (TACTO, ECOGRAFIA, PARTO, ABORTO, SERVICIO_IA, SERVICIO_NATURAL), `resultado` (PREÑADA, VACÍA, DUDOSA), `dias_gestacion_estimados`.
- **Relaciones:** `animal_id` (Hembra), `toro_id` (FK a animal macho, opcional), `iatf_protocol_id` (opcional).

### `iatf_protocols` (NUEVO)
Configuración de protocolos de sincronización de celo (Inseminación Artificial).
- **Campos Clave:** `nombre`, `descripcion`, `steps_json` (Cronograma de días y hormonas), `estado` (ACTIVO, ARCHIVADO).

### `animal_genealogy` (Módulo Opcional)
Módulo exclusivo para Cabañas o Cría de Precisión. La mayoría de los establecimientos comerciales no lo usarán.
- **Campos Clave:** `observaciones`.
- **Relaciones (Opcionales / Nullables):** `animal_id`, `madre_id`, `padre_id` (Toro individual), `lote_servicio_id` (Lote de toros, cuando no hay paternidad exacta).

---

## 🏥 5. Sanidad y Bioseguridad

### `operations_catalog` (Vademécum)
Catálogo de insumos (Vacunas, Antibióticos).
- **Campos Clave:** `nombre`, `tipo`, `dias_carencia`, `presentacion_dosis`.

### `inventory_movements` (NUEVO - Event Sourcing)
Única forma segura de manejar stock offline. No se guarda el "stock actual", se suman los ingresos y egresos.
- **Campos Clave:** `tipo_movimiento` (INGRESO, EGRESO, AJUSTE, VENCIMIENTO), `cantidad`, `costo_total`, `lote_serie`, `fecha_vencimiento`, `fecha_movimiento`.
- **Relaciones:** `operation_id`.

### `operation_logs`
Aplicaciones reales en la manga.
- **Campos Clave:** `fecha_aplicacion`, `fecha_fin_carencia` (Calculada), `dosis_aplicada`, `costo_aplicado` (Snapshot), `tipo_operacion` (Desnormalizado para filtros rápidos).
- **Relaciones:** `animal_id`, `lote_id`, `operation_id`.

### `scheduled_operations` (NUEVO)
Agenda de sanidad, vacunaciones futuras y pasos de protocolos IATF.
- **Campos Clave:** `fecha_programada`, `estado` (PENDIENTE, COMPLETADO, CANCELADO).
- **Relaciones:** `operation_id`, `lote_id`, `animal_id` (Opcional), `iatf_protocol_id` (Opcional).

### `health_diagnostics` (NUEVO)
Registro de enfermedades o patologías clínicas observadas.
- **Campos Clave:** `fecha_diagnostico`, `enfermedad`, `sintomas`, `gravedad` (LEVE, MODERADA, GRAVE), `estado` (CURADO, TRATAMIENTO, CRONICO).
- **Relaciones:** `animal_id`.

### `death_logs`
- **Campos Clave:** `fecha`, `causa_muerte` (ENFERMEDAD, CLIMA, PARTO, DESCONOCIDA), `notas_necropsia`.
- **Relaciones:** `animal_id`.

---

## 🌽 6. Nutrición y Pasturas

### `suplementos`
- **Campos Clave:** `nombre`, `tipo`, `materia_seca_pct`, `proteina_bruta_pct`, `energia_mcal_kg`.

### `raciones` & `racion_ingredientes` (N:N)
- **Raciones:** `nombre`, `activa`, `costo_estimado_kg`, `moneda` (USD/ARS).
- **Ingredientes:** `porcentaje`, `cantidad_kg_por_tonelada`.
- **Relaciones:** `racion_id`, `suplemento_id`.

### `potrero_feeding_logs`
Entregas de ración en el campo.
- **Campos Clave:** `cantidad_kg_tal_cual`, `fecha`, `costo_estimado`.
- **Relaciones:** `potrero_id`, `racion_id`.

### `biomass_history` (NUEVO)
Seguimiento de disponibilidad de pasto.
- **Campos Clave:** `fecha`, `kg_ms_ha` (Kg Materia Seca x Hectárea), `altura_cm`, `metodo` (CORTE, REGLA, SATELITE).
- **Relaciones:** `potrero_id`.

---

## 💰 7. Economía e Indicadores

### `movimientos_financieros`
Libro de caja. **Ahora soporta centros de costo múltiples.**
- **Campos Clave:** `monto`, `moneda` (USD/ARS), `tipo_cambio`, `tipo` (INGRESO, GASTO), `fecha`, `forma_pago`, `estado_pago`.
- **Relaciones de Centro de Costo (Opcionales):** `animal_id`, `lote_id`, `potrero_id` (ej. Fertilizante), `maquinaria_id` (ej. Gasoil).
- **Relaciones:** `category_id` (FK a financial_categories).

### `financial_categories`
- **Campos Clave:** `name`, `type` (INCOME, EXPENSE), `color`.

### `market_prices`
Para valuar el stock ganadero dinámicamente.
- **Campos Clave:** `categoria`, `precio_promedio_kg`, `moneda`, `fecha`, `fuente`.

---

## ⚙️ 8. Sistema y Meta

### `sync_logs`
- **Campos Clave:** `entity_type`, `entity_id`, `action`, `synced`, `timestamp`.

### `tasks`
- **Campos Clave:** `title`, `description`, `due_date`, `status`, `priority`.

---

## 🏗️ Notas de Ingeniería (Hard Rules)
1. **Borrado Lógico:** No agregar `deleted_at`. WatermelonDB utiliza su columna nativa `_status` = 'deleted' internamente para el sync.
2. **Auditoría:** Todos los logs incluyen `created_by_id` y `device_id` para saber quién ejecutó la acción.
3. **Manejo de Stock:** El stock SIEMPRE se calcula sumando `inventory_movements`. Prohibido usar campos escalares mutables para stock (causa colisiones offline).
