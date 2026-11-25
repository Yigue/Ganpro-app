# Ganpro: plan funcional y de negocio

Estado: propuesta para construir y validar; no representa funcionalidades ya implementadas.
Alcance confirmado por el propietario: **cría, recría y venta de hacienda propia**; **gestión interna de caja, deudas, costos y rentabilidad**.
Referencia analizada: Ganpro-app, commit `822839b`, rama `fix/caravanas-historicas`, PR #4 abierto al revisar. La base de ese PR sigue en `70fc547`.
Fecha de referencia: 17/11/2026, Argentina. Vercel y Supabase productivos no fueron inspeccionados; no se conocen el esquema efectivamente aplicado ni la calidad de sus registros.

## Objetivo del producto

Gestionar el ciclo ganadero y económico una sola vez, desde campo o escritorio, y poder explicar cada indicador hasta sus registros de origen.
La unidad de cierre es un proceso completo y conciliado, no la existencia de una pantalla.
“100% funcional” significa completar y aceptar los procesos V1 que siguen; no significa ausencia garantizada de errores ni incluir toda función posible.

## Decisiones que Ganpro debe permitir tomar

- Qué animales tengo, dónde están, cuáles faltan identificar y qué hechos explican sus cambios.
- Qué vientres rindieron, cuántas crías nacieron y se destetaron por servicio/temporada.
- Qué recría gana peso, cuánto cuesta producir un kg y cuándo conviene vender.
- Qué animales no pueden venderse por retiro, conflicto de datos o documentación pendiente.
- Cuánto dinero hay, cuánto se debe cobrar/pagar y qué meses requieren financiación.
- Cuál fue el resultado de cría/recría y de la empresa, con costos e inventarios incluidos.
- Qué cambió frente al plan y qué acción conviene evaluar, con supuestos visibles.

## Límites de la primera versión

Una empresa con el establecimiento compartido existente. Actividades y centros de costo permiten distinguir cría, recría y estructura.
La app móvil existente forma parte del alcance: captura sin conexión y confirmación con el servidor.
La capitalización/hacienda de terceros, agricultura, engorde especializado, multiempresa/SaaS, facturación fiscal y contabilidad estatutaria completa quedan fuera del cierre V1.
Se registrarán impuestos como costos y comprobantes como respaldo; eso no certifica obligaciones fiscales ni emite facturas legales.
No se rediseña el esquema actual de golpe: conservar IDs, historial, roles y compatibilidad mientras se incorporan capacidades mediante migraciones aditivas.

## Qué existe y qué falta cerrar

“Existe” significa identificado en código del PR; no equivale a validado en producción.

| Área | Base existente | Cierre funcional pendiente |
| --- | --- | --- |
| Stock | Fichas, genéricos, visual/RFID, tabla, CSV y lectura HID | Calidad/origen del peso, edición coherente, conciliación de cargas y paridad móvil |
| Movimientos | Compra/venta/baja/nacimiento/traslado, transacciones e historial | Ciclo de corrección completo, borradores, vínculos documentales y mismos comandos desde móvil |
| Comercial | Kg/cabeza, desbaste, plazo, método y pago parcial | Terceros reutilizables, liquidación de gastos/comisiones y seguimiento de entrega/cobranza |
| Sanidad | Agenda, aplicaciones, partidas, costo y receptores fijados | Retiro igual en todas las vistas; completar circuito móvil e imputación económica |
| Reproducción | Servicios, ciclos, tacto, parto, destete y genealogía | Cohortes e indicadores reales, compras de preñadas y trazabilidad de denominadores |
| Nutrición/pastoreo | Insumos, consumos, raciones, planes, traslados y clima | Plan frente a entrega real; ocupación histórica, materia seca y costo por actividad |
| Finanzas | Cuentas, asientos, obligaciones, pagos, correcciones y CSV bancario | Paridad móvil, agenda de tesorería, financiación/aportes y clasificación de empresa |
| Costos/inventarios | Consumos históricos, cortes y resultados parciales | Evitar costos omitidos; cabezas-día y períodos; valuación y monedas consistentes |
| Análisis | Indicadores, escenarios y comparación parcial | Un catálogo común de métricas, informes reproducibles y exploración con fuentes |
| Móvil | WatermelonDB v3, manga y sync | Identidad por dispositivo, cola de comandos confirmables, conflictos y métricas compatibles |
| Operación técnica | Auditoría, recibos, guardas de esquema y pruebas locales | Verificar despliegue real, restauración, permisos finos, desempeño y aceptación en campo |

## Orden de ejecución y entregables

| Etapa | Resultado verificable | Condición para avanzar |
| --- | --- | --- |
| S0 — Línea de base | Versión real, datos conciliados, diccionario y responsabilidades | Diferencias conocidas y saldo/stock inicial aceptados |
| S1 — Integridad | Retiro, fechas, costos y mediciones consistentes; contrato común | Ninguna contradicción crítica en las pruebas de referencia |
| S2 — Operación diaria | Altas/movimientos/comercial/caja desde web y captura móvil segura | Cada operación confirma una sola vez y puede explicarse/corregirse |
| S3 — Ciclo de negocio | Cría/recría, insumos, históricos, tesorería y resultado de empresa | Flujos completos conciliados, no sólo formularios aislados |
| S4 — Análisis y decisiones | Métricas compartidas, escenarios, investigaciones e informes | Cada cifra tiene fórmula, fecha, cobertura y registros de origen |
| S5 — Piloto y continuidad | Pruebas en teléfonos reales, recuperación y operación sostenida | Aceptación por responsable de campo y administrador |

Los conectores avanzados se incorporan cuando exista el dato/proveedor y aporten valor; no bloquean el núcleo si hay importación manual controlada.
No se fijan fechas ni costos de desarrollo sin refinar el backlog, revisar dispositivos y medir datos reales.

## Avance de implementación

Consultar [correcciones del análisis del 24/11](13-correcciones-analisis.md), [ejecución por etapa](11-ejecucion.md) y [verificación](12-verificacion.md) para distinguir cambios entregados de propuestas pendientes.

## Cómo leer el plan

1. [Diagnóstico y evidencia](01-diagnostico.md): hallazgos actuales y límites de la revisión.
2. [Modelo de datos y reglas comunes](02-datos.md): entidades, estados, fuentes y conciliaciones.
3. [Procesos completos](03-procesos.md): cargas, modificaciones, efectos y correcciones.
4. [Validaciones y permisos](04-validaciones.md): bloqueos, advertencias y criterios de integridad.
5. [Indicadores y análisis](05-analitica.md): fórmulas, vistas, escenarios e investigaciones.
6. [Web y app móvil](06-movil.md): operación sin conexión, comandos y compatibilidad.
7. [Conectores y fuentes](07-conectores.md): existente, propuesto y factibilidad pendiente.
8. [Experiencia de uso](08-experiencia.md): acceso a la información y carga rápida.
9. [Roadmap y cierre](09-roadmap.md): dependencias, prioridades y definición de terminado.
10. [Aceptación de negocio](10-aceptacion.md): ejemplos verificables de punta a punta.
11. [Backlog importable](backlog.csv): historias propuestas con prioridad, dependencias y aceptación.

## Definición de una V1 útil

Stock, obligaciones, caja, insumos e indicadores se concilian; los hechos se distinguen de las estimaciones.
Las operaciones críticas tienen actor, fecha efectiva, recibo e historial; los conflictos no desaparecen ni se reintentan ciegamente.
Una venta no cobra sola, una compra de insumos no se vuelve a gastar al pagarla y un parto no crea dos crías.
La app puede capturar en campo sin conexión, mostrando lo pendiente y sin afirmar una confirmación que el servidor no realizó.
El responsable puede obtener una explicación del resultado y actuar desde el registro relacionado sin volver a cargarlo.
