# Indicadores, investigaciones y decisiones

Capa semántica propuesta: una definición de cada métrica para web, móvil, exportación y escenarios.
Cada resultado indica población, período, fecha de corte, unidad/moneda, fórmula/versionado, fuente, cobertura y supuestos.
Un gráfico abre sus registros; una estimación no se presenta como medición. Las fórmulas de negocio propuestas se aceptan con el responsable antes de implementarlas.

## Catálogo inicial de indicadores

| ID | Indicador / decisión | Definición funcional |
| --- | --- | --- |
| M01 | Existencia a una fecha | Padrón reconstruido con aperturas/entradas/salidas, por categoría/lote/potrero a esa fecha; saldo conciliable |
| M02 | GDP individual | kg/día de observaciones válidas del mismo animal, método explícito (regresión o intervalo); mínimo dos fechas distintas; excluir promedios colectivos imputados |
| M03 | GDP del grupo | Agregar GDP de animales comparables en la ventana, ponderando por duración observada; informar número medido/total y rango de fechas; no encadenar pesos de animales diferentes |
| M04 | Preñez | Positivas/diagnosticadas de la cohorte; mostrar además diagnosticadas/expuestas y positivas/expuestas, para no ocultar vientres sin revisar |
| M05 | Parición | Madres con parto/vientres expuestos y crías vivas nacidas por 100 vientres, por separado; no atribuir compras de preñadas a eficiencia de servicio propio |
| M06 | Destete real | Crías con evento/peso de destete vinculadas a la cohorte, por 100 vientres expuestos; sin usar terneros comprados o peso de venta como reemplazo |
| M07 | Merma reproductiva | Madres diagnosticadas positivas sin cría destetada/madres positivas, con pérdidas, ventas de vientres y falta de seguimiento separados; una venta no prueba aborto |
| M08 | Mortalidad | Muertes del período/stock promedio en riesgo; separar crías, recría y adultos, período y causas; no comparar acumulado de toda la historia con umbrales anuales |
| M09 | Kg destetados por vientre | Kg registrados al destete de la cohorte/vientres expuestos; informar cobertura de pesos y casos múltiples, no limitar automáticamente a 100% de crías |
| M10 | Producción neta de carne | Propuesta: kg finales + kg vendidos + otras salidas no comerciales − kg iniciales − kg comprados − otras entradas no comerciales; mortalidad se muestra como pérdida, no como venta. Movimientos internos se cancelan al consolidar; declarar unidades y cobertura |
| M11 | Carga / ocupación | EV/ha y EV-día según ocupación efectiva, superficie vigente y coeficientes versionados; área desconocida no produce una densidad ficticia |
| M12 | Costo por cabeza/kg | Costos del período y actividad/cabezas-día equivalentes o kg netos producidos válidos; declarar denominador. Si producción ≤0, el costo/kg no se fuerza a cero |
| M13 | Margen de actividad | Ventas + inventario final − inventario inicial − compras de hacienda − costos directos, con criterio de valuación explícito y gastos asignados una vez |
| M14 | Resultado de empresa | Márgenes de actividades − estructura − costos financieros y amortizaciones que correspondan; mostrar partidas sin asignar y datos todavía estimados |
| M15 | Liquidez / tesorería | Saldo real de apertura + cobros previstos − pagos previstos; mostrar escenarios adicionales separados y efectos de financiación. No confundir ingreso comercial con cobro |
| M16 | Rentabilidad del capital | Resultado/capital promedio empleado y período indicado; sin capital valorizado no publicar un porcentaje de rentabilidad aparente |
| M17 | Precio/peso de equilibrio | Precio neto o kg necesarios para cubrir costos y objetivo de margen, con desbaste/gastos/base de cotización explícitos; diferenciar equilibrio económico de necesidad de caja |

Las métricas requieren políticas para transferencias, muertes, faltantes y valuación; se versionan y se prueban con ejemplos aceptados.
Una diferencia de stock físico, un cambio de precio y una ganancia de peso deben poder explicar por separado la variación de valor del rodeo.
La rentabilidad con/sin tierra u otros activos se rotula según el capital elegido; una comparación conserva esa base.

## Vistas para distintas perspectivas

| Vista | Qué debe responder | Acción relacionada |
| --- | --- | --- |
| Hoy / encargado | Tareas, retiros, movimientos pendientes, faltantes de stock/sync | Abrir tarea o registro y corregir/confirmar |
| Rodeo / técnico | Evolución individual, cohorte, categoría y dispersión, no sólo promedio | Identificar animales a revisar y planificar manejo |
| Cría / temporada | Expuestas, tactos, partos, pérdidas, destetes y cobertura | Ver casos sin seguimiento y revisar la cohorte |
| Recría / negocio | GDP comparable, días, costo marginal y alternativas de venta | Abrir escenario precargado y preparar venta |
| Espacial / recursos | Ocupación histórica, descanso, recurso medido, lluvia y restricciones | Planificar traslado; no confundir un pronóstico con oferta medida |
| Tesorería / administración | Saldos, vencimientos, pagos/cobros parciales y déficit futuro | Registrar cancelación, reprogramar o evaluar financiación |
| Empresa / propietario | Resultado, inventarios, capital y real frente a presupuesto | Investigar desvío con documentos y actividad de origen |

Filtros comunes: período/corte, actividad, cohorte, categoría, lote, potrero, tercero y moneda según disponibilidad.
Comparar períodos equivalentes y poblaciones comparables; mostrar cambios de composición y cobertura antes de atribuir un efecto a un tratamiento/ración.

## Investigaciones dentro del producto

Una investigación guarda pregunta, responsable, conjunto de datos/corte, filtros, fuentes, supuestos, método/versionado, variantes, resultado y conclusión.
Se puede duplicar para otro corte, compartir según permisos y exportar un informe reproducible con sus fuentes.
“Datos generados” significa agregados/escenarios trazables; nunca inventar pesos, precios observados o mediciones faltantes.
No ofrecer SQL libre con privilegios de administración como herramienta de negocio.

Casos iniciales:

1. **¿Vender ahora o recriar 60 días?** GDP/cobertura, precio y costo de alimento, disponibilidad, desbaste/gastos y efecto de caja; escenarios base/adverso/favorable.
2. **¿Qué lote produjo menos y por qué?** Descomponer categoría, peso inicial, días, alimentación, recurso, costos y calidad de datos; correlación no demuestra causalidad.
3. **¿Dónde se perdió eficiencia de cría?** Recorrer cohorte de servicio → diagnóstico → parto → destete, separando pérdidas físicas, ventas y falta de registros.
4. **¿Cuándo faltará caja?** Saldos, vencimientos comprometidos, pagos parciales y escenarios; no duplicar pago de insumos como consumo y como nuevo egreso.
5. **¿Qué explica el cambio del resultado?** Volumen, precio, costo, inventario y composición, con el mismo criterio de valuación en la comparación.

## Asistencia y automatización

Primero consultas/filtros/escenarios deterministas con fórmulas visibles. La asistencia en lenguaje natural es una interfaz adicional, no una fuente de hechos.
Las fuentes externas conservan cita, fecha y alcance; su contenido no puede autorizar escrituras ni cambiar reglas de negocio.
Recomendación → previsualización del impacto → operación precargada → confirmación autorizada → comando/recibo.
Un escenario no hace ventas, pagos, aplicaciones veterinarias ni cambios de stock por sí solo.
Las alertas se apoyan en umbrales configurables por actividad y período; no prometen diagnóstico agronómico/veterinario universal.
