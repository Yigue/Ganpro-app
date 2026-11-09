# Dashboard Ganpro v1: revisión y adaptación

Base revisada: `4578c64`, rama `v1`, carpeta `dashboard`.
Estado: implementado y verificado localmente; pendiente de revisión y adopción en producción. El alcance es el dashboard de Ganpro y su base compartida;
la aplicación móvil mantiene su protocolo y no se reemplaza por otro proyecto.

## Ejercicio técnico

Next 15/React 19, Supabase Auth/PostgREST/RLS y sincronización WatermelonDB v3.
Ya hay stock individual, RFID/pesadas, movimientos/DTE/SIGSA, sanidad con retiro,
reproducción, nutrición, costos, finanzas, configuración y proyecciones.

Hallazgos por lectura del código original:

- `crearAccion` y el límite de error devuelven mensajes técnicos crudos; lecturas
  de perfil/establecimiento ignoran errores y pueden aparentar datos faltantes.
- Altas/ediciones, movimientos, importaciones y compras/ventas usan varias llamadas
  REST: falla una parte y pueden quedar cambios parciales. Dos ventas pueden leer
  el mismo animal y generar ingresos duplicados; no hay recibo de idempotencia.
- No hay mapa de polígonos pese a existir `geo_json` en potreros/lotes.
- Finanzas tiene ingresos/gastos y un booleano cobrado; faltan cuentas, pagos
  parciales, por pagar, saldos y auditoría contable. No equivale a una caja conciliada.
- Convertir una proyección en real crea dinero sin movimiento ganadero atómico.
- El historial de cabezas usa nacimiento como alta de compra y categoría actual;
  no es un inventario histórico exacto. Valuación incompleta aparece como cero y
  margen sin diferencia de inventario se muestra como completo.
- Sync es transaccional pero comprueba conflictos solo de updated, no deleted ni
  colisiones de created; debe compartir bloqueo con las operaciones del dashboard.

## Ejercicio administrativo

Conservar sanidad, retiro, tactos, EV, escenarios y análisis que ya existen.
Completar el circuito «cada cabeza, cada comprobante, cada cobro/pago»:

1. Comandos/errores comunes y guía; sin ocultar fallas con datos de muestra.
2. Stock y compras/ventas atómicos, identificaciones únicas, sexo/categoría,
   historial, conflicto concurrente e idempotencia; preservar bloqueo por retiro.
3. Libro de caja/cuentas, obligaciones, vencimientos y pagos parciales; archivo
   anterior distinguido hasta conciliación explícita, sin inventar movimientos.
4. Potreros en mapa real, dibujo/edición, hectáreas, capas y ficha con stock/EV.
5. Inicio y finanzas conectados a datos reales; desconocido distinto de cero,
   fechas argentinas, filtros coherentes y cálculos con cobertura documentada.
6. Migraciones, regresiones SQL/RLS/sync y E2E; PR con base v1, sin desplegar en real.

No se promete contabilidad fiscal, emisión SIGSA, genealogía ni funcionamiento
sin Internet del mapa. La aplicación móvil conserva sus propios módulos offline.

## Cambios concretos y prioridades siguientes

Implementado: comandos/errores documentados; operaciones críticas de stock,
compras/ventas y sanidad en RPC; caja/deudas/pagos/correcciones/cierres; conciliación
sin duplicar anteriores; mapa de potreros; resumen común en Inicio/Finanzas;
protecciones de sync y pruebas. Se conservaron los módulos y modelos nativos.

Desde la administración del establecimiento todavía faltan para declarar un ERP
terminado: validar inventarios inicial/final y costo de producción, conciliar
bancos y comprobantes reales, definir reglas fiscales, probar la operatoria del
celular en el campo y acordar el cierre periódico. No se puede certificar la
exactitud de los datos reales leyendo el código ni usando fixtures locales.

Reproducción, nutrición y proyecciones mantienen funciones originales. Conviene
hacer una siguiente revisión de sus escrituras múltiples (p. ej. entrega de
ración y descuento de insumos), genealogía, trazabilidad de tratamientos por lote
histórico y alertas de calidad de datos. Este cambio no declara esos circuitos
completamente auditados. Las prioridades de stock, finanzas e Inicio quedan
concretadas en esta entrega; límites y pruebas en DEPLOYMENT.md y TESTING.md.
