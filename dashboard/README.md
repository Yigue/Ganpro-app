# GanPro Dashboard

Dashboard web de gestión para Loma Alta. Lee y escribe las mismas tablas que la app GanPro: el celular sincroniza contra este dashboard (`/api/sync/*`) y los dos usan una única base en Supabase.

```
App GanPro (WatermelonDB, offline)  ──sync──►  Dashboard Next.js (Vercel)  ──►  Supabase (Postgres + Auth + RLS)
                                                 ▲
                                    navegador (admin / campo / asesor)
```

## Pantallas

| Ruta | Módulo |
| --- | --- |
| `/` | Inicio: KPIs (cabezas, EV, carga, preñez, margen bruto, valor del rodeo), alertas y cabezas por mes |
| `/stock` | Tabla filtrable, ficha del animal, recategorización por edad, importación CSV del bastón RFID |
| `/movimientos` | Ventas, compras, muertes, nacimientos y traslados con DTE; conciliación con SIGSA; estado de los DTE |
| `/sanidad` | Calendario, aplicaciones con acta FUCOFA, animales en período de retiro (bloquea la venta), catálogo |
| `/reproduccion` | Servicio, tacto (general, por lote, categoría y toro), IATF, revisación de toros, CC y destete |
| `/nutricion` | Carga por potrero, formulador de sal mineral, cadena forrajera, entregas e insumos |
| `/costos` | Directos y estructura, costo por lote, por kg y por ternero, simulador de cría |
| `/finanzas` | Cuentas ARS, caja, obligaciones, pagos parciales, vencimientos, reversión, cierre y CSV |
| `/finanzas/analisis` | Análisis económico ARS/USD y proyección conservados; margen parcial e inventario pendiente |
| `/mapa` | Dibujar/editar potreros, hectáreas y perímetro, tipos, ocupación, ficha y capas calles/satélite/relieve |
| `/config` | Establecimiento, potreros, lotes, usuarios y roles, coeficientes EV, precios, estado del sync |
| `/proyeccion` | Escenarios: negocio de invernada/recría, precios históricos, ganancia de peso, plan de compras y ventas, crecimiento del rodeo de cría |

## Estructura

```
app/(dashboard)/<modulo>/page.tsx   pantallas (Server Components)
app/(dashboard)/<modulo>/actions.ts Server Actions validadas con Zod
components/<modulo>/                secciones de cada pantalla
components/ui/                      componentes base (card, table, data-table, form-dialog…)
lib/calc/                           KPIs y cálculos puros, con tests (npm test)
lib/db/                             tipos de las tablas, consultas y auth
lib/sync/                           protocolo de sync de WatermelonDB
supabase/migrations/                esquema (las 19 tablas de la app + extras), sync y RLS
supabase/seed.sql                   datos de demostración
```

## Puesta en marcha

1. **Supabase**: creá un proyecto y corré en el SQL Editor, en orden, los archivos de `supabase/migrations/`. Para una demo, corré también `supabase/seed.sql` (no lo uses sobre la base real).
2. **Vercel**: importá el repo `Ganpro-app` con **Root Directory = `dashboard`**. El framework se detecta solo.
3. **Variables de entorno** (ver `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`: solo servidor, la usa el endpoint de sync
   - `SYNC_API_KEY`: generala con `openssl rand -hex 24`
4. Desplegá y creá tu usuario en `/login`. **El primero queda como admin**; los siguientes entran como asesor (solo lectura) hasta que el admin les cambie el rol en Configuración.
5. **App GanPro**: en Ajustes, URL de sincronización = `https://<tu-dashboard>.vercel.app/api/k/<SYNC_API_KEY>` (el admin la copia desde Configuración → Sincronización).

En local: `cp .env.example .env.local`, completá los valores y `npm install && npm run dev`.

## Sincronización

- La app no cambia: sigue usando `GET /sync/pull`, `POST /sync/push` y `GET /sync/ping`.
- Cada tabla tiene `server_created_at` / `server_updated_at` (los mantiene un trigger) y los borrados quedan en `sync_tombstones`, así que lo que se edita en el dashboard también baja al celular.
- El push se rechaza con 409 si un registro cambió en el servidor después del último pull; WatermelonDB hace pull y reintenta.
- Las columnas nuevas del dashboard (por ejemplo `acta_numero` o `dolar_oficial`) son opcionales: la app v3 las ignora y el push solo actualiza las columnas que manda.
- Las tablas propias del dashboard (`servicios`, `racion_ingredientes`, `sigsa_stock`, `revisacion_toros`) todavía no se envían al celular; quedan listas para el esquema v4 de la app.

## Proyección

Cinco herramientas en `/proyeccion`, cada una guarda escenarios en `escenarios` (supuestos y resultado en JSON) y, el plan, sus líneas en `escenario_lineas`:

- **Negocio** (`/negocio`): hasta 4 modelos lado a lado con gastos comerciales, desbaste y mortandad; margen bruto y neto, renta del ciclo y anualizada, costo por kg y **precio de venta de equilibrio**; tabla de sensibilidad precio × ganancia diaria. Un escenario guardado se puede cerrar contra los movimientos reales del lote.
- **Precios** (`/precios`): series en pesos y dólares, relación ternero/novillo, insumo-producto con el maíz de Nutrición, estacionalidad de 5 años y carga histórica por CSV.
- **Peso** (`/peso`): proyección desde la última pesada con la ganancia histórica (o elegida) y curva estacional opcional; fecha a la que llega cada animal al objetivo.
- **Compras y ventas** (`/plan`): 12 a 24 meses con flujo de caja, stock por categoría y alerta de carga; cada línea se registra en Movimientos con sus caravanas para afectar stock y finanzas juntos.
- **Rodeo de cría** (`/cria`): modelo año por año con retención, refugo, demora de entore y tope de hectáreas; comparación entre escenarios guardados.

Las fórmulas están en `lib/calc/proyeccion.ts` y sus tests verifican las reglas del análisis de RTC (margen neto = margen bruto − costo de la tierra; renta anualizada = renta × 365 / días). Los cuatro modelos de partida son de ejemplo: para que reproduzcan exactamente las columnas de RTC hay que cargar sus números.

## Roles

| Rol | Puede |
| --- | --- |
| `admin` | Todo, incluido establecimiento, coeficientes EV y roles de usuarios |
| `campo` | Cargar y editar datos de todos los módulos |
| `asesor` | Solo lectura |

Las políticas RLS de `20261101000004_rls.sql` aplican estos permisos en la base, no solo en la interfaz.

## Pendiente respecto del plan

- Emitir DTE en SIGSA (no tiene API): el dashboard guarda número y estado.
- Importar el PDF del acta SIGSA: por ahora se cargan las cabezas por categoría a mano.
- Genealogía en la ficha del animal: la base no tiene madre/padre todavía.
- La diferencia de inventario del margen bruto se completa al cerrar el ejercicio.

## Guías de esta implementación

- [Comandos, eventos y errores](docs/COMMANDS_AND_ERRORS.md)
- [Revisión técnica y administrativa](docs/IMPLEMENTATION_PLAN.md)
- [Despliegue y conciliación](docs/DEPLOYMENT.md)
- [Pruebas locales y límites del arnés](docs/TESTING.md)
