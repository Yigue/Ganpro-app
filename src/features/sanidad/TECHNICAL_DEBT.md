# Sanidad - Deuda Técnica

## [SAN-01] DatePicker nativo para programaciones
- Qué falta: Reemplazar TextInput de fecha por DateTimePicker nativo
- Requiere: @react-native-community/datetimepicker
- Estimado: 2h

## [SAN-02] Alertas visuales de período de carencia
- Qué falta: Badge/banner en ficha del animal cuando tiene carencia activa
- Contexto: La carencia se guarda en operation_logs.fecha_fin_carencia. Falta cruzar con la fecha actual para mostrar alerta.
- Estimado: 3h

## [SAN-03] Bloqueo de carencia en EventActionSheet (Módulo Scan)
- Qué falta: En src/features/scan/EventActionSheet.tsx, consultar si el animal tiene carencia activa antes de permitir registrar vacunación
- Detalles en Plan.md Phase 1.2
- Estimado: 4h

## [SAN-04] Exportar reporte de historial sanitario
- Qué falta: Botón exportar CSV/PDF del historial de operation_logs
- Requiere: expo-file-system + expo-sharing
- Estimado: 5h

## [SAN-05] Filtros avanzados en historial (rango de fechas custom)
- Qué falta: Actualmente el filtro de mes es navegación simple. Agregar DateRangePicker para rangos custom
- Requiere: @react-native-community/datetimepicker
- Estimado: 3h

## [SAN-06] CRUD de categorías desde UI
- Qué falta: Actualmente las categorías se seedean con valores por defecto. No hay pantalla para que el usuario cree categorías propias.
- Las categorías con es_sistema=true no son editables. Las custom sí.
- Estimado: 2h

## [SAN-07] Notificaciones IATF
- Qué falta: Al guardar un protocolo con etapas, schedular notificaciones push para cada etapa
- Detalles en Plan.md Phase 1.3
- Estimado: 4h

## [SAN-08] Filtro por tipo en historial — join con operation_logs
- Qué falta: operation_logs no almacena el tipo directamente. Para que los chips de tipo filtren correctamente,
  hay que enriquecer el modelo OperationLogModel con la relación a OperationCatalogModel y filtrar
  por tipo del catálogo. Actualmente el filtro de mes funciona pero el filtro por tipo es pass-through.
- Opciones: (a) desnormalizar el campo tipo en operation_logs, (b) usar join en withObservables
- Estimado: 2h
