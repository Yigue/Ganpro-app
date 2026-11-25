# Criterios de aceptación de negocio

Ejemplos de prueba sintéticos e independientes, para ejecutar en un entorno/copia controlados. No representan los datos reales de la empresa.
Se esperan valores exactos donde corresponde; cada caso registra corte, actores, IDs/recibos, fuente y efectos en módulos.
Un caso aprobado en web no sustituye su variante móvil ni una restauración. El protocolo/hardware se prueban en teléfonos reales.

## A01 — Línea de base

Dado un padrón con genéricos, pesos desconocidos y documentos abiertos, importar no crea pagos ni nacimientos ficticios.
El administrador puede conciliar existencias/saldos y ver las diferencias todavía pendientes antes de aceptar el corte.

## A02 — Identidad

Un animal sin caravana recibe visual/RFID conservando su ID, eventos y pertenencia. Repetir la lectura no crea otra cabeza.
RFID con ceros iniciales se conserva como texto y una identidad histórica ambigua requiere revisión.

## A03 — Ecuación de stock

Inicial 10 + compras 4 + nacimientos 2 − ventas 3 − muerte 1 = final 12.
Un traslado interno cambia lote/potrero, no esas 12 cabezas consolidadas. Web, app confirmada, historial e inventario coinciden al mismo corte.

## A04 — Venta, desbaste y cobro

Dos animales, 600 kg físicos, desbaste 3%, precio 1000 ARS/kg: 582 kg facturados y documento 582.000 ARS.
Cobrar 100.000 deja pendiente 482.000; no crea otra venta. La pesada física no se convierte en 582 kg por descontar comercialmente.

## A05 — Operación inválida o concurrente

Si una cabeza está vendida/en retiro o cambió su versión, la confirmación no deja otras bajas/asientos parciales de esa operación.
Dos usuarios intentan vender la misma cabeza: sólo una confirmación válida; el otro obtiene conflicto y mantiene la información para revisión.

## A06 — Retiro histórico

Aplicación por lote a A y B; A se traslada y C ingresa después. A y B conservan retiro; C no lo hereda.
Ficha, Sanidad, listado, móvil al mismo corte y control de venta coinciden. Incluir aplicación individual y a todo el rodeo.

## A07 — Hecho frente a plan

Programar una vacuna o ración no consume stock ni crea un pago. Aplicar/entregar registra una vez cantidades y destinatarios reales.
Cancelar programación no equivale a anular un tratamiento ya realizado.

## A08 — Insumos y materia seca

100 kg de producto al 90% MS = 90 kg MS conocidos. Consumir 20 kg de producto consume 18 kg MS y deja 80 kg de producto.
Si el valor de apertura es 500 ARS, ese consumo cuesta 100 ARS según promedio del ejemplo. Pagar una compra no vuelve a reconocer ese consumo.

## A09 — Cronología

Alta de hoy a las 15:00 seguida de manejo/pastoreo real a las 16:00 se registra en orden.
Una fecha histórica inválida o un período cerrado requiere corrección/revisión explícita, no un cambio silencioso de hora.

## A10 — Cohorte reproductiva

Servicio propio de 10 vientres, 8 positivos y 2 vacíos: con cobertura completa, preñez diagnosticada 80%.
Comprar después 2 vacas preñadas no transforma ese servicio en 10 positivos propios ni cambia quién estuvo expuesto.

## A11 — Parto y destete

Un parto crea la cría una sola vez, incluso con reenvío desde el móvil. La cría aparece en stock/historial sin otro alta manual.
Si la cohorte de 10 vientres produce 7 crías con destete registrado, son 70 crías destetadas por 100 vientres; comprar 3 terneros no cambia ese dato.

## A12 — Costo sanitario

Honorario veterinario 100 y aplicación distinta 200 deben explicar un costo 300 si ambas son costos reconocidos del período.
Si un documento de 200 corresponde a esa misma aplicación, no deben sumarse otros 200 por el mismo origen.

## A13 — Historia y costo por cabeza

Un período con 10 cabezas constantes usa ese denominador/promedio acordado; una venta posterior de 5 no cambia silenciosamente su costo histórico por cabeza.
Un corte cerrado conserva su versión; una corrección retroactiva se refleja como versión/ajuste según política y deja el antecedente.

## A14 — Caja real

Saldo inicial 50.000, cobro 100.000 y honorario pagado 20.000: caja final 130.000.
La venta de 582.000 del ejemplo A04 no se cuenta como cobro total. Los 482.000 siguen en pendientes hasta su cancelación.

## A15 — Tesorería

Saldo inicial futuro 100.000 + cobros comprometidos 50.000 − pagos comprometidos 200.000 = saldo previsto −50.000.
El saldo actual sigue siendo el de asientos realizados; escenarios y vencimientos todavía no ocurridos no lo alteran.

## A16 — Empresa y financiación

Recibir préstamo 200.000 aumenta caja y deuda, no ventas. Pagar principal 100.000 e interés 5.000 reduce caja 105.000.
Queda deuda de capital 100.000 y costo financiero 5.000 según el período; aportes/retiros del dueño se clasifican separados del resultado operativo.

## A17 — Medición y cobertura

A pasa de 100 a 110 kg en 10 días; B de 300 a 310 kg en otros 10 días comparables: GDP individual 1 kg/día en ambos.
El indicador de grupo no encadena el salto de 110 a 300 como crecimiento. Un promedio derivado de pesada colectiva mantiene su procedencia.
Sin pesos suficientes o capital valorizado, GDP/rentabilidad correspondiente aparece no disponible con su cobertura, no cero favorable.

## A18 — Conexión y reenvío

Capturar, cerrar/reiniciar app y recuperar la sesión conserva la cola y sus claves.
Si el servidor confirma y se pierde la respuesta, el reenvío devuelve el mismo recibo sin duplicar animales, obligaciones ni caja.

## A19 — Conflicto físico offline

Web y móvil producen hechos contradictorios sobre el mismo animal. La captura física se conserva y el encargado recibe el conflicto.
No se descarta una muerte/tratamiento ni se revierte una venta/cobro automáticamente; el ajuste autorizado mantiene auditoría.

## A20 — Autorización

Un usuario sin facultad de caja no confirma un pago por cambiar el payload o invocar la API directamente.
Revocar un dispositivo impide nuevas confirmaciones; sus datos pendientes requieren recuperación controlada, no borrado.

## A21 — Investigación reproducible

Guardar “vender ahora o recriar” conserva corte, población, precios/fuentes y supuestos. Reabrir reproduce la misma versión.
Otra cotización genera comparación/versionado; no cambia hechos. Convertir recomendación en operación abre revisión de impactos y confirmación.

## A22 — Fuentes e importación

Respuesta de clima/precio con unidad/fecha inválidas no se guarda como válida ni se transforma en cero.
Una importación repetida no duplica datos; filas rechazadas siguen identificadas y no se omiten en el resumen.
Una falla de proveedor no bloquea las operaciones propias ni fabrica mediciones de pastura.

## A23 — Actualización y recuperación

Actualizar SQL/app/local conserva IDs, historial, saldos, documentos y cola. Un cliente incompatible no confirma una función que no comprende.
Restaurar respaldo en una copia permite conciliar los mismos totales y recuperar recibos; no se resetea producción para validar este caso.

## A24 — Usabilidad y rendimiento

El usuario completa alta/venta/pago/aplicación/búsqueda con los datos mínimos, puede verificar el resultado y no reingresa lo ya conocido.
Probar red, tamaño de historia y equipos acordados, accesibilidad y exportación; registrar tiempos/errores reales y resolver los impedimentos antes de aceptar V1.
