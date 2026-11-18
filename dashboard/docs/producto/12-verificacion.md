# Verificación del incremento de integridad

Fecha: 18/11/2026. No equivale a aceptación del establecimiento productivo ni de la app instalada en un teléfono.

## Resultado local

| Comprobación | Resultado |
| --- | --- |
| Lint dashboard | Aprobado sin advertencias |
| TypeScript dashboard | Aprobado |
| Unitarias | 78 aprobadas |
| PostgreSQL real, RPC, RLS y sync | 53 aprobadas en base local `_tests` |
| Playwright | 10 recorridos aprobados |
| Build de producción Next | Aprobado con servicios locales configurados |
| Última optimización de consulta sanitaria | Recorrido específico de ficha/retiro repetido y aprobado con el build actualizado |
| Archivos móviles modificados | Análisis estático y transpilación de 7 archivos; pruebas puras de métricas incluidas en unitarias |
| Compilación Expo, WatermelonDB en dispositivo y lector físico | Pendientes; dependencias nativas/teléfono no disponibles en este entorno |

Los 141 casos distintos suman unitarias, PostgreSQL y navegador. La repetición del caso de ficha no aumenta ese total.
El chequeo parcial de archivos móviles usa la configuración ESLint disponible del dashboard y no certifica toda la app.
Auth/Storage son emuladores de prueba; PostgreSQL, PostgREST, RPC, RLS y Next son reales.
El ensayo de clima en navegador conserva una respuesta controlada; este incremento no vuelve a certificar el proveedor externo.

## Nuevas regresiones de negocio

- Retiro fijado después de traslado; exclusión de animales incorporados después de la aplicación.
- Historia sanitaria antigua por pertenencia registrada y tratamientos del rodeo.
- Honorarios más aplicaciones distintas; consumo vinculado contabilizado una vez y sin caja inventada.
- Referencia exacta de aplicación preservada por el snapshot de insumos.
- Alta del día seguida de pastoreo con fecha efectiva posterior.
- Inicio/fin del día argentino para vencimiento, caducidad y rango bancario; rechazo de fechas imposibles.
- Reenvío del formulario después de medianoche conservando la marca efectiva; rechazo de reloj inválido/futuro.
- GDP sin mezclar sujetos, ponderación por días-animal, pérdidas de peso y mediciones conflictivas.
- Auditoría en transacción de sólo lectura, sin aumentar auditoría de escritura ni inventar compras para altas genéricas.
- Pagos de gastos y sus reversiones no se diagnostican como sobrepagos.
- Ficha sanitaria visible en navegador después del traslado.

## Ejecución reproducible

Desde `dashboard`: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
Para PostgreSQL y Playwright usar exclusivamente el entorno local aislado de [TESTING.md](../TESTING.md).
El migrador local exige base vacía y termina en `_tests`; no resetea una base existente.
Las fixtures sí eliminan datos de esa base de pruebas entre casos; nunca apuntarlas a una base operativa.

Diagnóstico operativo: `npm run db:audit` con `GANPRO_AUDIT_DATABASE_URL` configurada por el operador.
No guarda credenciales en archivos versionados ni hace migraciones.

## Evidencia compartida de la base real

El usuario ejecutó el diagnóstico de contratos y compartió:

| Indicador | Resultado |
| --- | --- |
| contrato_60_instalado | false |
| base_44_instalada | true |
| stock_sin_caravana_instalado | true |
| alta_generica_instalada | true |
| manejador_reconoce_alta | true |
| cotizacion_instalada | true |
| seleccion_por_ficha_instalada | true |
| calendario_instalado | true |
| proteccion_historica_47_instalada | true |

Esto confirma ausencia de la función de capacidades consultada, no que las migraciones 57–59 estén todas ausentes.
Tampoco confirma por sí solo que la base consultada sea la misma de las variables de cada deployment Vercel.
El dashboard actual requiere ese contrato para habilitar determinadas escrituras; no se debe eliminar la guarda.

Para una base 01–56 íntegra está preparado [upgrade-56-to-60.sql](../../supabase/upgrade-56-to-60.sql).
El paquete es transaccional, sin seed/reset, y se detiene si detecta cambios 57+ o requisitos faltantes.
Debe probarse sobre una copia y contar con respaldo. Si se detiene, no repetir otras migraciones a ciegas:
revisar las columnas comerciales, método en asientos, función de lotes y dispatcher para completar sólo lo que falta.
No se ejecutó ese paquete contra Supabase desde este entorno. La conciliación productiva continúa abierta.
