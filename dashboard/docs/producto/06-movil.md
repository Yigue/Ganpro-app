# Integración web y app móvil

La app ya existe y captura sin conexión. La meta es una misma operación de negocio con interfaces distintas, no sólo copiar tablas.
Hoy hay diferencias entre ledger web y registros financieros locales, cálculo de indicadores y significado de lote/potrero (E07–E13).

## Reparto de responsabilidades objetivo

| Capacidad | Móvil de campo | Dashboard | Autoridad común |
| --- | --- | --- | --- |
| Identificar/pesar/revisar | Captura rápida, lector, lote de trabajo y borrador durable | Importación, revisión, historia y correcciones | Validación de identidad, versión y medición |
| Tratamiento/nacimiento/muerte | Capturar hecho físico aunque no haya conexión, con estado pendiente | Revisar conflictos e impactos productivos/económicos | Persistencia del hecho, consistencia y recibo |
| Compra/venta | Preparar o capturar solicitud según permisos; pendiente no garantiza confirmación | Revisar liquidación, stock y condiciones | Comando transaccional que decide la confirmación |
| Cobro/pago | Captura autorizada o borrador; nunca deducir caja de ingresos−gastos | Cuentas, pendientes, cancelaciones y conciliación | Ledger/asientos y saldo confirmado |
| Indicadores | Última lectura/corte disponible con antigüedad visible | Análisis completo y explicación | Misma definición/versionado, no dos fórmulas independientes |
| Maestros | Referencias autorizadas y cambios controlados | Administración y versiones | IDs, permisos y compatibilidad |

## Contrato de comando propuesto

ID de operación estable y clave idempotente; nombre/capacidad y versión del contrato; actor autenticado y dispositivo autorizado.
Datos tipados con unidades; fecha efectiva y captura; versiones esperadas de registros; correlación con sesión/importación.
Respuesta: confirmado/pendiente de revisión/rechazado, recibo, IDs canónicos, versiones y efectos; errores por campo o código de negocio seguro.
No confiar en un actor escrito libremente en el payload. Se resuelve a partir de la identidad autorizada.
La cola debe preservar la misma operación tras reinicio, pérdida de respuesta o reenvío: entrega al menos una vez con efecto de negocio idempotente.

## Estados offline

`Pendiente local → enviando → confirmada`, o `requiere revisión / rechazada` con motivo y acción posible.
Separar rechazo de datos/negocio de indisponibilidad de red. Sólo lo transitorio se reintenta automáticamente con la misma clave.
Una respuesta perdida después del commit se resuelve consultando/reintentando el recibo, no creando otra operación.
Una modificación concurrente requiere revisar versiones; no debe ganar por tener el reloj más adelantado.
Mostrar conteo, última sincronización, antigüedad, conflictos y responsable. “Sin conexión” no significa “sin registros”.

## Hechos físicos frente a solicitudes comerciales

Una muerte o tratamiento realizado offline no se borra porque el servidor encuentre un conflicto.
Conservar evidencia/captura original en revisión; el encargado resuelve la contradicción con una venta u otro movimiento posterior.
Una venta solicitada offline no puede prometer que sigue libre de retiro o que nadie vendió esas cabezas mientras tanto.
Puede prepararse para confirmación; el servidor vuelve a validar existencia, permisos, retiro y condiciones.
Los datos sin confirmar deben aparecer como tales en análisis y en el móvil; definir qué informes los excluyen y qué alertas los muestran.

## Compatibilidad y transición

Distinguir cuatro versiones: aplicación instalada, esquema local WatermelonDB, esquema SQL y contrato de comandos/capacidades.
No cambiar retrospectivamente el esquema v3. Agregar migraciones locales con prueba de actualización conservando datos y cola.
Mantener lectura/sync de datos compatibles mientras se incorporan comandos críticos de forma gradual.
Identificar clientes anteriores y sus capacidades; no permitir una función que no puedan representar correctamente.
Los registros financieros locales antiguos requieren conciliación/adopción explícita; no convertirlos en pagos ni duplicar documentos automáticamente.
Cambiar el rótulo de “balance” no alcanza: documentar cuándo significa resultado, caja o dato todavía no conciliado.

## Entregas de integración

1. Inventariar pantallas/acciones actuales, contrato compartido y capacidades; acordar qué se confirma offline/online.
2. Identidad por usuario/dispositivo, permisos, revocación individual y política para trabajos pendientes.
3. Cola durable, recibos y reconciliación para pesos/identificación y operaciones físicas; pruebas de reconexión.
4. Compras/ventas/caja según permiso, con la misma confirmación transaccional que web; migración de legado financiero.
5. Lectura local de ledger/indicadores con corte/cobertura; evitar recalcular una métrica con otro universo de datos.
6. Piloto real con bastón, balanza y teléfono: pantalla apagada, reinicio, batería/red intermitente y varios operadores.

## Casos de aceptación imprescindibles

- Una lectura duplicada y un reenvío de la sesión no agregan cabezas.
- Reiniciar después de capturar conserva la cola y sus claves.
- El servidor confirma y se pierde la respuesta: reenviar devuelve el recibo sin repetir efectos.
- Web vende mientras el móvil pesa/traslada offline: el conflicto queda visible y la captura no desaparece.
- Un tratamiento sincronizado cambia el retiro de sus receptores en todas las vistas.
- Un cliente viejo no modifica una operación financiera confirmada que no comprende.
- Revocar un dispositivo impide nuevas confirmaciones; sus capturas locales requieren una recuperación controlada.
- Un operador de campo sin capacidad financiera no confirma pagos desde una API alternativa.
