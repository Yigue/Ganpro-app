# Validaciones, permisos y correcciones

Política funcional objetivo. La interfaz ayuda, el servidor decide y PostgreSQL conserva las invariantes de la confirmación.
Validación de usuario: mensaje por campo y valores conservados. Conflicto de negocio: explicar qué revisar. DB/API: referencia y diagnóstico interno sin detalles técnicos expuestos.

## Reglas verificables

| ID | Regla | Respuesta esperada |
| --- | --- | --- |
| V01 | Identidad técnica permanente, identificadores como texto con ceros iniciales | Identificar un genérico no crea otra ficha |
| V02 | Visual según reserva de animales vigentes; RFID único según contrato | Reutilización histórica revisada, nunca fusión silenciosa |
| V03 | Categoría/sexo compatibles con configuración | Inferir sexo sólo cuando está determinado; pedirlo en categoría mixta |
| V04 | Cantidad entera positiva y selección de cabezas concretas | Total/categorías se recalculan desde registros reales |
| V05 | Pesos positivos, unidad y procedencia conocidas | Diferenciar colectivo/promedio de observación individual |
| V06 | Pesada anómala por diferencia/tiempo | Advertir y pedir revisión; no alterar otra medida ni inferir crecimiento automáticamente |
| V07 | Venta/muerte requiere existencia válida | Rechazar doble baja y selección desactualizada, sin efectos parciales |
| V08 | Retiro vigente entre destinatarios históricos | Bloquear confirmación de venta y mostrar la misma causa en todas las vistas |
| V09 | Lote y potrero existentes con pertenencia/ubicación a la fecha | Traslado equilibrado, sin cambiar el consolidado |
| V10 | Fecha efectiva, captura y confirmación separadas | Respetar orden, zona argentina y períodos; revisar reloj móvil desviado |
| V11 | Precio/importe/moneda y modalidad consistentes | Cálculo autoritativo del servidor, con precisión decimal |
| V12 | Desbaste admisible según contrato por kg | Kg facturados separados de kg físicos; por cabeza no aplicar un desbaste ficticio |
| V13 | Gastos/comisiones y compensaciones identificados | Una deducción no se cuenta dos veces ni desaparece del resultado |
| V14 | Plazo/vencimiento/entrega congruentes | Si se informan plazo y fecha deben coincidir; reprogramación auditada |
| V15 | Pago parcial no supera saldo válido | Actualizar asiento y pendiente juntos; conservar método real |
| V16 | Transferencia es entre cuentas diferentes y pertenece al ámbito autorizado | No crear ingreso/gasto operativo por mover dinero propio |
| V17 | Documentos y movimientos confirmados vinculados | Revertir con motivo y controles; no borrar su historial |
| V18 | Cohorte reproductiva explícita | Traslados/compras posteriores no cambian retrospectivamente los vientres expuestos |
| V19 | Parto/destete no duplican cría ni evento | Validar madre/ciclo/fechas cuando se conocen; marcar desconocidos |
| V20 | Aplicación y partida compatibles, dosis/unidad y destinatarios claros | Consumo y retiro confirmados una vez; tarea cancelada no aplica |
| V21 | Insumo disponible, unidad compatible y partida válida | Rechazar stock negativo y caducidad; considerar el día completo de vigencia acordado |
| V22 | Compra de inventario, consumo y pago separados | Costo económico con origen único, caja según pagos efectivos |
| V23 | Población/período de indicador explícitos | No usar stock de hoy para representar sin etiqueta otro ejercicio |
| V24 | Ausencia de dato no equivale a cero | Mostrar sin datos y cobertura; excluir de la métrica que exige ese dato |
| V25 | Reenvío de la misma operación con igual contenido | Devolver recibo; clave repetida con contenido distinto requiere revisión |
| V26 | Edición sobre versión recibida | Conflicto visible; no sobreescribir una modificación concurrente |
| V27 | Importación con esquema/fuente y fila de origen | Previsualización, errores/duplicados y resumen; no omitir filas silenciosamente |
| V28 | Credencial, usuario, dispositivo y capacidad autorizados | El cliente no elige libremente el actor de la auditoría |
| V29 | Dato externo válido, unidad/fecha/cobertura | No guardar salida malformada ni tratar un fallo del proveedor como error del usuario |
| V30 | Recomendación o escenario | Separar de hechos; mostrar impacto antes de convertirlo en operación |
| V31 | Escritura con efectos múltiples | O confirma todo, o no deja ninguna parte; errores de caché posteriores no repiten la venta |
| V32 | Actualización de esquema/cliente | Verificar compatibilidad antes de usar una función nueva; sin reset de datos |

## Bloqueo frente a advertencia

Bloquear: violación de existencia, identidad, retiro, saldo, permisos, transacción, versión o referencia obligatoria.
Advertir: peso inusual, fecha histórica permitida, falta de lote opcional, estimación antigua o cobertura insuficiente.
No exigir RFID, fecha de nacimiento o campos administrativos desconocidos para toda alta. Sí exigir los datos necesarios para el proceso y la modalidad elegidos.
Una acción masiva muestra población, filtros y seleccionados fuera de filtro; no elimina selecciones ocultamente ni confirma sólo algunas cabezas sin informarlo.

## Permisos propuestos por capacidad

Hoy hay roles admin/campo/asesor. La siguiente es una política objetivo para refinar, no roles ya implementados.

| Papel | Campo y producción | Comercial | Caja/empresa | Maestros/cierres |
| --- | --- | --- | --- | --- |
| Responsable/administrador | Gestionar y corregir | Confirmar y revertir | Gestionar y conciliar | Aceptar y administrar permisos |
| Administración | Consultar y revisar vínculos | Cargar/confirmar según delegación | Cobrar/pagar y conciliar | Preparar cortes; aprobación según política |
| Encargado de campo | Gestionar hechos y conflictos de manejo | Preparar operaciones; confirmar sólo con delegación | Acceso mínimo necesario | Mantener maestros operativos autorizados |
| Operario | Capturar tareas/lecturas/hechos asignados | Borrador/captura, no autorización implícita de caja | Sin acceso general por defecto | Sin cierres ni credenciales ajenas |
| Asesor | Consulta técnica y análisis autorizado | Según acceso concedido | Consulta financiera sólo si se concede | Sin escrituras por ser lector |

Asignar capacidades a usuarios/dispositivos sin romper clientes anteriores; la transición requiere pruebas y migraciones específicas.
La autorización debe ejecutarse también en API, RPC, exportaciones y archivos privados; ocultar un botón no alcanza.

## Correcciones y trazabilidad

Borrador: modificar/cancelar sin afectar existencias confirmadas.
Confirmada: proponer ajuste/reversión con motivo, alcance y vínculos posteriores; el servidor vuelve a validar.
Período cerrado: política de reapertura autorizada o ajuste posterior, preservando el informe original.
Hecho físico offline rechazado: conservar captura y conflicto para resolución; no fingir que el animal no murió o que no recibió tratamiento.
Una solicitud comercial pendiente no garantiza reserva, venta, retiro libre ni cobro hasta recibir confirmación.
