# Flujo de campo: animales, lotes, operaciones y clima

## Lote y potrero

- **Lote ganadero:** grupo de animales que se maneja junto, por ejemplo recría 2026
  o vacas preñadas. Se crea desde Stock → Nuevo lote, con nombre y descripción.
- **Potrero:** superficie física con límite, hectáreas y recurso. Se dibuja en Mapa.
- Un animal tiene una pertenencia a lote y una ubicación en potrero; un traslado
  puede cambiar una, otra o ambas. Un lote no exige dibujar otra superficie.
- Se conservan las columnas antiguas de superficie/alquiler/ubicación del lote para
  compatibilidad con el móvil v3 y costos anteriores. Quedan como datos
  administrativos opcionales; no se copian ni convierten geometrías existentes.

`stock.lot-save` aplica idempotencia, auditoría, nombre no duplicado y versión al
editar. La creación no modifica cabezas ni produce un movimiento financiero.

## Altas e identidad

Stock → **Nuevo animal** ofrece con caravana visual o sin caravana (una o varias
cabezas). Modo manga y CSV siguen disponibles. El alta inicial declara existencias
anteriores; no equivale a un nacimiento o una compra. Cada cabeza genérica tiene ID
propio. Asignarle después una visual/RFID conserva esa ficha y sus antecedentes.

La categoría configura el sexo: Vaca y Ternera son hembras, Toro y Ternero machos.
El formulario sólo pide sexo cuando la categoría está configurada como mixta.
PostgreSQL vuelve a validar la combinación aunque se altere el formulario.

La selección de movimientos filtra por categoría, lote, identificación o referencia.
Permite seleccionar todos los filtrados y una cantidad de genéricos, sin tener que
marcar cada uno. Muestra disponibles y seleccionados por categoría, además de los
seleccionados fuera del filtro. Cambiar a una categoría concreta retiene únicamente
los seleccionados de esa categoría; cambiar de lote no elimina selecciones anteriores.

## Operaciones y efectos

| Registro | Dónde | Efecto |
| --- | --- | --- |
| Stock inicial | Stock → Nuevo animal | Altas individuales, evento ALTA_INICIAL; no compra ni deuda |
| Compra | Movimientos → Compra | Incorpora animales y genera obligación por pagar |
| Venta | Movimientos → Venta | Baja animales y genera obligación por cobrar; controla retiro |
| Nacimiento | Movimientos → Nacimiento | Incorpora crías, sin gasto ni ingreso automático |
| Parto de un ciclo | Gestión → Reproducción | Crea la cría y su nacimiento; no repetir en Movimientos |
| Muerte | Movimientos → Muerte | Baja animales y guarda causa; no cobra ni paga |
| Traslado | Movimientos → Traslado | Cambia lote/potrero; conserva fichas y cantidad de animales |
| Cobro/pago | Pago inmediato o Finanzas | Crea el asiento de la cuenta; no vuelve a mover animales |

El historial reúne eventos reales de stock —incluidas altas, identificación,
pesadas, recategorización— y traslados de otros módulos y de la sincronización.
No se inventan nacimientos a partir de la fecha de nacimiento de una ficha antigua.
No se vuelve a ejecutar una operación sólo para hacerla aparecer en el historial.

## Cotización, desbaste y pago

Por kg: `kg_facturados = round(kg_físicos × (1 − desbaste_pct/100), 2)`;
`importe = round(kg_facturados × precio_unitario, 2)`. El desbaste admitido es 0–20%.
Por cabeza se usa la cantidad real seleccionada y el desbaste debe ser cero.
El peso físico y su promedio siguen registrados por separado del peso facturado.

Ejemplo: 28 cabezas, 5500 kg físicos, 3% de desbaste y 5520 ARS/kg:
5335 kg facturados y 29.449.200 ARS. El servidor recalcula; no confía en un total
modificado en el navegador ni en una cantidad de cabezas declarada por el cliente.

Se conservan condiciones comerciales, método acordado y plazo de 0–365 días.
El plazo calcula el vencimiento al final del día argentino correspondiente. Si
se informa también una fecha explícita, debe coincidir. Un método o plazo pactado
no es un cobro: sin pago inmediato queda una obligación pendiente. Con pago parcial
se registra sólo ese asiento y queda el saldo. Un pago posterior conserva su
método real, sin modificar el método originalmente acordado en el documento.

## Calendario

Abre en Año: doce meses con cantidad de tareas/pendientes. Cada mes abre su vista
compacta; los días abren el detalle completo. Semana y Día conservan las acciones
de aplicar/cancelar. No se expanden todos los formularios dentro de cada casilla.

## Clima y pastura

Seleccionar un potrero dibujado consulta un punto de referencia mediante Open-Meteo.
Se separan siete días recientes modelados y el pronóstico de hoy más seis días.
Lluvia, ET₀, extremos térmicos y viento generan reglas de revisión con umbrales
visibles; las sumas incompletas se muestran sin datos. El balance lluvia−ET₀ no es
humedad medida del suelo ni una estimación de biomasa. La grilla meteorológica
puede representar un área mayor que el potrero y requiere corroboración local.

Las recomendaciones son informativas: no cambian existencias, capacidad de carga,
aplicaciones ni planes. Las consultas tienen límite de tiempo, validación de
unidades y caché de 30 minutos; un error no interrumpe el mapa. Los datos se
atribuyen a [Open-Meteo](https://open-meteo.com/) / CC BY 4.0. Sin clave se utiliza el
endpoint público de evaluación. Revisar sus términos antes de un uso comercial;
`OPEN_METEO_API_KEY` activa el endpoint comercial, sólo desde servidor.

### Análisis satelital pendiente

El fondo satelital no permite medir oferta de pasto por sí solo. Una integración
NDVI requiere una fuente multiespectral (por ejemplo Sentinel-2), fecha de captura,
B04/B08, máscara de nubes/sombras y recorte sobre la versión del polígono. Hay que
separar monte, suelo y pastura y calibrar con muestreos de kg MS/ha por recurso.
Un índice de verdor sin esa calibración no se debe convertir en cabezas admisibles.

Un futuro resultado debería conservar potrero, map_version, fuente, fecha de
captura, cobertura válida/nubes, resolución, índice y distribución. Nunca reemplazar
un dato medido por un índice ni usar una escena vieja como si fuera actual.
No se implementó ni se simuló una medición NDVI en esta entrega.

## Instalación

Migraciones nuevas: 57–60. Para una base con 01–56 completas, ejecutar TODO
`supabase/upgrade-56-to-60.sql`. Si la base todavía está en 44–47, usar el catch-up
actualizado `supabase/upgrade-stock-operations.sql` (45–60). El SQL anterior
`upgrade-47-to-56.sql` conserva exactamente su alcance anterior.

Los scripts comprueban el estado y se detienen ante una actualización parcial o
ya aplicada. No contienen semillas ni eliminan registros. El dashboard verifica
columnas y capacidades del dispatcher antes de escribir para distinguir una base
incompleta de un error de entrada del usuario. No se aplican a producción desde
el proceso de pruebas; ver también COMMANDS_AND_ERRORS.md.
