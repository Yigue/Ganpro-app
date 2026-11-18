# Conectores, documentos y fuentes para investigar

Un conector es una integración con contrato, procedencia, validación y responsable, no un botón con el nombre de un proveedor.
Estado indicado respecto al código revisado; acceso real, licencias, costos y acuerdos no se verificaron para proveedores nuevos.

| Conector | Situación actual | Capacidad objetivo / prioridad |
| --- | --- | --- |
| App móvil ↔ servidor | Sync v3 de tablas, clave compartida y capacidades desiguales | Comandos/recibos, identidad por dispositivo y resolución de conflictos; P0 |
| RFID / bastón | Captura móvil y modo teclado/HID/pegado/CSV en dashboard | Modelos/formatos homologados, ceros iniciales, asociación con ficha y metadatos de lectura; P1/P2 |
| Balanza | Entradas de peso/CSV; no se identificó un protocolo común de equipos | Captura individual/colectiva con unidad/calibración/origen; CSV controlado primero, conexión directa según equipo; P2 |
| Bancos | CSV y conciliación de asientos existentes | Perfiles de archivos por banco, duplicados, fechas y comprobación de saldos; APIs sólo con disponibilidad/autorización confirmadas; P1/P2 |
| Clientes/proveedores/documentos | Contraparte de texto y archivos privados | Terceros estables, liquidaciones, documentos y búsqueda por operación; P1 |
| Cotizaciones de hacienda / FX | Precios manuales/CSV con fuente; etiqueta API_MAG no prueba descarga automática | Registro de fuentes, categoría/unidad/moneda/fecha, freshness y descarga autorizada si existe proveedor; P2 |
| Clima | Open-Meteo por punto del potrero, datos modelados y umbrales | Separar pronóstico, modelado e instrumentos propios; cortes y condiciones de uso por proveedor; P2 |
| SENASA / SIGSA / DTE | Registro/importación y conciliación de información; no se identificó emisión oficial automática | Plantillas y respaldo verificables; evaluar API/permiso/alcance antes de prometer sincronización oficial; P2 |
| Fuentes técnicas | Sin espacio de investigación documental identificado | Biblioteca con cita, fecha, autor, archivo/enlace y vínculo con preguntas/escenarios; P2 |
| Satélite / NDVI | Fondo raster del mapa; sin medición NDVI | Escenas multiespectrales, fecha/nubes/polígono y calibración con muestreo de pastura; piloto P3 |
| Exportación contable | Exportación financiera y documentos | Exportaciones de gestión para el profesional; facturación fiscal/contabilidad formal fuera de V1 |

## Contrato mínimo de una fuente

Proveedor y tipo; responsable de carga; método/API/CSV/instrumento; fecha de observación y consulta; área/población cubierta.
Unidad/moneda/base de precio; calidad, antigüedad, licencia/acceso; versión/digest de importación y registros afectados.
Distinguir precio por kg vivo, por cabeza y otra base: no comparar una cotización distinta sin conversión justificada.
El dato original se conserva y una normalización no borra su procedencia. Un fallo no reemplaza el dato por uno ficticio.

## Flujo de importación

Archivo/respuesta → validar formato/fuente → normalizar → previsualizar filas/duplicados/efectos → confirmar → recibo e informe.
Mostrar filas aceptadas, rechazadas y pendientes con motivo; cero filas omitidas silenciosamente.
Repetir un archivo no duplica operaciones; vincular movimientos con documentos, identidades y corte de origen.
Para volúmenes altos usar staging/trabajo con progreso y conciliación final; no una transacción parcial escondida detrás de “Guardado”.

## Webhooks y conectores automáticos futuros

Autenticar origen, deduplicar por ID externo, validar versión/firmas y mantener registro de recepción/procesamiento.
Los efectos críticos usan el comando de negocio; el callback de red no modifica directamente stock/caja.
Reintentar sólo fallos transitorios. Una cola de revisión muestra los rechazos funcionales y su responsable.
Las credenciales se administran en servidor y por ámbito; no se exponen en navegador, archivos de informes o logs.

## Investigación y contenido externo

Cada hallazgo guarda fuente, fecha, alcance, pregunta y cómo se usó. Un artículo no se convierte en una medición de la empresa.
Extraer hipótesis o escenarios requiere indicar qué supuesto viene de afuera y qué dato es propio.
No afirmar una recomendación universal por correlaciones de pocos animales o datos no comparables.
Una recomendación técnica sensible se revisa con el profesional responsable; el asistente no realiza aplicaciones ni pagos autónomos.

## Decisiones de factibilidad antes de desarrollar una integración

- Modelo y salida real de cada lector/balanza, muestra de archivo y condiciones de uso en campo.
- Proveedor de mercado/FX aceptado por el administrador, actualización necesaria y acceso autorizado.
- Bancos y formatos efectivamente utilizados; no asumir API de movimiento bancario pública.
- Qué trámite/documento oficial se requiere y qué acceso existe, conservando alternativa manual trazable.
- Plan de clima/uso comercial cuando corresponda; no se garantizó un servicio de terceros con esta planificación.
- Para NDVI: recurso, muestreo, resolución, nubes, frecuencia y metodología; un monte verde no equivale a pastura disponible.
