# Roadmap de producto y cierre funcional

El backlog es una propuesta priorizada, no una lista de funciones ya entregadas. Sus dependencias se validan en backlog.csv.
P0 = integridad/continuidad obligatoria para cerrar la versión; P1 = capacidad necesaria de la V1 acordada; P2 = ampliación posterior; P3 = exploración.
Tener varios P0 no significa ejecutarlos simultáneamente: se respetan etapas y dependencias. No hay estimaciones de horas ni fechas prometidas sin refinamiento.

## S0 — Saber qué tenemos y qué vamos a medir

Historias: FND-01/02/03.
Verificar versiones reales y matriz de compatibilidad, respaldo previo, padrón, saldos iniciales, propiedad de hacienda y referencias.
Aprobar diccionario de datos/métricas y mapa de responsables. Identificar datos desconocidos sin completarlos artificialmente.
Salida: línea de base y pendientes aceptados; los indicadores que no pueden calcularse quedan explícitamente no disponibles.

## S1 — Quitar contradicciones críticas

Historias: SAN-01, FND-04, CST-01, APP-01 y ANA-01.
Unificar retiro en web/API, fechas de operación y origen de costos; definir el contrato móvil y corregir mezcla de sujetos/mediciones.
Pruebas de referencia: retiro tras traslado/ingreso tardío, alta de tarde seguida de pastoreo, costo sanitario con orígenes distintos y GDP por individuo.
Salida: ejemplos aceptados, reglas compartidas y plan de transición móvil; no se certifica paridad de todos los teléfonos por corregir una pantalla web.

## S2 — Hacer el día a día completo

Historias: UX-01, ANI-01/02, OPR-01, COM-01/02, FIN-01, APP-02/03/04 y OPS-01.
Conectar alta/identificación, compras/ventas/bajas/traslados, terceros/liquidación y caja; instalar cola móvil e identidad compatible.
Aplicar una política de correcciones con recibos/versión y estado de operación visible.
Salida: recorridos completos y reversibles según reglas; mismo resultado confirmado desde web y app, con diferencias offline explicadas.

## S3 — Cerrar cría, recría y empresa

Historias: REP-01, SAN-02, NUT-01, POT-01, CST-02, FIN-02/03, INV-01, DOC-01, UX-02 y CON-01.
Cohortes reales, alimentación/ocupación histórica, costo por período, inventario/valuación, terceros/documentos y tesorería.
REP-02 se refina si se necesitan los casos avanzados de preñez adquirida/parentesco; el núcleo ya debe excluirla de eficiencia propia.
Salida: stock, documentos, insumos, costos, caja e indicadores explicables con registros y conciliaciones comunes.

## S4 — Tener herramientas para decidir e investigar

Historias V1: ANA-02/03/04/06 y APP-05. Ampliaciones: ANA-05 y CON-02/03/05.
Entregar catálogo común de métricas, distintas perspectivas, venta ahora/recría, equilibrio, preguntas guardadas e informes con fuentes.
Un análisis funciona con datos propios/manuales controlados antes de automatizar todas las fuentes externas.
Salida: el usuario puede abrir el origen de una cifra, comparar escenarios y preparar una acción sin inventar datos ni ejecutar negocio automáticamente.

## S5 — Aceptar en campo y sostener la operación

Historias: OPS-02/03/04. Conectores oficiales/NDVI (CON-04/06) sólo si se demuestra factibilidad y utilidad.
Ensayar dispositivos, reconexión, varios usuarios, períodos cerrados, pérdida de respuesta y restauración.
Medir usabilidad/desempeño con volumen/red acordados, no con una demostración vacía.
Salida: todos los P0 resueltos; todos los P1 incluidos en el alcance aceptados; pendientes P2/P3 identificados sin aparentar que funcionan.

## Primer incremento concreto

1. Registrar versión/esquema/corte y acordar definiciones (FND-01/02).
2. Corregir retiro en ficha y fecha efectiva de procesos restantes (SAN-01, FND-04).
3. Conciliar fuente de costo sanitario y procedencia de pesos/GDP (CST-01, ANA-01).
4. Entregar casos de regresión y especificación del comando móvil (APP-01).
5. Continuar conciliación de datos y seleccionar el primer circuito de campo/comercial del piloto.

La corrección de integridad se entrega antes de aumentar la cantidad de indicadores o incorporar predicciones más complejas.

## Política de entrega

- Cada historia tiene evidencia de partida, proceso, validaciones, impacto y aceptación; dividirla si no puede demostrarse como una unidad.
- Una capacidad con DB/API/cliente incompatibles no se habilita por aparecer el botón.
- Migraciones aditivas, prueba sobre copia y recuperación antes de tocar datos reales; preservar IDs e historial.
- Pruebas unitarias de reglas y agregados, integración SQL/RLS/concurrencia y recorridos web/móvil con pérdida de red.
- Separar comprobaciones con Auth/Storage simulados de pruebas contra servicios y teléfonos reales.
- El responsable de campo acepta operaciones físicas y el administrador acepta caja/costos; una misma persona puede cumplir ambos papeles.
- Registrar incidencias con operación/recibo y explicación; no usar logs técnicos ni datos privados como pantalla de negocio.

## Definición de terminado por capacidad

Carga, consulta, modificación/corrección, validación, permiso, sincronización aplicable, auditoría, impacto en módulos y exportación/explicación coherentes.
Prueba con datos correctos, incorrectos, desconocidos, duplicados, concurrentes y conexión intermitente cuando corresponda.
Documentación de operación y recuperación; aceptación por quien utiliza el proceso.
Una estimación o una dependencia de un proveedor debe conservar su condición visible; no se cierra como medición o integración real.

## Decisiones de negocio pendientes de S0

- Confirmado el 18/11/2026: toda la hacienda es propia. Capitalización/terceros queda fuera de V1; no requiere reparto con terceros.
- Establecimientos/RENSPA efectivos, hectáreas utilizadas y contratos de alquiler; por ahora conservar el ámbito compartido existente.
- Ejercicio/temporadas, política de valuación y asignación de costos, unidades y categorías propias.
- Cuentas, documentos, deuda/aportes y moneda usados en la práctica; ARS es la propuesta inicial de operación.
- Usuarios, facultades de confirmación, modelos de bastón/balanza y conectividad real.
- Fuentes de mercado/FX aceptadas, formatos bancarios, servicio climático y documentos oficiales requeridos.

Estas decisiones refinan el modelo; no autorizan a llenar campos desconocidos ni a cambiar registros históricos sin revisión.
