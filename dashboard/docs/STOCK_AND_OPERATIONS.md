# Stock y operaciones del establecimiento

## Identidad y altas

La tabla de stock usa TanStack para ordenar, paginar y elegir columnas. La
caravana visual o la referencia del animal encabeza la ficha; RFID se mantiene
visible como dato secundario. El filtro de identificación distingue pendientes.

`stock.save` admite una alta individual sin caravana. `stock.generic` incorpora
1–500 animales al stock inicial, con una ficha por cabeza. La referencia interna
`SIN-CARAVANA-…` no es una caravana física. Identificar después conserva ID,
movimientos, parentesco y eventos; se agrega un evento IDENTIFICACION. No se
permite quitar la identificación real de una ficha ya identificada.

Una incorporación inicial no crea compra ni deuda. Para animales comprados,
registrar COMPRA en Movimientos, incluso si todavía no llevan caravana.

## Lectura electrónica

`/stock/manga` acepta un lector en modo teclado/HID con Enter o lecturas pegadas.
No implementa conexión Bluetooth/serie directa del navegador. Admite hasta 500
lecturas por sesión, visual y peso opcionales, omite RFID repetidos y permite
vincular una lectura a un animal pendiente ya existente. El borrador está en
localStorage, separado por usuario; no es una copia de seguridad ni sincroniza
entre equipos. Confirmar requiere conexión y revisión del destino de cada fila.

`stock.readings` valida toda la sesión dentro de `ganpro_command`: un RFID conocido
no crea otra cabeza, un animal vendido/muerto no se reactiva y una vinculación o
pesada sobre una ficha conocida exige versión actual. Las pesadas conservan el
momento de captura y no reemplazan una posterior. Si una fila falla, revierte todo.
La app móvil v3 ya tiene columna RFID: el modelo y los lectores ahora la usan
primero, con compatibilidad para registros antiguos que usaban la visual como RFID.
Actualizar el cliente móvil para recibir este comportamiento. No hubo cambio de
versión del esquema Watermelon ni build completo de Expo/prueba física del lector.

## Movimientos y finanzas

Se eligen animales activos por ficha, con filtro de lote y selección de todos los
filtrados. Esto incluye animales sin caravana. Se conserva la entrada manual de
visuales para quien ya las conoce. Compras/nacimientos sin visual generan fichas
individuales según cantidad; con visuales se usa la cantidad real de la lista.

Ventas y compras permiten cotizar por KG o CABEZA. El servidor calcula importe,
cabezas y categorías desde la selección real; no confía en el total del formulario.
Por cabeza el peso es opcional. Se guardan kg totales, precio unitario, modalidad
y desglose por categoría; el historial muestra también peso promedio. Los registros
anteriores sin esos datos no reciben una cotización inventada.

DTE, contraparte y pago inmediato son opcionales. Registrar el negocio crea una
obligación pendiente; sólo registrar un cobro/pago modifica caja. Todas estas
escrituras siguen recibo, auditoría, bloqueo y errores seguros de
[COMMANDS_AND_ERRORS.md](COMMANDS_AND_ERRORS.md).

## Gestión, sanidad y mapa

Gestión integrada abre con carga rápida y accesos por operación. El menú agrupa
campo, producción, economía y administración; Finanzas destaca Registrar operación.

El calendario permite mes, semana y día con fecha de negocio argentina. Aplicar
una tarea abre el formulario ya asociado al producto/destino y recién completa la
programación al registrar la aplicación real, sus destinatarios y retiro. Cancelar
no crea una aplicación. Una programación completada no se vuelve a aplicar.

El mapa actualiza sus capas vectoriales cuando el estilo está listo, aunque las
imágenes del fondo estén pendientes. La geometría guardada se restaura al recargar
y al cambiar de capa. Los montes conservan tipo/color y ficha de superficie/stock.
Reproducción agrega resumen de vientres, último tacto y servicio por lote; sin tacto
no significa vacía y no se infiere una preñez posterior a un parto.

## Migraciones y validación

En una base con 01–47 completas, aplicar `supabase/upgrade-47-to-56.sql` completo o 48–56 en orden, sin seeds. Si sólo están
las originales 01–04, usar `supabase/upgrade-existing.sql` regenerado. El bundle
rechaza bases parcialmente actualizadas: no ejecutar sobre una base con 06+
instaladas. Para Supabase CLI usar las migraciones individuales pendientes.

Pruebas de PostgreSQL verifican alta/vinculación sin duplicados, rollback,
cotización y destinatarios de aplicaciones. Las pruebas de navegador usan Next,
PostgREST y RLS reales sobre PostgreSQL local; Auth/Storage son emulados. No
constituyen prueba sobre Supabase/Vercel reales ni sobre un bastón físico.

### Dashboard nuevo con base anterior

Si sólo se actualizó Vercel, un alta genérica o una venta seleccionada por ficha
puede devolver GANPRO_INVALID_INPUT desde el dispatcher anterior. No indica que
el peso, el precio o la selección sean inválidos. Antes de enviar estas escrituras,
el dashboard comprueba con consultas de cero filas las columnas del contrato
nuevo; si faltan, indica actualización pendiente y no intenta la operación.
Una caída de red o un rechazo de permisos conserva el tratamiento de error técnico.

`supabase/diagnostics/stock-operations.sql` es sólo lectura y distingue columnas,
funciones y dispatcher instalados. Para una base con 01–47 completas, ejecutar TODO
`supabase/upgrade-47-to-56.sql` en una sola consulta. No ejecutar semillas ni el
bundle inicial de 01–04. El incremental se detiene si 48+ ya está instalado:
si hay un estado parcial, revisar las migraciones pendientes en lugar de repetirlo.
Después de confirmar, volver a abrir los formularios antes de reintentar.

Casos de regresión: una Vaca/Hembra sin caravana ni lote/potrero con 180kg;
venta de 28 animales con 5500kg a 5520 ARS/kg = 30.360.000 ARS, sin contraparte
ni pago inmediato. La segunda crea una obligación por cobrar y no un cobro.

Si la base está en 44–47 y sólo se actualizó Vercel, se puede utilizar
`supabase/upgrade-stock-operations.sql` como actualización única: reinstala las
funciones históricas 45–47 y aplica 48–56 en la misma transacción. No acepta bases
con cambios 48+ parciales o ya completos. El diagnóstico debe mostrar
`base_44_instalada=true` y los módulos nuevos aún ausentes. No cambia visuales ni
fusiona animales; conserva la regla de históricos activos/vendidos.

Las operaciones efectivas de hoy usan su hora de registro en Argentina. Así una
venta, aplicación, cobro o pago no se retrofecha a las 12:00 antes de un alta o
movimiento hecho durante la tarde. Las fechas históricas conservan la convención
anterior y un vencimiento abarca el día completo; no se reescriben fechas guardadas.
