# Trabajo en Ganpro Dashboard

Objetivo: `Yigue/Ganpro-app`, base `v1`, carpeta `dashboard`. No trasladar modelos
ni migraciones de otros proyectos. Conservar el contrato WatermelonDB v3 y los
roles `admin`, `campo`, `asesor` del establecimiento compartido.

Leer `../openspec/rules/coding-standards.md` y `docs/COMMANDS_AND_ERRORS.md`.

- Tipos/schemas antes de lógica; sin `any` nuevo. Módulos nuevos de hasta 150 líneas.
- Comandos autenticados, validación pública y errores técnicos seguros con referencia.
- Escrituras críticas en RPC PostgreSQL: inventario, obligación, caja y auditoría
  deben confirmar juntos, con bloqueo e idempotencia. No ejecutar efectos críticos
  desde observadores en memoria ni reintentar escrituras automáticamente.
- Mantener RLS y probar `asesor`/anónimo. No usar service role para acciones del usuario.
- Mantener tablas/columnas y timestamps ms de la app. Probar pull/push y conflictos.
- Mapa sobre `potreros`: no duplicar lotes ni existencias; superficie validada en servidor.
- No inventar cobros/pagos de registros anteriores ni confundir caja con margen.
- Pruebas locales aisladas y migraciones aditivas; nunca reset ni seed sobre producción.
- Validar lint, tipos, unitarias, PostgreSQL/RLS, build y navegador antes de publicar PR.
