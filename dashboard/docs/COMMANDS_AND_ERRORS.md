# Comandos, eventos y errores del dashboard

Alcance: Ganpro-app/v1/dashboard. PostgreSQL/Supabase es compartido con la app
WatermelonDB v3. No introducir modelos de organizaciones ni service role en formularios.

## Agregar una operación

1. Definir tipos y schema Zod en un módulo pequeño antes de la lógica.
2. Crear una server action con `crearAccion(schema, handler, {name, roles, revalidate})`.
   Los roles de escritura son admin/campo; asesor solo lee. El servidor vuelve a validar.
3. Usar `FormDialog` o `useAccion` para enviar `_commandKey`. La clave permanece
   estable ante una respuesta perdida y se renueva después de éxito confirmado.
4. Para stock/caja usar `runOperation(supabase, 'nombre.operacion', datos)`.
   Agregar el nombre al dispatcher SQL y una función privada con tipos explícitos.
5. Dentro de la misma transacción validar referencias, estado, carencia, fechas,
   versión y permisos; confirmar todas las filas y auditoría juntas.
6. Revalidar las páginas afectadas después del commit. Un fallo de caché no debe
   informar que la escritura falló. No reintentar automáticamente escrituras.
7. Probar rollback tardío, clave repetida, concurrencia, asesor/anónimo y sync móvil.

`ganpro_command` toma un bloqueo transaccional compartido con sincronización,
verifica rol desde perfiles, guarda recibo actor/nombre/fingerprint/resultado y
rechaza reutilizar una clave con otro contenido. Los helpers no son RPC públicos.
La clave evita duplicaciones por reenvío; no sustituye las reglas del negocio.
Para edición usar la versión recibida del servidor, nunca inventar una nueva.

`applyBatch` sirve para escrituras simples permitidas en varias tablas, dentro de
una transacción. No puede escribir caja ni comprobantes comerciales. Los cambios
de stock y pagos deben usar su comando específico.

## Clasificación de errores

- `InputError`: validación de datos del usuario, mensajes por campo públicos.
- `DomainError`: código de negocio incluido en la lista de mensajes públicos.
- `databaseError`: solo reconoce un mensaje EXACTO `GANPRO_CODIGO` permitido;
  textos SQL, detalles del proveedor y errores desconocidos quedan internos.
- `DataError`: indisponibilidad de DB/API o salida externa inválida; devuelve un
  mensaje general y `requestId`. Nunca devolver `error.message` del proveedor.
- Redirect/notFound de Next conservan su control de flujo.

`requestJson` limita el tiempo de espera y valida la salida externa con Zod.
Una salida inválida del proveedor no es un error de input del usuario.
Los formularios muestran validaciones, conflictos y una referencia para fallos
operativos. No incluyen SQL, URL, stack, tokens, credenciales ni payloads.

## Eventos y diagnóstico

`executeCommand` emite started/succeeded/failed con nombre, referencia, duración
 y código seguro. Se registran como JSON en los logs del servidor (Vercel Logs en
el despliegue); no existe una consola técnica pública en el dashboard.
Los observadores son telemetría: una excepción suya no cambia un commit exitoso.
No hacer desde ellos ventas, pagos, modificaciones de stock o emails.

La auditoría de negocio es `command_audit`, escrita por triggers en la transacción,
con actor, origen, clave y antes/después. Contiene datos del establecimiento y su
lectura requiere perfil autenticado. Los recibos no tienen política de lectura
para clientes. La app móvil conserva su identidad de sync por clave; su auditoría
no atribuye una persona que el protocolo v3 no transmite.

## Contratos del campo

- `potreros` son superficies físicas; `lotes` son agrupaciones ganaderas.
- Venta/compra actualizan animales, eventos y obligación financiera juntos.
- El cobro/pago crea asientos; la obligación por sí sola no altera caja.
- Transferencias y saldos de apertura no son ingresos/gastos.
- Correcciones: reversión de pago y anulación con controles; no borrar historial.
- Las fechas de negocio usan Argentina; timestamps móviles continúan en ms.
- El área del mapa se calcula en servidor. Es aproximada y no una mensura legal.

## Verificación local

`npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
Para PostgreSQL, navegador y limitaciones del arnés ver `TESTING.md`.
Para aplicar migraciones y conciliar datos anteriores ver `DEPLOYMENT.md`.

Los comandos `supply.*`, `nutrition.*`, `repro.*`, `grazing.*`, `inventory.close`, `bank.*`, `scenario.*` y `document.attach` siguen el mismo dispatcher y recibo. Ver INTEGRATED_WORKFLOWS.md para reglas, compatibilidad móvil y límites del upload.
