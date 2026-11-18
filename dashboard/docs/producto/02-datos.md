# Modelo funcional y congruencia de datos

Modelo objetivo; no es una migración SQL para ejecutar. Debe convivir con las entidades actuales y con el móvil v3.

## Entidades y significado

| Entidad | Identidad y responsabilidad | Regla de congruencia |
| --- | --- | --- |
| Empresa / establecimiento | La operación compartida actual y su ámbito de gestión | Multiempresa futura requiere aislamiento y permisos diseñados; no basta un selector |
| Actividad / centro de costo | Cría, recría y estructura general | Un gasto o resultado puede quedar sin asignar, pero ese importe debe ser visible |
| Animal | ID técnico permanente; visual/RFID son identificaciones | Un genérico sigue siendo una ficha por cabeza; identificarlo no crea otra existencia |
| Lote ganadero | Grupo de manejo con pertenencia histórica | No representa por sí mismo hectáreas ni sustituye un potrero |
| Potrero | Superficie/polígono versionado y recurso | Ocupación/forraje se vinculan a una fecha y al límite vigente |
| Operación de negocio | Una compra, venta, traslado, aplicación o corrección | Agrupa hechos/resultados afectados; no confundirla con una pantalla o un recibo HTTP |
| Evento / medición | Hecho fechado, origen, sujeto y unidad | Los hechos confirmados se corrigen conservando el antecedente |
| Servicio / cohorte | Vientres expuestos y reglas de inclusión de una temporada | Traslados/ventas posteriores no reescriben el denominador histórico |
| Tercero | Cliente, proveedor, veterinario, transportista u otro | Puede actuar en varios papeles; IDs estables, nombre de referencia y cambios auditados |
| Documento comercial | Condiciones, importes, partes y respaldos | Su confirmación genera obligación, no necesariamente dinero en caja |
| Obligación / vencimiento | Monto por cobrar/pagar y calendario de cancelación | Una cuota o un pago parcial modifica el saldo, no el importe original de la venta |
| Cuenta / asiento | Caja/banco y flujo real de fondos | Transferencia, aporte y préstamo no son ventas; capital de deuda no es gasto operativo |
| Insumo / partida / consumo | Cantidad, unidad, costo y trazabilidad | Compra, existencia, entrega planificada, consumo y pago son hechos distintos |
| Corte de inventario | Existencias y valuación a una fecha con criterio preservado | Recalcular con otra cotización crea una versión/comparación, no altera un cierre sin rastro |
| Escenario / investigación | Supuestos, datos de referencia, fórmulas y resultados | Un escenario no se convierte en una venta sin registrar la operación real |
| Fuente / conector | Procedencia, licencia/acceso, actualización y cobertura | Un dato externo no es una medición del establecimiento |

## Campos transversales necesarios

ID estable; operación de origen; actor y dispositivo cuando corresponda; origen web/app/importación/proveedor.
Fecha efectiva del negocio, fecha de captura y fecha de confirmación del servidor, separadas.
Unidad, moneda, método, referencia documental, estado, versión del registro y motivo de corrección.
En datos agregados: período, población/cohorte, cálculo/versionado, fecha de corte y cobertura.
Los nombres propuestos se concretarán al diseñar las migraciones; no se deben agregar todos a cada tabla por duplicación.

## Clases de datos que la interfaz debe distinguir

1. **Medido/observado:** peso de balanza, conteo físico o aplicación realizada, con fecha y sujeto.
2. **Declarado:** dato ingresado por el operador o importado de un documento; mostrar autor/fuente.
3. **Derivado:** promedio por cabeza desde una pesada colectiva, balance o conversión calculada.
4. **Estimado/modelado:** biomasa estimada, clima de grilla o peso proyectado; método y supuestos visibles.
5. **Planificado:** venta futura, ración prevista, calendario; sin afectar existencias/dinero como ejecutado.
6. **Simulado:** variante de escenario, claramente separada del negocio confirmado.

No transformar un promedio colectivo en una pesada individual observada ni rellenar un dato faltante con cero.
Un peso desactualizado sigue siendo real a su fecha, no un peso actual confirmado.
El alquiler se vincula al terreno/contrato y se distribuye una vez: las hectáreas administrativas antiguas del lote no duplican la superficie del potrero.
Los datos de demostración viven en un entorno aislado; no hay caída a modo demo al fallar la base real.

## Estados e invariantes

- Operación: borrador → validada → confirmada; una confirmada puede recibir reversión/corrección explícita.
- Captura móvil: pendiente local → enviando → confirmada, o requiere revisión/rechazada; el dato físico no se descarta.
- Animal: existencia activa o baja según hechos; retiro es una restricción, no una categoría ni una venta.
- Documento: borrador/confirmado/anulado; saldo pendiente, parcial o cancelado deriva de sus cancelaciones.
- Plan: propuesto/aprobado/en ejecución/cerrado; distinguir tareas vencidas de hechos ejecutados.
- Una misma clave reenviada devuelve el mismo resultado; otra operación con datos parecidos requiere control de duplicación de negocio, no sólo de red.
- Visual reutilizable en históricos según la regla existente; RFID no se reasigna silenciosamente.

## Conciliaciones permanentes

- Cabezas finales = iniciales + compras + nacimientos + otras entradas − ventas − muertes − otras salidas.
- Un traslado interno no cambia el total del establecimiento; por lote/potrero debe equilibrar origen y destino.
- Saldo de cuenta = apertura + suma de asientos; transferencias entre cuentas se compensan en el consolidado.
- Pendiente por documento = obligación confirmada − cancelaciones válidas y ajustes explícitos.
- Insumo final = apertura + ingresos − consumos/devoluciones/ajustes, con unidades compatibles.
- Costo directo total = costo asignado a actividades/lotes + costo pendiente de asignación; sin doble origen.
- Todo agregado permite abrir las filas que lo componen y reconoce datos incompletos o en conflicto.

## Fechas, valuación y monedas

Argentina es la zona de negocio confirmada como supuesto operativo del proyecto; conservar timestamps móviles en ms.
La fecha efectiva de hoy no debe retroceder a mediodía respecto a otra operación ya registrada.
Los históricos admiten reglas de orden y períodos cerrados; el reloj del teléfono no reemplaza la confirmación del servidor.
ARS es la moneda operativa inicial. Guardar cotización/fecha/tipo usados cuando exista conversión; no reconvertir históricos con el dólar de hoy sin etiquetar la vista.
Separar costo de adquisición, valor de mercado y valor neto de venta estimado; cada análisis indica su base.
Los saldos de apertura deben conciliarse con el administrador y no se convierten en ingresos del período.

## Reconocimiento económico de gestión

Propuesta V1: resultado por hechos del período y consumos/capitalizaciones según política aceptada; caja por cobros/pagos efectivos.
La fecha de pago no debe trasladar arbitrariamente el costo productivo a otro ejercicio. Mostrar costos devengados, estimados y pendientes de asignación por separado.
Para comparaciones entre ejercicios, declarar ARS nominales, moneda constante o USD de referencia y la fuente/base usada; no mezclar criterios.
La propiedad de hacienda y activos se concilia antes de atribuir todo el valor del stock al patrimonio de la empresa.

Confirmación de alcance (18/11/2026): toda la hacienda es propia. No implementar reparto de propiedad/capitalización en V1.
