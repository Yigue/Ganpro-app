# GanPro — Plan de Desarrollo MVP

> Última actualización: 2026-04-20
> Stack: React Native 0.81 + Expo 54 + WatermelonDB + Zustand + React Query
> Rama activa: `claude/livestock-management-mvp-5UuhX`

---

## Estado actual del codebase

La capa de datos y los engines de cálculo están completos (schema v2, 13 tablas, 3 engines puros). El problema es que **la UI no consume los engines** y hay gaps de seguridad operativa críticos. Además, el diseño actual tiene inconsistencias estructurales que escalan mal.

### Problemas de diseño detectados

| Problema | Impacto |
|----------|---------|
| `SimpleLineChart` dibuja puntos sueltos sin líneas ni ejes — ilegible | Dashboard inútil en campo |
| Colores RGBA hardcodeados en cada screen (`rgba(0,214,143,0.15)`, `#C35BD0`, etc.) | Tema no mantenible |
| 6+ implementaciones distintas de "card" sin componente compartido | Inconsistencia visual |
| Headers de cada screen implementados de cero (sin componente `ScreenHeader`) | Código duplicado |
| Formularios: algunos usan `BottomSheetModal`, otros `Modal` nativo | UX inconsistente |
| Sin estados de carga skeleton — datos WatermelonDB aparecen de golpe | Parpadeo al abrir screens |
| `#C35BD0` hardcodeado en 3 lugares distintos (no está en `colors.ts`) | Color huérfano |
| Sin `pull-to-refresh` en ninguna lista | Expectativa de usuario rota |

---

## Phases

---

## Phase 1 — Seguridad Operativa + Design Foundation

**Objetivo:** El veterinario puede usar el scan en campo con seguridad real. Base de diseño consistente para todas las phases siguientes.

**Duración estimada:** 2 semanas

---

### 1.1 — Design System: tokens + componentes base

Antes de tocar features, consolidar el sistema de diseño para que todo lo que se construya después sea consistente.

#### Tareas

- [ ] **Extender `colors.ts`** — agregar tokens de alpha para evitar RGBA hardcodeados:
  ```ts
  primaryAlpha: 'rgba(0, 214, 143, 0.12)',
  errorAlpha: 'rgba(255, 61, 113, 0.12)',
  warningAlpha: 'rgba(255, 170, 0, 0.12)',
  infoAlpha: 'rgba(0, 149, 255, 0.12)',
  purple: '#C35BD0',
  purpleAlpha: 'rgba(195, 91, 208, 0.12)',
  ```

- [ ] **Componente `ScreenHeader`** (`src/shared/components/ScreenHeader.tsx`)
  - Props: `title`, `subtitle?`, `rightAction?: { label, onPress }`
  - Reemplaza los 6+ headers manuales en cada screen

- [ ] **Componente `Card`** (`src/shared/components/Card.tsx`)
  - Props: `children`, `variant?: 'default' | 'elevated'`, `onPress?`
  - Base para MedicamentoCard, TratamientoCard, LoteCard, etc.

- [ ] **Componente `SectionHeader`** (`src/shared/components/SectionHeader.tsx`)
  - Props: `title`, `count?`, `action?: { label, onPress }`

- [ ] **Refactorizar screens existentes** para usar los nuevos componentes base
  - Reemplazar todos los RGBA hardcodeados por tokens del theme
  - Eliminar `#C35BD0` suelto → usar `colors.purple`

---

### 1.2 — Bloqueo de carencia en EventActionSheet

**Riesgo real:** Un animal con carencia activa puede ser enviado al frigorífico. El `EventActionSheet` no consulta `tratamientos_sanidad` antes de permitir registrar una vacunación.

#### Archivos afectados
- `src/features/scan/EventActionSheet.tsx`
- `src/data/repositories/SanidadRepository.ts`

#### Tareas

- [ ] En `SanidadRepository`, agregar método `getCarenciaActiva(animalId: string)` que retorne el tratamiento activo más reciente (si `fecha_fin_carencia > Date.now()`)

- [ ] En `EventActionSheet`, al cargar el animal, consultar `getCarenciaActiva`

- [ ] Si hay carencia activa:
  - Mostrar banner de advertencia rojo sobre las acciones
  - Deshabilitar la acción `VACUNACION` con tooltip "En carencia hasta {fecha}"
  - Permitir igualmente PESAJE, TACTO, CAMBIO_LOTE, OTRO

- [ ] Diseño del banner:
  ```
  ⚠️ EN CARENCIA — Libre el DD/MM/YYYY
  Medicamento: {nombre} · Días restantes: {N}
  ```

---

### 1.3 — Notificaciones IATF

**Riesgo real:** El veterinario carga el protocolo pero la app nunca avisa cuándo retirar el dispositivo o aplicar la siguiente dosis.

#### Archivos afectados
- `src/features/sanidad/ProtocoloFormModal.tsx`
- `src/shared/services/notificationsService.ts`
- `src/data/models/EtapaProtocoloModel.ts`

#### Tareas

- [ ] Revisar `notificationsService.ts` — verificar que `scheduleNotification` funciona con `expo-notifications`

- [ ] En `ProtocoloFormModal`, al guardar un protocolo con etapas:
  - Para cada etapa, calcular `fechaNotificacion = fechaInicio + diasDesdeInicio`
  - Llamar `notificationsService.scheduleNotification({ title, body, date })` → guardar el ID retornado en `etapa.notificacion_id`

- [ ] Al completar/cancelar un protocolo, cancelar las notificaciones pendientes con `expo-notifications.cancelScheduledNotificationAsync`

- [ ] Pedir permisos de notificación al primer arranque de la app (si no están otorgados)

---

### 1.4 — Densidad de carga reactiva al CAMBIO_LOTE

**Problema:** `calcularDensidadCarga` existe en `gisEngine.ts` pero `lote.densidadCarga` siempre muestra 0 porque nada lo actualiza cuando los animales se mueven.

#### Archivos afectados
- `src/features/scan/EventActionSheet.tsx`
- `src/data/repositories/AnimalRepository.ts` o `EventoRepository.ts`

#### Tareas

- [ ] En `EventActionSheet`, después de registrar un `CAMBIO_LOTE` exitoso:
  - Contar animales en `loteOrigenId` y `loteDestinoId`
  - Obtener hectáreas de cada lote
  - Calcular nueva `densidadCarga` con `calcularDensidadCarga(count, hectareas)`
  - Actualizar ambos lotes en WatermelonDB dentro del mismo `db.write()`

---

### 1.5 — Recategorización rápida en Tacto

**Pedido veterinario:** "Si estoy haciendo tacto y encuentro una vaquillona vacía, quiero marcarla como vaca de descarte con un toque."

#### Archivos afectados
- `src/features/scan/EventActionSheet.tsx`

#### Tareas

- [ ] En el flujo de TACTO, agregar paso 2 opcional: selector de resultado
  ```
  Resultado del tacto:
  [ Preñada ✓ ]  [ Vacía — Descarte 🗑️ ]  [ Sin resultado ]
  ```
- [ ] Si selecciona "Vacía — Descarte": actualizar `animal.categoria` a `'Vaca Descarte'` dentro del mismo `db.write()` del evento TACTO
- [ ] Registrar el resultado en `evento.notas` como texto estructurado: `"tacto:vacia"` o `"tacto:prenada"` (para % preñez futuro)

---

### Resultado esperado Phase 1

- ✅ Veterinario puede escanear en campo con seguridad (carencia bloqueada)
- ✅ Notificaciones IATF funcionales
- ✅ Densidad de carga se actualiza automáticamente
- ✅ Recategorización one-touch en tacto
- ✅ Design system base: tokens, Card, ScreenHeader, SectionHeader

---

## Phase 2 — Business Intelligence UI

**Objetivo:** El dueño puede ver el ROI real de cada lote. Los engines ya existen — esta phase los conecta a la UI.

**Duración estimada:** 2–3 semanas

---

### 2.1 — Dashboard rediseñado

El Dashboard actual tiene un "chart" de puntos sueltos sin líneas y un semáforo incompleto. Necesita ser el centro de decisiones del dueño.

#### Instalación requerida
```bash
expo install react-native-svg
```
(Reanimated ya está instalado)

#### Tareas

- [ ] **SVG Line Chart** (`src/shared/components/LineChart.tsx`)
  - Usando `react-native-svg`: `<Polyline>` + puntos + grid lines + labels en eje Y
  - Props: `data: { x: number, y: number }[]`, `color`, `height`, `formatY?`
  - Reemplaza `SimpleLineChart` en Dashboard

- [ ] **Dashboard: sección Costo por Kg**
  - Conectar `calcularCostoPorKg` con los movimientos del lote seleccionado
  - Mostrar: costo/kg actual, comparado con mes anterior (flecha ↑↓)

- [ ] **Dashboard: proyección de faena**
  - Usar `calcularDiasAFaena({ pesoActualKg, gdpKgDia, pesoObjetivoKg: 480 })`
  - Mostrar: "Lote Norte → faena en ~{N} días ({fecha estimada})"

- [ ] **Dashboard: semáforo completo**
  - GDP (ya existe)
  - Mortalidad (ya existe)
  - Costo/kg actual (nuevo)
  - Días estimados a faena (nuevo)

- [ ] **Pull-to-refresh** en Dashboard para forzar recarga de datos

---

### 2.2 — Agregación financiera automática

La tabla `agregados_financieros` existe pero nunca se calcula. El dueño no puede ver costo/kg ni margen bruto si no hay datos.

#### Archivos afectados
- `src/data/repositories/FinancieroRepository.ts`
- `src/features/financiero/FinancieroScreen.tsx`

#### Tareas

- [ ] En `FinancieroRepository.createMovimiento()`, después de insertar el movimiento, llamar a `recalcularAgregado(loteId, periodoMes)`:
  - Sumar gastos SANIDAD, NUTRICION, ALQUILER del lote en ese mes
  - Obtener kg ganados del lote (pesajes del mes)
  - Calcular `costo_x_kg` y `margen_bruto`
  - Hacer upsert en `agregados_financieros`

- [ ] **FinancieroScreen: sección de análisis por lote**
  - Selector de lote (horizontal chips como Dashboard)
  - Cards: Costo/kg | Margen Bruto | Kg ganados (del mes)
  - Comparativa: mes actual vs mes anterior

- [ ] **FinancieroScreen: impacto económico de muerte**
  - Al registrar un movimiento con categoría OTRO + descripción que contiene "muerte" (o en Inventory), mostrar el cálculo de `calcularImpactoEconomicoMuerte`

---

### 2.3 — Alerta de balance nutricional en Potreros

`calcularBalanceNutricional` existe pero nunca se muestra al usuario.

#### Archivos afectados
- `src/features/potreros/PotrerosScreen.tsx`

#### Tareas

- [ ] En la tab Nutrición, para cada ración activa, calcular el balance nutricional usando el peso promedio del lote (últimos pesajes)
- [ ] Mostrar badge de estado: `SUPERAVIT 🟢` / `EQUILIBRIO 🟡` / `DEFICIT 🔴` en la `RacionCard`
- [ ] Si DEFICIT: mostrar mensaje expandible con `calcularBalanceNutricional.mensaje`

---

### 2.4 — Mejoras de diseño Phase 2

- [x] **Skeleton loading** (`src/shared/components/Skeleton.tsx`) — placeholder animado mientras WatermelonDB carga datos
- [x] **Pull-to-refresh** en todas las listas principales (Inventory, Sanidad/Tratamientos, Financiero)
- [x] **BottomSheet para todos los formularios** — unificar: los formularios que aún usan `Modal` nativo migrar a `BottomSheetModal` de `@gorhom/bottom-sheet`
- [x] **Trend indicators en summary cards** — flechas ↑↓ con color para mostrar variación vs período anterior

---

### Resultado esperado Phase 2

- ✅ Dashboard con chart SVG legible, costo/kg, proyección faena
- ✅ Financiero con análisis por lote y agregados calculados automáticamente
- ✅ Potreros alerta cuando la dieta no cubre el mantenimiento
- ✅ Design consistente con skeleton loading y formularios unificados

---

## Phase 3 — GIS Visual

**Objetivo:** Los potreros dejan de ser solo texto con coordenadas — tienen mapa real.

**Duración estimada:** 1–2 semanas

**Prerequisito:** `react-native-svg` instalado en Phase 2.

---

### 3.1 — Mapa SVG de potreros

`gisEngine.renderPolygonPoints()` convierte GeoJSON a puntos SVG, pero no hay componente que los dibuje.

#### Tareas

- [ ] **Componente `PotreroMap`** (`src/shared/components/PotreroMap.tsx`)
  - Usa `react-native-svg`: `<Svg>`, `<Polygon>`, `<Text>` para el nombre
  - Recibe `geoJson: string | null`, `width`, `height`, `label?: string`
  - Si `geoJson` es null: muestra placeholder con icono de mapa

- [ ] **PotrerosScreen — LoteCard** mejorada:
  - Si el lote tiene `geo_json`, mostrar miniatura del polígono (100×60px)
  - Toque en la miniatura → modal con mapa a pantalla completa

- [ ] **LoteFormModal** (`src/features/lotes/LoteFormModal.tsx`):
  - Campo de texto para pegar GeoJSON
  - Preview del polígono en tiempo real (mientras el usuario escribe/pega)
  - Botón "Calcular hectáreas" que usa `calcularAreaHectareas` y rellena el campo `hectareas`

---

### 3.2 — Densidad de carga visual

- [ ] En el mapa a pantalla completa del potrero: overlay con `{densidadCarga} an/ha`
- [ ] Color del polígono según densidad: verde (< 1 an/ha) → amarillo (1–2) → rojo (> 2)

---

### Resultado esperado Phase 3

- ✅ Cada potrero muestra su polígono geográfico
- ✅ LoteFormModal permite pegar GeoJSON y calcula hectáreas automáticamente
- ✅ Densidad de carga visualizada con semáforo de color

---

## Phase 4 — Integraciones Externas + % Preñez

**Objetivo:** Automatizar la carga de datos externos y habilitar métricas reproductivas.

**Duración estimada:** 2–3 semanas

---

### 4.1 — % Preñez (schema v3)

Los eventos TACTO guardan resultado en `notas` (Phase 1), pero para calcular % preñez hace falta una query estructurada.

#### Tareas

- [ ] **Migración schema v3**: agregar columna `resultado_tacto: string | null` en tabla `eventos` (valores: `'PRENADA' | 'VACIA' | null`)
- [ ] Actualizar `EventActionSheet` para escribir en `resultado_tacto` en vez de `notas`
- [ ] **Dashboard semáforo**: nuevo indicador `% Preñez` = (preñadas / total vacas tacteadas) × 100

---

### 4.2 — API precios MAG

La tabla `precios_mercado` tiene `fuente: 'MANUAL' | 'API_MAG'` pero la integración no existe.

#### Tareas

- [ ] Investigar endpoint público MAG Paraguay (o alternativa regional)
- [ ] `FinancieroRepository.fetchPreciosMercado()` — llamada HTTP con `fetch`, guardado en `precios_mercado` con `fuente: 'API_MAG'`
- [ ] En `FinancieroScreen`, botón "Actualizar precios" que llama al endpoint
- [ ] En Settings, toggle "Actualización automática de precios" (diaria)

---

### 4.3 — Backend sync real

Actualmente `syncApiUrl` vacío → app 100% offline. Para multi-usuario en el mismo establecimiento:

#### Tareas

- [ ] Definir stack backend (sugerencia: Cloudflare Workers + D1, o Supabase)
- [ ] Implementar endpoints `/sync/pull` y `/sync/push` compatibles con WatermelonDB
- [ ] `SettingsScreen`: campo para ingresar URL del servidor
- [ ] Resolver estrategia de conflictos: Last Write Wins (default WatermelonDB) es suficiente para MVP multi-usuario porque los animales son entidades independientes

---

## Resumen de dependencias entre phases

```
Phase 1 ──────────────────────────────────────────────────────────
  ├── Design tokens + componentes base  ──→ habilita todo lo demás
  ├── Bloqueo carencia                  ──→ seguridad veterinario
  ├── Notificaciones IATF               ──→ protocolo reproductivo
  ├── Densidad carga reactiva           ──→ datos correctos en Potreros
  └── Recategorización tacto            ──→ inventario preciso

Phase 2 (requiere Phase 1 completo) ──────────────────────────────
  ├── react-native-svg install          ──→ habilita Phase 3
  ├── Dashboard rediseñado              ──→ visibilidad dueño
  ├── Agregación financiera             ──→ ROI por lote
  └── Balance nutricional UI            ──→ alerta veterinario

Phase 3 (requiere react-native-svg de Phase 2) ───────────────────
  ├── PotreroMap component              ──→ GIS visual
  └── LoteFormModal GeoJSON input       ──→ carga de datos

Phase 4 (independiente, puede hacerse en paralelo) ───────────────
  ├── Schema v3 % preñez                ──→ métrica reproductiva
  ├── API MAG precios                   ──→ datos automáticos
  └── Backend sync                     ──→ multi-usuario
```

---

## Componentes shared a crear (resumen)

| Componente | Path | Cuándo |
|------------|------|--------|
| `ScreenHeader` | `src/shared/components/ScreenHeader.tsx` | Phase 1 |
| `Card` | `src/shared/components/Card.tsx` | Phase 1 |
| `SectionHeader` | `src/shared/components/SectionHeader.tsx` | Phase 1 |
| `LineChart` | `src/shared/components/LineChart.tsx` | Phase 2 |
| `Skeleton` | `src/shared/components/Skeleton.tsx` | Phase 2 |
| `PotreroMap` | `src/shared/components/PotreroMap.tsx` | Phase 3 |

---

## Tokens de diseño a agregar en `colors.ts`

```ts
// Añadir al objeto colors:
primaryAlpha: 'rgba(0, 214, 143, 0.12)',
errorAlpha:   'rgba(255, 61, 113, 0.12)',
warningAlpha: 'rgba(255, 170, 0, 0.12)',
infoAlpha:    'rgba(0, 149, 255, 0.12)',
purple:       '#C35BD0',
purpleAlpha:  'rgba(195, 91, 208, 0.12)',
```
