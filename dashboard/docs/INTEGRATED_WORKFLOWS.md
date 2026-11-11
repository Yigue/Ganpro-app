# Gestión integrada del establecimiento

Todo el trabajo corresponde a Ganpro-app, rama base v1, carpeta dashboard.
La pantalla `/gestion` reúne Insumos, Reproducción, Pastoreo, Inventarios,
Bancos, Comprobantes y Plan frente a real; los módulos originales enlazan a ella.

## Circuitos implementados

- **Sanidad y traslados**: cada nueva aplicación fija los animales alcanzados y
  su cantidad. Cambiar de lote no quita el retiro; ingresar después no agrega al
  animal a un tratamiento que no recibió. Los registros fijados no se reescriben.
  Las aplicaciones anteriores sin destinatarios fijados conservan una regla de
  consulta histórica; deben revisarse si faltan altas o traslados anteriores.
- **Insumos**: declarar apertura física y valor sin crear caja. Los alimentos se
  vinculan con suplementos nativos y deben coincidir con sus existencias.
  Medicamentos con apertura requieren partida y vencimiento. La compra incorpora
  existencias, partida y obligación financiera en una transacción; puede incluir
  pago inmediato en una cuenta. El consumo usa costo medio ponderado conservado.
  Nunca recorta a cero una cantidad insuficiente ni repite el pago al consumir.
- **Nutrición**: guardar una fórmula reemplaza sus ingredientes juntos. Una
  entrega se imputa a un lote en el potrero, descuenta todos los ingredientes y
  guarda su costo. Si uno falla, no queda entrega ni descuento parcial.
- **Medicamentos**: la aplicación usa la partida elegida del producto vinculado,
  controla vencimiento y descuenta dosis por animal alcanzado. El costo queda
  ligado al tratamiento. No se descuenta por segunda vez desde un pago.
- **Costos**: compras de existencias no se presentan además como gasto de consumo.
  El análisis económico incorpora consumos históricos; caja sigue usando sus
  asientos reales. Las aplicaciones sin inventario usan el costo conservado al
  registrarlas, sin multiplicar por el tamaño actual del lote.
- **Reproducción**: ciclo individual vinculado al servicio, madre y padre conocido;
  tacto, parto, pérdida y destete. El parto crea una sola cría con genealogía y
  evento nativo. El destete registra peso. Una cría activa no se elimina al cerrar
  una pérdida: registrar primero su baja real en Movimientos.
- **Pastoreo**: planes con fechas, forraje disponible, remanente, consumo por EV y
  descanso; rechaza superposiciones y disponibilidad insuficiente. Entrada y
  salida generan traslados, y la salida inicia el descanso. No son mediciones
  automáticas de pasto ni un sistema de sensores; los datos son declarados.
- **Inventarios**: cortes físicos de hoy, con peso y precio declarado de todas las
  categorías, y existencias de insumos conciliadas. Se conservan filas y valores;
  no se reconstruye un pasado usando el rodeo actual. El segundo corte permite
  comparar producción registrada, variación de hacienda y resultado de gestión.
  El intervalo usa operaciones capturadas entre cortes, no una liquidación fiscal.
  Faltas de kilos no se presentan como producción cero. Revisar ajustes tardíos,
  cambios de precio y gastos no cargados antes de dar por cerrado un ejercicio.
- **Bancos**: CSV semicolon con fecha, referencia, descripción e importe firmado;
  valida que apertura más movimientos sea igual al cierre. Cada referencia es
  única por cuenta. La conciliación es explícita, misma cuenta e importe, un
  asiento por renglón. Muestra pendientes y diferencia entre banco y libro.
  No se conecta a bancos externos ni deduce pagos solo por encontrar un importe.
- **Comprobantes**: PDF/PNG/JPEG hasta 4 MB, firma binaria validada, bucket privado,
  asociación con obligación y descarga autenticada con enlace de 60 segundos.
  Upload y transacción de DB son sistemas separados: si falla el vínculo puede
  quedar un archivo huérfano privado. No se declara guardado hasta confirmar DB.
- **Planes**: escenario y líneas se guardan juntos; se preservan líneas reales.
  El cierre incluye consumos, sin repetir compras de insumos. Las comparaciones
  muestran importe, cabezas, kilos, precio y fecha. No permite borrar un escenario
  con líneas realizadas ni inventar dinero para convertir un plan en realidad.
- **Configuración**: las categorías se validan y actualizan juntas. Reproducción
  distingue fallas de lectura de una caravana inexistente y valida toros y fechas.

## Adopción

Aplicar migraciones aditivas 25–44 después de las anteriores, primero en copia de
la base. No se ejecutaron en Supabase/Vercel reales. La 37 crea bucket y políticas
cuando existe Supabase Storage. No publicar el bucket ni dar permisos anónimos.
Administradores gestionan cortes y conciliación bancaria; campo administra la
operación; asesor mantiene solo lectura. Los helpers SQL no son RPC públicos.

El protocolo móvil continúa en v3 y sus tablas se conservan. Las nuevas tablas
administrativas no son parte de ese sync. Para insumos incorporados al libro, no
se aceptan cambios directos a stock_kg desde clientes antiguos. Una aplicación de
un medicamento gestionado requiere indicar insumo y partida desde el dashboard.
Antes de usar esos circuitos offline, actualizar la captura móvil o dirigirlos al
dashboard; no ignorar conflictos ni descartar silenciosamente movimientos del celular.

Compras de inventario no se anulan desde el formulario genérico de obligaciones:
se rechaza para no dejar existencias sin comprobante. Una devolución comercial,
notas de crédito y liquidación fiscal requieren su circuito específico; no se
simulan con borrados. Revisar y conciliar gastos anteriores al adoptar los saldos.

## Verificación

Las migraciones se ensayan desde una base vacía y con PostgreSQL real. Los tests
cubren concurrencia, rollback, retiro tras traslado y altas posteriores, consumo,
partidas vencidas, genealogía, rotaciones, cortes, banco y permisos de archivos.
El navegador usa Next/Supabase SDK/PostgREST/PostgreSQL reales, con APIs locales
emuladas de Auth y Storage. Las políticas Storage sí se ejecutan con RLS real;
esto no certifica el servicio Storage/GoTrue productivo ni un teléfono offline.
