# Procesos de punta a punta

Estas especificaciones describen el resultado objetivo. Los pasos pueden resolverse con capacidades existentes o nuevas; el backlog identifica las brechas.
Cada comando confirma efectos críticos en una transacción y entrega resumen/recibo. Cerrar un diálogo no cancela una operación enviada.

## P01 — Arranque y conciliación

Cargar/importar padrón, identidades, lotes/potreros, stock de insumos, caja, bancos y obligaciones abiertas.
Mostrar duplicados, genéricos, fechas/pesos desconocidos y saldos no conciliados antes de adoptar datos.
El administrador acepta un corte inicial con respaldo; no se inventan nacimientos, compras, pagos ni madres para completar campos.
Salida: línea de base explicable y pendientes de calidad con responsable. Historias FND-01/03 e INV-01.

## P02 — Alta inicial, identificación y lectura

Elegir tipo de alta y categoría; pedir sólo cantidad/identidad necesaria y ubicación conocida. Fecha de nacimiento/peso pueden ser desconocidos.
Cada cabeza recibe ficha estable, incluso sin caravana. El lector vincula primero el RFID conocido o un genérico elegido.
Una nueva identificación conserva historia y parentesco. No crear compra desde una lectura de un animal ya incorporado.
Una compra real debe registrarse como compra y luego completar su identificación por lectura. ANI-01/02 y APP-03.

## P03 — Compra de hacienda

Borrador: proveedor, fecha, categoría/cabezas o selección, kg medidos si cotiza por kg, precio y condiciones.
Separar pesada colectiva de pesos individuales; los promedios asignados conservan esa procedencia.
Confirmación: animales/eventos + documento + obligación; un pago inicial crea sólo su asiento en la cuenta elegida.
Gastos de adquisición/flete/comisión se vinculan una vez según política de costo; el tercero conserva saldo y comprobantes.
Si falla una validación no queda una compra financiera sin animales ni animales incorporados por esa operación sin su documento. OPR-01, COM-01/02, FIN-01.

## P04 — Venta y liquidación

Seleccionar por categoría/lote/identificación, todos los filtrados o cantidad de genéricos; revisar conteo por categoría y restricciones.
Capturar kg físicos, base por kg/cabeza, desbaste, precio, fecha/entrega y condiciones. Mostrar importe bruto, deducciones y saldo resultante.
Desbaste modifica kg facturados; no representa menor peso físico producido ni una muerte. Cada gasto/deducción tiene naturaleza y respaldo.
Confirmar baja, eventos, liquidación y obligación por cobrar juntos; registrar cobro total/parcial sólo con cuenta e importe explícitos.
Si un intermediario retiene gastos, registrar su compensación y liquidación; no restar importes arbitrarios del ingreso sin fuente.
No duplicar comisión como deducción de cobro y gasto otra vez. Un cobro posterior no cambia stock. COM-02, FIN-01/02.

## P05 — Traslado y pastoreo

Elegir animales/grupo, origen real y destino de lote/potrero; previsualizar las existencias afectadas.
El traslado modifica pertenencia/ubicación histórica, sin crear ingreso ni cambiar cabezas consolidadas.
Un inicio/cierre de pastoreo que genera traslado usa el mismo proceso: no pedir otro movimiento para repetirlo.
Evaluar ocupación, descanso y oferta conocida; sin medición de forraje no prometer capacidad precisa basada sólo en clima. POT-01 y NUT-01.

## P06 — Muerte, pérdida y corrección

Identificar animal o cabezas genéricas específicas, fecha y causa conocida; conservar identidad de la baja.
Registrar una sola muerte por ficha; separar aborto/pérdida reproductiva de muerte de una cría ya nacida.
No inventar un pago/gasto por la baja. Una corrección conserva el original, valida movimientos posteriores y explica su efecto.
Una venta con cobros no se elimina: revertir/ajustar conforme a vínculos, restricciones y período. OPR-01.

## P07 — Servicio, diagnóstico, parto y destete

Abrir servicio/temporada con cohorte de vientres y toros; conservar quién estuvo expuesto y sus fechas.
Registrar tacto/resultado sin convertir una preñez comprada en eficiencia propia. La pérdida mantiene su antecedente.
Parto: madre, fecha, condición de cría(s) y vínculo con servicio cuando se conoce. Cada cría viva se incorpora una vez.
El nacimiento proveniente de ese parto aparece en movimientos; no repetir un alta genérica por la misma cría.
Destete: fecha y peso observado/derivado identificado; cerrar el evento productivo y calcular índices de esa cohorte.
Admitir registros con origen desconocido y marcarlos fuera del indicador que exige esa información. REP-01/02 y ANA-02.

## P08 — Sanidad e insumos

Programar no equivale a aplicar. Al aplicar fijar destinatarios efectivos, producto/dosis, partida y fecha.
Confirmar aplicación, consumo/costo correspondiente y restricción sanitaria juntos; completar la tarea asociada una vez.
Mover al animal no quita su retiro; incorporarse después a un lote tratado no lo convierte retroactivamente en tratado.
Mostrar idéntico retiro en ficha, listado, agenda, app y validación de venta. Una tarea cancelada no consume medicamento.
Distinguir costo estimado de catálogo, consumo valorizado y gasto/comprobante real. SAN-01/02 y CST-01.

## P09 — Nutrición y disponibilidad

Definir ración/plan por lote; distinguir kg de producto de kg de materia seca y período de vigencia.
Entregar/consumir cantidades reales con fecha/destino y partida cuando corresponde; descontar inventario una sola vez.
Una compra crea inventario y deuda; el consumo reconoce costo; pagar la deuda sólo mueve caja.
Comparar plan frente a entrega/consumo, merma y respuesta en peso con cobertura de mediciones. NUT-01.

## P10 — Empresa y tesorería

Registrar gastos, vencimientos, cobros/pagos parciales, transferencias y conciliación de extractos.
Clasificar actividad/estructura y separar aportes/retiros de propietarios, financiación y operaciones comerciales.
Principal de préstamo no es gasto; interés sí es costo financiero conforme al período y política elegidos.
Prever compromisos con fechas reales, saldo inicial y escenarios; mostrar costos todavía sin asignar.
Una factura o comprobante respaldatorio no prueba que se haya cobrado/pagado. FIN-01/02/03.

## P11 — Cierre, análisis e investigación

Cerrar existencias físicas/valuación y conciliar documentos, caja, stock, costos y pendientes de sincronización.
Congelar fecha, población, criterio y versión de cálculo; comparar con otro corte sin reescribir el original.
Guardar una pregunta/escenario con fuentes, supuestos y registros usados; permitir repetir el cálculo y exportarlo.
Una recomendación abre una operación precargada con impacto visible; requiere confirmación antes de alterar negocio. INV-01 y ANA-02/03/04/05/06.

## Responsabilidades

Operario registra hechos de campo; encargado valida conflictos y manejo; administración concilia terceros/caja; responsable de empresa acepta cierres y decisiones.
Una persona puede cumplir varios papeles. La política final de permisos se define en 04-validaciones.md, no se deduce del nombre de un teléfono.

## Matriz de impacto por confirmación

| Hecho | Existencia animal | Insumos/costo | Obligación | Caja | Vínculo automático |
| --- | --- | --- | --- | --- | --- |
| Alta inicial | Incorpora ficha | Sin compra ficticia | No | No | Identidad e historia |
| Compra de hacienda | Incorpora | Adquisición según criterio | Por pagar | Sólo pago explícito | Tercero/documento/animales |
| Venta | Da baja | Costos/liquidación vinculados | Por cobrar | Sólo cobro explícito | Tercero/documento/animales |
| Nacimiento desde parto | Incorpora una cría | Seguimiento productivo | No automática | No | Madre/ciclo/cohorte |
| Muerte | Da baja | Pérdida según criterio | No automática | No | Causa y restricción de doble baja |
| Traslado | Cambia ubicación/grupo | Base histórica para asignación | No | No | Ocupación/pastoreo |
| Aplicación realizada | Sin cambio de cabezas | Consumo/costo una vez | Sólo documento que corresponda | Sólo pago explícito | Destinatarios/retiro/tarea |
| Compra de insumos | No | Ingresa inventario | Por pagar | Sólo pago explícito | Partida/proveedor |
| Consumo/entrega real | No | Baja insumo y reconoce costo | No nueva deuda por consumir | No | Lote/actividad y aplicación/ración |
| Cobro/pago | No | No repetir costo productivo | Reduce pendiente | Crea asiento | Documento y cuenta |
| Plan/escenario | No | Sin consumo real | Sin deuda real | No | Supuestos y referencias |
