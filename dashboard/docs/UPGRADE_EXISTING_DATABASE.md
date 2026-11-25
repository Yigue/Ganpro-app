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
Las migraciones 06–47 se aplican en una sola transacción. Si detecta estructuras
nuevas ya existentes, aborta: no adivina qué actualización parcial se ejecutó.
Ante cualquier error, revisar el mensaje antes de ejecutar otros archivos.
No reemplaza las migraciones originales ni la conciliación de datos anteriores.

Pruebas locales realizadas con PostgreSQL 16:

- Base original 01–05: actualización y preservación de animal y gasto anteriores.
- Base original 01–04: creación condicional de proyecciones y actualización completa.
- Segunda ejecución: guardia de actualización existente, sin cambios.
- Caravanas duplicadas entre animales vigentes: falla en 08 y rollback de las tablas/columnas nuevas de 06–07,
  conservando ambos animales originales.

Para los circuitos de insumos y captura móvil, leer INTEGRATED_WORKFLOWS.md.

## Caravanas históricas

Las caravanas visuales se reservan entre ACTIVO/DESCARTE. VENDIDO y MUERTO
conservan sus números históricos, aunque luego se reutilicen. RFID permanece
único globalmente. No se renombran, fusionan ni eliminan animales para migrar.
Los comandos resuelven la caravana contra el animal activo, no contra el primer
registro histórico. Un CSV no crea automáticamente otro animal con un número
cerrado: requiere revisión y alta explícita. Anular una venta se rechaza si la
reactivación chocaría con una caravana ya reasignada.

Se verificó el upgrade con 25 pares activo/vendido, conservando los 50 IDs,
números, estados y RFID. El selector del cliente móvil también prioriza al
activo y rechaza ambigüedades; ese cambio requiere recompilar/actualizar la app.
La función de selección se prueba sin instalar Expo. No se realizó un build
completo de Expo ni una prueba en un dispositivo físico.
