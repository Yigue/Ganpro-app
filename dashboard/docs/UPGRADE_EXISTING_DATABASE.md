# SQL único para una base existente

Archivo generado: `supabase/upgrade-existing.sql` (no editar a mano).
Regenerar con `npm run db:upgrade:bundle`, desde las migraciones originales.
El archivo es un artefacto de distribución completo; no un módulo SQL nuevo.

1. Respaldar la base y probar primero sobre una copia.
2. Abrir el archivo completo en GitHub y usar **Copy raw file / Raw**.
3. Pegar todo junto en Supabase → SQL Editor del proyecto correcto y ejecutar.
4. Al terminar, finanzas_instaladas, gestion_instalada y ultima_migracion_instalada
   deben devolver true. Luego recargar el dashboard.

Requiere el esquema original 01–04. Incluye 05 solo si sus dos tablas faltan.
Las migraciones 06–44 se aplican en una sola transacción. Si detecta estructuras
nuevas ya existentes, aborta: no adivina qué actualización parcial se ejecutó.
Ante cualquier error, revisar el mensaje antes de ejecutar otros archivos.
No reemplaza las migraciones originales ni la conciliación de datos anteriores.

Pruebas locales realizadas con PostgreSQL 16:

- Base original 01–05: actualización y preservación de animal y gasto anteriores.
- Base original 01–04: creación condicional de proyecciones y actualización completa.
- Segunda ejecución: guardia de actualización existente, sin cambios.
- Caravanas duplicadas: falla en 08 y rollback de las tablas/columnas nuevas de 06–07,
  conservando ambos animales originales.

Para los circuitos de insumos y captura móvil, leer INTEGRATED_WORKFLOWS.md.
