# Adopción y despliegue

Este PR no aplica cambios a Supabase ni publica Vercel. Antes de habilitarlo:

1. Respaldar y ensayar una copia de la base actual, incluyendo tablas móviles.
2. Aplicar las migraciones del dashboard en orden. Las 01–05 ya existentes no se
   reejecutan en una base que las tiene registradas. Las nuevas son 06–24.
3. Si hay caravanas/RFID duplicados, la migración 08 se detiene: resolverlos con
   el responsable del campo, conservando trazabilidad; no fusiona datos sola.
   Los FK NOT VALID preservan huérfanos anteriores para conciliación explícita;
   revisar esos registros y luego VALIDATE CONSTRAINT. No declarar datos limpios
   solo porque la migración termina.
4. Probar pull/push con una copia del celular antes de producción. Se conserva
   esquema v3 y tablas nativas, pero ahora se rechazan duplicados y conflictos
   también en altas/bajas. Conservar las claves de sync solo en servidor/celular.
5. Desplegar el dashboard con las variables Supabase existentes, usando Node 22.
   No exponer service role ni incluir archivos de pruebas en credenciales reales.
6. Conciliar movimientos anteriores desde Finanzas. Declarar lo ya pagado/cobrado
   y la fecha de adopción. Se adopta la misma fila, sin duplicar ingresos/gastos
   ni generar dinero ficticio. Registrar saldos iniciales de caja por separado.
7. Comparar stock, deudas y caja con los registros del establecimiento. Recién
   entonces tomar estos saldos como base operativa. Cerrar períodos revisados.

## Límites explícitos

- Un establecimiento compartido (id=1), roles nativos admin/campo/asesor.
- Importes del libro en ARS con centavos; no es contabilidad fiscal completa,
  facturación electrónica ni conciliación bancaria automática.
- El análisis económico conservado usa datos históricos originales. El margen
  es parcial sin inventario de apertura/cierre validado; no es rentabilidad final.
- Valuación por pesos promedio y precios configurados, estimativa. Sin un precio
  o peso de categoría, no se presenta un total completo. El histórico de cabezas
  usa altas/bajas registradas y categoría actual; no reconstruye categorías pasadas.
- Registros móviles v3 anteriores siguen fuera del libro nuevo hasta conciliación.
  La app móvil no incorpora en este PR los formularios de cuentas/asientos.
- Mapas necesitan WebGL e Internet; proveedores externos pueden fallar. Capas
  calles/CARTO-OSM, satélite/Esri y relieve/OpenTopoMap conservan atribuciones.
  Geometría simple sin agujeros ni cruce de antimeridiano; área esférica aproximada.
- No incluye integración oficial SIGSA/DTE ni elimina las herramientas existentes.
- Los módulos avanzados de reproducción/nutrición/proyección se conservan; no se
  presentan como una auditoría exhaustiva del ERP ni como cierre contable.

No revertir migraciones eliminando tablas con movimientos reales. Una reversión
requiere respaldo, conciliación y un plan específico de preservación de datos.
