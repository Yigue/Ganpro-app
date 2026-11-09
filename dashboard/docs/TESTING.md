# Verificación del dashboard

Requiere Node 22, npm y PostgreSQL 16. Ejecutar desde `dashboard`.

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

## PostgreSQL real

Crear una base LOCAL vacía cuyo nombre termine en `_tests`; por ejemplo,
`ganpro_dashboard_tests`. No usar una copia operativa para ejecutar fixtures.

```bash
export GANPRO_TEST_DATABASE_URL=postgres://ganpro:ganpro_local_test@127.0.0.1:55440/ganpro_dashboard_tests
npm run test:db:migrate
npm run test:db
```

El migrador rechaza bases ya inicializadas; no hace DROP ni reset. El fixture de
las pruebas SÍ vacía tablas de esa base aislada entre casos. Ambos rechazan hosts
que no sean localhost/127.0.0.1 y nombres sin sufijo `_tests`.
`tests/db/bootstrap.sql` simula únicamente roles, auth.users y auth.uid para que
las migraciones y RLS se prueben sobre PostgreSQL real. No es una migración de producción.

Cobertura: doble venta concurrente, idempotencia, rollback por cuenta inválida,
sexo/referencias/identidades, retiro sanitario, stock/caja/deudas conciliados,
sobrepago concurrente, transferencias, centavos, reversión, asesor/anónimo,
medición/geometría/conflicto de mapa, adopción anterior, anulación, último admin,
aplicación sanitaria/calendario y sync v3 con dependencias, reenvíos y baja obsoleta.

Caso administrativo: apertura de 100 cabezas, 8 nacimientos, compra de 10, muerte
de 2 y venta de 20 = 96. Venta de $14m/cobro $6m, compra de $4m, gasto de $2m/pago
$1,5m y apertura de caja $3m = $8m por cobrar, $4,5m por pagar y $7,5m en caja.
Trasladar 15 animales cambia la ocupación, sin cambiar el total del campo.

## Navegador

El workflow `.github/workflows/dashboard.yml` es el ejemplo reproducible completo.
Además del PostgreSQL inicializado, ejecutar PostgREST v12.2.12 conectado con el
rol `authenticator`, public schema, anon role y el secreto LOCAL definido en
`tests/e2e/local-services.mjs`. Publicar REST en `127.0.0.1:55441`.

```bash
node tests/e2e/local-services.mjs
```

Ese proceso escucha `127.0.0.1:55442`: proxy REST real y **emulador Auth de pruebas**.
Solo admite usuarios `admin/advisor/field@test.invalid`, clave `local-test-only`.
No usarlo ni publicarlo como autenticación real. Auth Supabase/GoTrue, email de
confirmación y recuperación no se validan con este arnés.

En otra terminal, con la misma configuración durante build y start:

```bash
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55442
export NEXT_PUBLIC_SUPABASE_ANON_KEY=local-anon-key
npm run build
npm run start -- -p 3005 -H 127.0.0.1
```

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

Si Chromium ya está instalado, se puede usar `GANPRO_CHROMIUM_PATH=/usr/bin/chromium`.
El navegador atraviesa Next SSR/server actions, Supabase SDK, PostgREST, RPC y RLS
reales: login del arnés, resumen, apertura de caja, mapa WebGL, dibujo/guardado y
recarga, capas, exportación CSV y ausencia de edición para asesor.
No equivale a probar la base productiva ni un teléfono real. Las teselas requieren
Internet y el dibujo puede seguir visible aunque falle un proveedor raster.

## Resultado local de esta entrega

- 40 pruebas unitarias (31 originales + 9 de errores/API/fechas/CSV e historial).
- 15 pruebas PostgreSQL/RLS/sync sobre migraciones completas desde una base vacía.
- 2 recorridos Playwright aprobados con Chromium local y arnés Auth descrito arriba.
- Lint sin advertencias, TypeScript y build de Next aprobados.

Las pruebas no aplicaron migraciones ni datos a Supabase/Vercel reales.
