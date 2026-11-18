# Diagnóstico del código de referencia

Base: commit 822839b. Evidencia estática revisada en esta planificación y reproducciones locales documentadas en la revisión previa.
Las 120 pruebas reportadas en TESTING.md corresponden a la entrega anterior; no se ejecutó de nuevo esa batería para redactar este plan.
No se inspeccionó Supabase productivo ni se certificó un build móvil completo. Un hallazgo en el código no prueba qué registros reales están afectados.

## Evidencias que originan el backlog

| ID | Evidencia del repositorio | Consecuencia funcional | Tratamiento |
| --- | --- | --- | --- |
| E01 | `app/(dashboard)/stock/[id]/page.tsx` carga aplicaciones por animal/lote actual sin `aplicacion_animales`; `calc/sanidad.ts` exige ese join para receptores fijados | La ficha puede omitir un retiro que el control SQL de venta sí conoce | SAN-01, P0 |
| E02 | `app/(dashboard)/gestion/actions.ts` y Nutrición usan `fechaMs` mientras movimientos/caja usan `fechaOperacionMs` | Una entrada a pastoreo de hoy puede quedar antes de un alta de la tarde | FND-04, P0 |
| E03 | `lib/calc/costos.ts`: sólo suma aplicaciones como respaldo cuando la suma de gastos SANIDAD es cero | Un gasto puede hacer que se omitan aplicaciones distintas del lote | CST-01, P0 |
| E04 | `lib/db/page-reproduccion.ts` estima destetados con terneros activos más vendidos y sus pesos actuales/de venta | Comprados o todavía al pie pueden aumentar el indicador estimado | REP-01, ANA-02 |
| E05 | `lib/db/page-costos.ts` y `lib/calc/costos.ts` usan cabezas y pertenencia a lote actuales al consultar períodos anteriores | Un costo histórico por cabeza puede cambiar por ventas o traslados posteriores | CST-02 |
| E06 | `lib/db/financial-analysis.ts` toma ingresos pendientes; `calc/finanzas.ts:flujoProyectado` resta gasto promedio e inicia acumulado en cero | La proyección no sustituye una tesorería con saldo inicial y pagos comprometidos | FIN-02 |
| E07 | `src/data/repositories/FinancieroRepository.ts` crea movimientos locales; `features/financiero/model/FinancieroContainer.tsx` resta gastos de ingresos sobre una consulta limitada a 100 movimientos | El balance del móvil no equivale al saldo de caja y pendientes del ledger web | FIN-01, APP-04/05 |
| E08 | `lib/sync/handler.ts` usa una clave compartida y cliente administrativo; el protocolo móvil envía cambios de tablas | La confirmación no identifica por sí sola cada operador/dispositivo ni expresa todos los comandos de negocio | APP-01/02/03 |
| E09 | El móvil usa esquema WatermelonDB v3; su modelo financiero no contiene cuentas/asientos ni todas las condiciones comerciales actuales | Compartir tablas no significa paridad funcional | APP-04/05 |
| E10 | `src/features/potreros/PotrerosScreen.tsx` usa listas/formularios de lotes bajo Potreros | Hay que alinear la separación grupo ganadero/terreno también en móvil | POT-01, UX-01 |
| E11 | Migración 51 asigna kg totales de compra entre las cabezas y registra PESAJE por animal | Un promedio derivado puede parecer una pesada individual realmente medida | FND-02, ANA-01 |
| E12 | `src/features/dashboard/model/DashboardContainer.tsx` junta pesajes y calcula una GDP sin agrupar allí por animal; toma los primeros 30 ordenados ascendentemente | Con animales distintos puede medirse cambio de composición, no crecimiento individual | ANA-01 |
| E13 | El mismo dashboard calcula mortalidad con muertos/total de registros sin período explícito en esa fórmula | El valor no tiene el mismo significado que una tasa por ejercicio/cohorte | ANA-01/02 |
| E14 | `precios_mercado` permite fuentes/carga manual y CSV; no se identificó un cliente automático de cotizaciones en esta revisión | Una etiqueta API_MAG en un CSV no certifica consulta automática ni actualidad del precio | CON-02 |
| E15 | `lib/weather/service.ts` consulta Open-Meteo y `weather/analysis.ts` aplica umbrales a una grilla | Hay clima orientativo; no medición de biomasa ni conector NDVI | CON-05/06 |
| E16 | El esquema tiene contraparte como texto y respaldos financieros; no se identificó un maestro reutilizable de terceros | Nombres repetidos y cambios dificultan seguimiento por cliente/proveedor | COM-01 |
| E17 | `selectAll` y varias pantallas obtienen historiales completos para filtrar/agregar | El tamaño del historial puede degradar carga y búsqueda | OPS-03 |
| E18 | `FormDialog` permite cerrar/cancelar mientras se confirma | Cerrar no cancela un comando enviado; puede dejar una percepción equivocada del resultado | UX-01 |
| E19 | `ganpro_scenario_close` agrega operaciones por lote/fechas | Un plan necesita diferenciar operaciones vinculadas de otras actividades coincidentes | ANA-04/05 |
| E20 | PR #4 abierto y migraciones hasta 60 en la rama, sin inspección del despliegue real | Código, esquema y cliente móvil deben verificarse como versiones distintas | FND-01 |

| E21 | El dashboard móvil filtra `eventos.lote_id`, pero el esquema v3/modelo de eventos sólo declara `lote_destino_id` y vínculo a animal | Seleccionar un lote usa una columna que no existe en ese contrato; requiere corrección y prueba en la app | ANA-01, APP-04 |

## Reproducciones previas que se conservan como casos de regresión

- Retiro: la misma aplicación vigente devuelve 0 receptores sin join y 1 con su destinatario cargado.
- Pastoreo: alta genérica de la tarde + entrada registrada a las 12:00 del mismo día produjo GANPRO_DATE_ORDER.
- Costos: honorario veterinario 100 + aplicación distinta 200 produjo costo SANIDAD 100, no una conciliación de ambas fuentes.
Estas pruebas no se hicieron sobre la base real. Deben incorporarse a la batería de cierre S1.

## Base aprovechable

Existen transacciones SQL, recibos idempotentes, auditoría, control de versiones, validación de identidad y retiro, inventario de insumos y ledger de caja.
Hay ciclos reproductivos, planes de pastoreo, documentos privados, escenarios y controles de compatibilidad de stock.
La propuesta amplía esos contratos; no requiere reemplazarlos por un sistema nuevo ni duplicar animales/lotes/finanzas.

## Lo que no se puede deducir de esta inspección

- Qué migraciones están aplicadas en Supabase ni qué rama atiende cada URL de Vercel.
- Si el padrón físico, los saldos iniciales y las deudas cargadas son correctos.
- Calidad/cobertura de fechas, pesos, madres, costos o servicios de la empresa.
- Backup, restauración y disponibilidad reales del plan contratado.
- Modelos de lectores/balanzas, conectividad en campo y comportamiento de una app compilada en esos teléfonos.
- Acceso autorizado, condiciones de uso o cobertura de API de bancos, mercados o organismos.

## Riesgo para la gestión

El problema principal es semántico: una cifra consistente en una tabla puede significar otra cosa en otra pantalla.
El plan necesita unificar definiciones y fuentes antes de automatizar recomendaciones o agregar más gráficos.
