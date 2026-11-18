# Ejecución del plan

Alcance confirmado: toda la hacienda es propia; capitalización y propiedad de terceros quedan fuera de V1.
Actualización: 18/11/2026. Proyecto: Ganpro-app; no se modificó Campo-app.
Este registro distingue avance de código, verificación local y aceptación con datos reales.
El diagnóstico inicial conserva como referencia el commit 822839b; las correcciones siguientes son posteriores.

## Estado por etapa

| Etapa | Avance concreto | Condición todavía pendiente |
| --- | --- | --- |
| S0 — Línea de base | Diagnóstico reproducible de sólo lectura, huella de migraciones, funciones/columnas y controles agregados | Ejecutarlo contra la base real con lectura completa; conciliar padrón, saldos y responsabilidades |
| S1 — Integridad | Retiro en ficha, fecha efectiva/reenvío, límites de fechas, costos sanitarios y cálculo móvil corregidos | Procedencia de pesos, contrato móvil completo, datos históricos ambiguos y aceptación del despliegue |
| S2 — Operación diaria | Formularios bloquean cierre durante confirmación y conservan clave/hora al reenviar | Completar borradores, terceros/liquidaciones, cola móvil e identidad por dispositivo |
| S3 — Ciclo de negocio | Conserva capacidades existentes; sin cierre nuevo de esta etapa | Cohortes, costos históricos, valuación, tesorería y decisiones de negocio de S0 |
| S4 — Análisis | Corregida la mezcla de sujetos en la métrica móvil; no representa el catálogo completo | Métricas comunes, investigación con fuentes y escenarios reproducibles |
| S5 — Piloto | Regresiones locales añadidas | Teléfonos reales, Auth/Storage reales, restauración y aceptación de responsables |

No se declara una etapa cerrada por haber corregido algunos de sus puntos.

## Cambios de este incremento

- SAN-01: la ficha carga destinatarios fijados de todas las aplicaciones, incluso las del lote anterior y las de todo el rodeo.
  Para registros antiguos sin destinatarios, reconstruye pertenencia con movimientos y altas/bajas disponibles.
  La historia y la advertencia de retiro usan la misma selección. No modifica tratamientos ni completa historial faltante.
- FND-04: operaciones físicas del día usan el momento de envío; fechas de planes siguen siendo fechas planificadas.
  Vencimiento/caducidad abarcan el día argentino completo; los rangos bancarios incluyen comienzo y fin del día.
- Reenvío: `useAccion` conserva `_commandKey` y `_operationAt` hasta confirmar éxito; el servidor valida la marca de tiempo.
  El mismo formulario conserva su fecha efectiva si se reenvía después de medianoche. No hay reintento automático.
  Clientes anteriores sin esa marca conservan el comportamiento anterior y no certifican esta garantía.
- CST-01: honorarios y aplicaciones distintas se suman; el consumo conserva la referencia exacta a su aplicación.
  Totales económicos y desglose por lote evitan volver a sumar la aplicación cubierta por ese consumo.
  Estos registros calculados no crean obligaciones ni asientos de caja.
- ANA-01, parcial: GDP móvil usa kg ganados por individuo / días-animal observados en 90 días.
  El filtro usa la relación real con animals, no `eventos.lote_id`; lote indica pertenencia actual, no una cohorte histórica.
  La proporción de muertos se rotula histórica y pierde el semáforo de tasa por ejercicio.
  La GDP queda sin semáforo mientras el origen de pesos no pueda verificarse y la interfaz lo advierte.
  El gráfico de pesos describe los animales muestreados por fecha; no se presenta como crecimiento de una cohorte constante.
- UX-01, parcial: mientras se confirma no se puede cerrar el diálogo mediante fondo, cruz o Cancelar.
  La acción en curso muestra estado ocupado; cerrar una ventana no revierte una escritura ya enviada.
- Código móvil dividido en vista, estilos, filas y consultas; no cambia el esquema WatermelonDB v3.

## Diagnóstico S0 disponible

Desde `dashboard`, con conexión de lectura autorizada configurada localmente:

```bash
npm run db:audit
```

El comando requiere `GANPRO_AUDIT_DATABASE_URL`. No forma parte de las variables públicas del dashboard.
No enviar credenciales por chat, ni incluirlas en commits o argumentos de shell compartidos.
El JSON contiene agregados y disponibilidad de contratos; no imprime URL, claves ni identidades de animales/personas.
Si el esquema está incompleto informa columnas faltantes y omite controles que no puede calcular.
Ante permisos insuficientes falla explícitamente; con RLS un universo parcial exige revisar las facultades del lector.

La transacción es `REPEATABLE READ READ ONLY`, tiene límites de espera y termina con ROLLBACK.
Controles: duplicados visuales reservados (ACTIVO/DESCARTE)/RFID, categoría-sexo, referencias, pesos inválidos, altas sin evento y sobrepagos.
Un alta sin evento es un pendiente de conciliación, no una autorización para generar una compra o un nacimiento.
La huella identifica los archivos locales; no prueba que cada migración esté íntegra en el servidor.

También se puede consultar [el diagnóstico de contratos](../../supabase/diagnostics/stock-operations.sql)
y [los controles de datos](../../supabase/diagnostics/business-baseline.sql). El segundo requiere las columnas verificadas por el comando.

## Verificación y límites

Ver [registro de pruebas del incremento](12-verificacion.md).
Las pruebas usan una base PostgreSQL local separada, terminada en `_tests`; no hacen reset ni seed en producción.
No se dispone de conexión Supabase/Vercel real en este entorno; no se inspeccionó ni modificó el despliegue.
El usuario compartió un diagnóstico: falta el contrato 60. Ver evidencia y actualización protegida en 12-verificacion.md.
La compilación nativa y el ensayo del lector/teléfono siguen pendientes; las pruebas puras no los sustituyen.

Persisten decisiones y trabajos de S0/S1: saldos iniciales, fuentes de costos ambiguas,
procedencia de pesos históricos y contrato autenticado de comandos para cada dispositivo.
Un comprobante sanitario manual sin vínculo explícito no puede deduplicarse contra una aplicación por importe o fecha.
El costo histórico por lote/cabeza y la paridad financiera móvil tampoco se dan por resueltos en este incremento.
