# Dashboard - Deuda Técnica

## Módulo Operativo

### [TASK-01] DatePicker real para tareas
- Qué falta: Reemplazar TextInput de fecha límite por `DateTimePicker` nativo
- Por qué se dejó: Requiere instalar `@react-native-community/datetimepicker`
- Estimado: 2h

### [TASK-02] Drag & drop para reordenar tareas
- Qué falta: Poder reordenar tareas manualmente
- Requiere: `react-native-drag-sort` o `react-native-reanimated` drag gestures
- Estimado: 4h

### [TASK-03] Asignación de responsable a tareas
- Qué falta: Campo `assigned_to` en tabla tasks + UI para asignar persona
- Estimado: 3h + backend para usuarios

### [CHART-01] Gráfico de barras de evolución de pesajes mensuales
- Qué falta: Gráfico en Tab Operativo mostrando kg promedio por mes
- Por qué se dejó: Requiere agregación de datos de eventos tipo PESAJE por mes
- Estimado: 4h

## Módulo Financiero

### [FIN-01] CRUD de Categorías Financieras
- Qué falta: Pantalla de administración para crear/editar/eliminar categorías financieras
- `FinancialCategoryModel` y tabla DB están listos
- Por qué se dejó: No es crítico para MVP
- Estimado: 3h

### [FIN-02] Exportar a PDF/CSV
- Qué falta: Botón "Exportar Reporte" funcional
- Requiere: `expo-file-system` + `expo-sharing` o `react-native-pdf`
- Estimado: 6h

### [FIN-03] Filtro por rango de fechas
- Qué falta: DateRangePicker para filtrar historial por período custom
- Por qué se dejó: Requiere DatePicker nativo + lógica de rango
- Estimado: 4h

### [FIN-04] Relación formal category_id en movimientos_financieros
- Qué falta: Agregar columna `category_id` FK en `movimientos_financieros` que referencie `financial_categories.id`
- Por qué se dejó: Breaking change en schema existente. Requiere migración de datos y versión DB + 1
- Impacto: Actualmente la categoría se guarda como string libre
- Estimado: 3h + migración de datos

### [FIN-05] Proyección y rentabilidad por lote
- Qué falta: Cálculo de ROI por lote, costo por kg ganado, margen bruto estimado
- Por qué se dejó: Requiere integrar con `precios_mercado` y `agregados_financieros`
- Estimado: 8h
