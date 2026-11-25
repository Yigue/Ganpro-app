# Experiencia de uso: información accesible y carga rápida

## Organización funcional

Mantener agrupación de navegación existente y fortalecer un centro de operaciones, sin crear formularios distintos para el mismo negocio.

| Acceso | Uso principal |
| --- | --- |
| Hoy | Tareas y vencimientos, retiros, conflictos/sync, alertas de datos y accesos a resolverlos |
| Rodeo y campo | Buscar ficha/grupo, stock, movimientos, mapa y ocupación |
| Producción | Sanidad, reproducción por temporada, nutrición y pastoreo |
| Comercial y administración | Terceros, compras/ventas/liquidaciones, documentos, cuentas y pendientes |
| Empresa y análisis | Costos/inventarios, resultado, presupuesto, escenarios e investigaciones |
| Administración del sistema | Usuarios/dispositivos, versión/esquema, auditoría y recuperación |

Los títulos/ubicaciones definitivos se prueban con usuarios. Un acceso desde mapa, calendario o indicador abre la misma operación con contexto precargado.

## Patrón común de carga

1. Elegir qué pasó o qué se quiere registrar, no qué tabla modificar.
2. Pedir datos mínimos del caso y recuperar los maestros/defaults del contexto.
3. Seleccionar por filtros/grupo/cantidad/lectura, con un resumen visible de población.
4. Previsualizar impactos cuando hay efectos múltiples: cabezas, kg, obligación, caja e insumos.
5. Confirmar y mostrar recibo/resultado con enlaces a todos los registros afectados.
6. Ofrecer corregir o siguiente operación sin arrastrar selecciones de una venta anterior.

No exigir RFID ni datos desconocidos en toda alta; mostrar campos comerciales sólo cuando corresponden.
Un cambio de categoría explica el sexo derivado; un campo opcional no debe bloquear guardar por un estado auxiliar inválido.
En importación, el análisis previo de errores es parte de la carga, no una tarea posterior escondida.

## Búsqueda y acceso a información

Búsqueda por visual/RFID/referencia, lote/potrero, tercero, documento y operación; aplicar permisos a resultados y archivos.
Ficha con resumen y línea de tiempo: identidad, pertenencia histórica, pesadas y procedencia, reproducción, tratamientos/retiro y vínculos comerciales.
Desde cualquier indicador abrir filtros y filas que explican su total; exportar con el mismo corte/unidad/filtros.
Un dato derivado/estimado muestra su origen y antigüedad. No presentar vacíos como ceros ni usar un semáforo favorable sin datos suficientes.

## Manejo de estados y errores

Pendiente local, enviando, confirmado, requiere revisión y rechazado son estados visibles y distintos.
Guardar no cierra antes de conocer el resultado; al perder respuesta se consulta el mismo recibo.
Cerrar durante envío no se rotula como cancelación del negocio. Proteger borradores y explicar qué sigue en proceso.
Validaciones conservan valores y foco en el campo; errores técnicos entregan referencia y estado real de la operación.
Una falla de clima/reporte no bloquea el padrón. Una falla de DB no cambia la pantalla a datos de demostración.

## Contexto móvil

Uso con guantes/sol/reflejos, objetivos táctiles grandes, pocas interacciones y lectura continua sin saltos de foco.
Confirmación sonora/háptica diferenciada de “lectura recibida” y “operación confirmada”; no afirmar conexión por haber leído un RFID.
Lista visible de lecturas repetidas, nuevas y vinculadas; permitir revisar/corregir sin perder la sesión.
Estado offline y último corte disponibles antes de mirar un saldo o restricción. Atajos según permisos y tarea asignada.

## Validación de usabilidad propuesta

Observar tareas reales: alta genérica/identificación, venta por selección, pago parcial, aplicación por lote, nacimiento y búsqueda de una diferencia.
Medir tiempo, correcciones, reintentos, errores y abandono; no fijar una promesa de segundos sin probar hardware, red y volumen representativos.
Aceptar cuando el operador completa el recorrido sin ayuda, entiende los impactos y puede verificar el resultado.
Evaluar teclado/lector de pantalla, foco/Escape, etiquetas, contraste, móvil y escritorio; las acciones importantes no dependen de hover.
