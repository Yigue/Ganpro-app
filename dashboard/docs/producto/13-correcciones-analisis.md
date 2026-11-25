# Correcciones del análisis del 24/11/2026

Alcance: las siete observaciones de cálculos, duplicación de cargas y congruencia de reportes.
Hacienda propia, cría/recría y gestión económica interna. No representa la implementación completa del backlog de producto.

| Observación | Cambio | Comprobación |
| --- | --- | --- |
| Pérdidas de peso omitidas | La variación neta conserva disminuciones; registros conflictivos no producen kg ficticios | +20 kg y −10 kg dan +10 kg netos |
| GDP grupal diferente | Web reutiliza la función móvil: kg individuales / días-animal, ventana de 90 días, activos sin toros y pertenencia actual | Mismos registros dan 0,333 kg/día en ambos cálculos; cobertura visible |
| Altas duplicables | Productos, programación, raciones, suplementos, precios y revisaciones usan batch con recibo; servicios y potreros tienen comandos específicos | Reenvío no duplica; cambio de contenido con la misma clave se rechaza |
| Cierres con zona del servidor | Meses, ejercicios, series, estacionalidad y fechas civiles de CSV usan Argentina | 30/11 22:00 argentino permanece en noviembre, incluso si UTC ya cambió de mes |
| Costos históricos mutables | Se integran intervalos de permanencia; promedio = cabezas-día / días del período | Venta/traslado posterior no cambia el reporte anterior; salida a mitad de período reduce exposición |
| Destete inferido del stock | Se cuentan fechas/pesos de destete de ciclos vinculados al servicio | Ternera comprada no aumenta destetes; cobertura incompleta y madres repetidas se advierten |
| Proyección sin saldo ni pagos | Tesorería obtiene corte consistente de caja y obligaciones conciliadas; incluye cobros, pagos y vencidos | 100.000 de caja + 50.000 a cobrar − 200.000 a pagar = −50.000 |

## Reglas de interpretación

- La variación entre pesadas es una muestra; no sustituye el balance completo de kg por inventarios, compras, ventas y bajas.
- GDP grupal ponderada y regresión individual son indicadores distintos. La pantalla de proyección identifica la ventana grupal.
- Si falta GDP grupal histórica no se sustituye silenciosamente por 0,6: el usuario debe elegir un supuesto en modo manual.
- Las pesadas antiguas aún pueden carecer de procedencia medida/estimada; no se certifica esa calidad por cambiar una fórmula.
- El costo por cabeza usa el promedio de permanencia, no el stock de hoy. Historias iniciales incompletas se contabilizan como cobertura limitada.
- El alquiler real procede de gastos registrados. La tarifa actual del lote queda como presupuesto, sin reescribir costos anteriores.
- Los costos sin lote quedan en el total general y se muestra el importe pendiente de asignación.
- Costo directo / destetes es un cociente general del período; no se presenta como costo específico de cría sin asignar actividades.
- Las cohortes muestran ciclos registrados frente a vientres declarados. Madre repetida en varios servicios impide un porcentaje agregado engañoso.
- Tactos sin vínculo explícito siguen disponibles por lote/categoría actual; no se atribuyen a un toro sólo por compartir lote.
- Un destete sin ciclo queda visible como pendiente de conciliación, sin inventar un servicio o un parto.
- La tesorería contiene documentos conciliados y saldos al corte generado por la base; no depende del reloj de Vercel. Registros anteriores sin adopción deben revisarse en Finanzas.
- Los vencidos pendientes se incluyen en el primer mes como compromisos por regularizar; eso no afirma cuándo se cobrarán/pagarán.
- No se inventan ventas, gastos futuros, pagos ni saldos iniciales para completar una proyección.

## Comandos y datos compartidos

`repro.service` resuelve toros y conteo opcional dentro de la transacción, después de verificar el recibo.
Reenviar el alta tras un cambio del rodeo devuelve el resultado original y no recalcula el servicio ya guardado.
El conteo automático reconstruye ubicación con los movimientos disponibles y usa la categoría registrada; los datos históricos incompletos requieren revisión.
`config.paddock` verifica versión para editar e incrementa la versión del mapa; conserva el cálculo de superficie por geometría del servidor.
Los comandos conservan roles admin/campo, recibos por actor, auditoría y establecimiento compartido. Asesor sólo lee.
Se completa la auditoría de las tablas operativas utilizadas por las altas mediante batch.
No se agregan columnas obligatorias ni se cambia el esquema WatermelonDB v3.

## Actualización de Supabase

Se agregan migraciones **61** (corte de tesorería) y **62** (servicio, potrero, capacidades y auditoría).
Para una base con 01–60 íntegras: ejecutar completo [upgrade-60-to-62.sql](../../supabase/upgrade-60-to-62.sql), después de respaldo y prueba sobre copia.
El paquete exige contratos previos y se detiene ante cambios 61+ ya presentes; no intenta corregir instalaciones parciales por adivinación.
Para base 01–56 íntegra: primero [upgrade-56-to-60.sql](../../supabase/upgrade-56-to-60.sql), luego 60–62.
El paquete 56–60 conserva su alcance original. Los paquetes para la base original y 44–47 incluyen las migraciones nuevas.
Si cualquiera se detiene, revisar exactamente las migraciones aplicadas. No ejecutar semillas ni recrear la base.
El último diagnóstico compartido por el usuario indicaba falta del contrato 60; no se da por actualizado sin nueva comprobación.

Diagnóstico de sólo lectura: [stock-operations.sql](../../supabase/diagnostics/stock-operations.sql), o `npm run db:audit`.
Además del contrato 60, deben aparecer instaladas tesorería 61 y capacidades de análisis 62.
Una instalación parcial de las nuevas funciones produce un error de configuración seguro; no utiliza datos ficticios como respaldo.

## Verificación y límites

La batería agrega regresiones de neto/GDP, zona horaria, permanencias, cohortes, centavos, permisos y reenvíos.
El ensayo de upgrade crea su propia base local temporal, conserva registros de ejemplo y comprueba rechazo ante base incompleta o repetición.
Sólo elimina esa base temporal que él mismo creó; exige conexión local a una base `_tests`. Nunca se conecta a producción.
Las pruebas de navegador recorren tesorería, navegación monetaria y destete real con una compra ajena a la cohorte.
La caché de compilación se comprime para permitir el build en discos pequeños; no cambia los bundles de la aplicación.
No se aplicaron migraciones a Supabase productivo. La compilación Expo completa y teléfonos/lectores físicos continúan pendientes.
Borradores persistentes, plantillas y una bandeja ampliada siguen siendo historias de experiencia del backlog; no se declaran entregadas aquí.

Resultado local: **89 unitarias, 59 PostgreSQL/RLS y 12 Playwright aprobadas**; lint, TypeScript y build Next aprobados.
Los casos de cálculo y fechas se comprobaron también con TZ UTC y Pacific/Auckland. El ensayo 60→62 aprobó conservación y rechazo seguro de base incompleta/repetición.
El análisis estático de los dos archivos móviles modificados no sustituye compilación Expo ni prueba en dispositivo. Auth/Storage del arnés son emulados; PostgreSQL, PostgREST y RLS son reales.
