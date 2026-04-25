# 📜 GanPro (V3 Enterprise) - Reglas de Negocio y Restricciones (Hard Rules)

Este documento centraliza los **invariantes del dominio**, es decir, las leyes absolutas de negocio que la aplicación debe validar y proteger en todo momento. Estas reglas nacen de cruzar la necesidad operativa (veterinario) con la necesidad de negocio (dueño) y las limitaciones técnicas (ingeniería).

Toda validación descrita aquí debe implementarse tanto en la interfaz visual (UI/UX) como a nivel de Servicios y Transacciones en WatermelonDB.

---

## 💊 1. Sanidad, Bioseguridad y Legalidad
La prioridad aquí es evitar multas del SENASA y decomisos en frigoríficos, así como mantener un rodeo sano.

- **[RN-01] Bloqueo Fuerte por Carencia:** Si la fecha actual es menor a la `fecha_fin_carencia` del último `operation_log` de un animal (o del lote), la opción de cambiar el estado de ese animal a `VENDIDO` queda **estrictamente bloqueada**. La UI debe mostrar un escudo rojo y deshabilitar botones de venta o egreso.
- **[RN-02] Stock Farmacológico:** Cada vez que se registra una vacunación en la manga (`operation_logs`), se debe disparar automáticamente un `inventory_movements` de tipo `EGRESO` para descontar las dosis usadas del Vademécum.
- **[RN-03] Re-vacunación:** Ciertas vacunas (Ej. Aftosa) vencen al año. El sistema debe calcular la fecha de vencimiento al aplicarlas y crear un registro `PENDIENTE` en `scheduled_operations` para alertar 15 días antes.

---

## 🐄 2. Inventario, Stock y Movimientos
La prioridad aquí es la trazabilidad auditable (que el campo sea un espejo de lo declarado en el Estado).

- **[RN-04] Inmutabilidad de Stock (Event Sourcing):** Queda **prohibido** que un usuario pueda editar a mano un campo "cantidad de animales" en un lote o potrero. El stock es siempre el resultado de la suma de animales que tienen asignado ese `potrero_id`.
- **[RN-05] Auditoría de Mortandad:** Un animal **no puede** cambiar su estado a `MUERTO` (ni siquiera con un *swipe* rápido) si la transacción no va acompañada obligatoriamente de la creación de un `death_logs`. Si no hay causa de muerte ingresada, no se guarda el estado.
- **[RN-06] Consistencia de Movimientos:** Si un animal cambia de `potrero_A` a `potrero_B`, el `animal_movements` debe registrar exactamente la fecha y el origen/destino. Un animal no puede aparecer en el Potrero B sin salir del A.

---

## 🤰 3. Reproducción e Inseminación (IATF)
La prioridad es respetar la fisiología biológica del animal para no ensuciar las estadísticas.

- **[RN-07] Máquina de Estados Reproductivos (Bloqueo Lógico):** 
  - Si una vaca tiene `repro_status` = `PREÑADA`, el sistema debe **ocultar o bloquear** la opción de registrar un nuevo "Servicio (IA o Natural)".
  - Para volver a estar apta para un servicio, debe registrarse primero un evento que libere el estado: `PARTO` o `ABORTO` (pasando a `VACÍA`).
- **[RN-08] Respeto del Puerperio (Días Abiertos):** Tras un `PARTO`, la vaca entra en un período de recuperación uterina (Puerperio, aprox. 40 días). El sistema debe lanzar un *Warning* amarillo si el usuario intenta agendar un protocolo IATF antes de este plazo biológico.
- **[RN-09] Paternidad Segura:** Si se registra nacimiento (`animal_genealogy`), el `padre_id` solo puede asignarse a un animal macho (Toro) o a un `lote_servicio_id` activo nueve meses atrás.

---

## ⚖️ 4. Crecimiento y Pesajes (Nutrición)
La prioridad es proveer información verídica para decidir suplementaciones o ventas.

- **[RN-10] Matemática Aislada del GDP:** La Ganancia Diaria de Peso de un lote **jamás** se calcula restando el animal más pesado contra el más liviano. La fórmula obligatoria es: `(Peso Actual - Peso Anterior) / Días Transcurridos` calculado **vaca por vaca**. Luego, esos valores individuales se promedian para dar el GDP del lote.
- **[RN-11] Alerta de Pérdida de Peso (Bandera Roja):** Si un pesaje nuevo es **inferior** al `last_weight_kg` en más de un 5%, el sistema frena el guardado y exige confirmación (Alerta de posible enfermedad o error de balanza).
- **[RN-12] Densidad de Carga:** Al mover un lote a un potrero, si la cantidad de cabezas supera la `densidad_carga_objetivo` o los kilos de Materia Seca disponibles (`biomass_history`), la UI advierte sobre-pastoreo, aunque permite continuar bajo riesgo del productor.

---

## 💰 5. Finanzas y Centro de Costos
La prioridad es calcular el Costo por Kilo Producido real.

- **[RN-13] Integridad Monetaria:** Ningún movimiento financiero, compra de ración o vacuna puede guardarse sin un valor explícito en el campo `moneda` (USD o ARS) y su `tipo_cambio` congelado al momento del guardado.
- **[RN-14] Prorrateo de Centro de Costos:** Los gastos operativos directos (Ej. Comprar vacuna o ración) deben forzar al usuario a asignarlos a un Centro de Costo (un `lote_id` o `potrero_id`). Si el gasto es general (Ej. Gasoil), se dejará nulo y el sistema lo prorrateará entre todos los animales activos para el balance mensual.
