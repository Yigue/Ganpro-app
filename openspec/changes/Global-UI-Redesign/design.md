# Design: Global UI Redesign

## Technical Approach

Design System First: build tokens → components → refactor screens in that exact order. Each layer only depends on the layer below it. Screens are refactored one at a time; the shared component library is purely additive so unrefactored screens continue to compile at every commit.

The existing token files (`colors.ts`, `typography.ts`, `spacing.ts`) are extended in-place — no new config/barrel structure. New files are added only where there is no existing file to extend (`shadows.ts`, `radii.ts`). New components live alongside existing ones in `src/shared/components/`.

---

## Architecture Decisions

### Decision 1: Shadow Tokens — New `shadows.ts` file

| Option | Tradeoff | Decision |
|--------|----------|----------|
| New `src/theme/shadows.ts` | One purpose per file, zero risk of merge conflicts with spacing | **Chosen** |
| Extend `spacing.ts` | Shadows are not spacing; mixed concerns, harder to tree-shake | Rejected |

`shadows.ts` exports three named elevations: `sm`, `md`, `lg`. Each is a plain object compatible with React Native's `style` shadow props (cross-platform via `elevation` on Android + `shadowColor/Offset/Radius/Opacity` on iOS).

### Decision 2: Semantic Color Aliases — Extend `colors.ts` with a `semantic` export

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Add `semantic` object inside existing `colors.ts` | Single source of truth, one import, tree-shaken together | **Chosen** |
| Separate `semanticColors.ts` | Extra import path, risk of importing wrong object, no real isolation benefit | Rejected |

The `semantic` object is added as a second named export in `colors.ts`. Raw palette stays in `colors`. Screens import `{ colors }` and access `colors.semantic.surface` — no migration for existing consumers of `colors.primary` etc.

### Decision 3: Border Radius — New `src/theme/radii.ts` file

| Option | Tradeoff | Decision |
|--------|----------|----------|
| New `src/theme/radii.ts` | Separates spatial scale from radius scale; both grow independently | **Chosen** |
| Add to `spacing.ts` | Radius is not spacing; `spacing.ts` is already semantically clean | Rejected |

### Decision 4: Typography Presets — Plain objects in `typography.ts`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Objects exported as `typography.presets.headline` | Directly spreadable into `StyleSheet.create()`. No function overhead. | **Chosen** |
| Functions `headline()` → style object | Unnecessary abstraction for static styles | Rejected |
| `StyleSheet` fragments exported from typography | Breaks tree-shaking if screens only need one preset | Rejected |

Presets are `TextStyle`-compatible objects. Usage: `...typography.presets.headline` inside any `StyleSheet.create()`.

### Decision 5: Ionicons import strategy — named re-export from `src/shared/components/Icon.tsx`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Re-export `Ionicons` from `src/shared/components/Icon.tsx` | Single import point; can swap icon library without touching every screen | **Chosen** |
| Import `Ionicons` from `@expo/vector-icons` directly in each file | Scattered imports; library lock-in; harder to mock in tests | Rejected |

`@expo/vector-icons` is confirmed present in `node_modules/` (bundled by Expo SDK `^54.0.33`). It does NOT appear in `package.json` `dependencies` — this is normal for Expo-managed packages. No install required.

### Decision 6: New component file structure — co-located in `src/shared/components/`

All new components follow the same pattern as existing ones (e.g., `Card.tsx`): one file per component, exported from `index.ts`. No subdirectory grouping — the existing convention is flat.

### Decision 7: Screen migration pattern — token-first, then component substitution

1. Replace all inline `rgba()` and hardcoded hex with `colors.*` tokens
2. Replace `StyleSheet.create()` entries that duplicate shared patterns with shared component props
3. Replace emoji with `<Icon name="..." />` references
4. Only delete local `StyleSheet` entries after the component substitution is confirmed working

Order: Dashboard → Inventory → Sanidad → Financiero → Potreros → Settings → EventHistory

---

## Data Flow

Token/component dependency graph (one-way, no cycles):

```
src/theme/colors.ts  ──┐
src/theme/typography.ts ──┤──→ src/shared/components/* ──→ src/features/*/Screen.tsx
src/theme/spacing.ts ───┤
src/theme/shadows.ts ───┤
src/theme/radii.ts ─────┘
```

Navigation layer:

```
src/navigation/TabNavigator.tsx
  └──→ <Ionicons> via src/shared/components/Icon.tsx
  └──→ colors, spacing, typography tokens (already imported)
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/theme/colors.ts` | Modify | Add `semantic` named export with aliases; keep existing `colors` export unchanged |
| `src/theme/typography.ts` | Modify | Add `presets` named export: `headline`, `bodyLg`, `bodySm`, `caption`, `label` |
| `src/theme/spacing.ts` | No change | Kept as-is; border-radius goes to `radii.ts` |
| `src/theme/shadows.ts` | Create | Elevation tokens: `sm`, `md`, `lg` |
| `src/theme/radii.ts` | Create | Border-radius scale: `xs=4`, `sm=8`, `md=12`, `lg=16`, `xl=24`, `pill=999` |
| `src/theme/index.ts` | Modify | Re-export `shadows` and `radii` |
| `src/shared/components/Icon.tsx` | Create | Thin wrapper: re-exports `Ionicons` as `Icon`; enforces size/color defaults |
| `src/shared/components/IconButton.tsx` | Create | Tappable icon with 56px touch target |
| `src/shared/components/ListItem.tsx` | Create | Standard row: leading icon, title, subtitle, trailing element |
| `src/shared/components/InputBase.tsx` | Create | Dark-themed text input aligned with tokens |
| `src/shared/components/ModalBase.tsx` | Create | Modal shell: header + close button + body slot |
| `src/shared/components/Spinner.tsx` | Create | ActivityIndicator wrapper with `colors.primary` default |
| `src/shared/components/TabBar.tsx` | Create | Horizontal tab strip; replaces inline tab patterns in Sanidad/Financiero |
| `src/shared/components/index.ts` | Modify | Export all 6 new components |
| `src/navigation/TabNavigator.tsx` | Modify | Replace `TabIcon` emoji component with `<Icon>` calls; remove `TabIcon` function |
| `src/features/dashboard/DashboardScreen.tsx` | Modify | Replace emoji, inline colors, local StyleSheet duplication |
| `src/features/inventory/InventoryScreen.tsx` | Modify | Replace emoji action buttons with `<IconButton>`, use `<ListItem>` |
| `src/features/sanidad/SanidadScreen.tsx` | Modify | Replace inline tab with `<TabBar>`, apply tokens |
| `src/features/financiero/FinancieroScreen.tsx` | Modify | Centralize `#C35BD0` → `colors.purple`; apply tokens |
| `src/features/potreros/PotrerosScreen.tsx` | Modify | Use `<Card>` shadow variant, `<ListItem>` |
| `src/features/settings/SettingsScreen.tsx` | Modify | Apply tokens and `<ListItem>` pattern |
| `src/features/eventHistory/EventHistoryScreen.tsx` | Modify | Replace `EventoRow` with `<ListItem>` |

---

## Interfaces / Contracts

### `src/theme/shadows.ts`

```typescript
import { Platform } from 'react-native';
import type { ViewStyle } from 'react-native';

type Shadow = Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

export const shadows: Record<'sm' | 'md' | 'lg', Shadow> = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
};
```

### `src/theme/radii.ts`

```typescript
export const radii = {
  xs:   4,
  sm:   8,
  md:   12,   // matches current Card.tsx hardcoded 12
  lg:   16,
  xl:   24,
  pill: 999,
} as const;
```

### `src/theme/colors.ts` — `semantic` addition

```typescript
// Added to existing colors.ts — existing `colors` export is UNCHANGED
export const semantic = {
  // Surfaces
  background:      colors.background,
  surface:         colors.surface,
  surfaceElevated: colors.surfaceElevated,
  // Text
  onSurface:       colors.textPrimary,
  onSurfaceMuted:  colors.textSecondary,
  // Borders
  divider:         colors.border,
  // Categories
  categoryAnimal:  colors.purple,        // was hardcoded #C35BD0
  categoryFinance: colors.info,
  categoryHealth:  colors.warning,
} as const;
```

### `src/theme/typography.ts` — `presets` addition

```typescript
import type { TextStyle } from 'react-native';

// Added to existing typography.ts — existing `typography` export is UNCHANGED
export const presets: Record<string, TextStyle> = {
  headline: {
    fontSize: typography.sizes.xl,      // 24
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  bodyLg: {
    fontSize: typography.sizes.md,      // 16
    fontWeight: typography.weights.regular,
    color: colors.textPrimary,
  },
  bodySm: {
    fontSize: typography.sizes.sm,      // 13
    fontWeight: typography.weights.regular,
    color: colors.textPrimary,
  },
  caption: {
    fontSize: typography.sizes.xs,      // 11
    fontWeight: typography.weights.regular,
    color: colors.textSecondary,
  },
  label: {
    fontSize: typography.sizes.xs,      // 11
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
};
```

### `src/shared/components/Icon.tsx`

```typescript
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors } from '@theme/index';

export type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface IconProps {
  name: IoniconsName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 24, color = colors.textPrimary }: IconProps) {
  return <Ionicons name={name} size={size} color={color} />;
}
```

### `src/shared/components/IconButton.tsx`

```typescript
interface IconButtonProps {
  name: IoniconsName;
  onPress: () => void;
  size?: number;                    // icon size, default 22
  color?: string;                   // icon color, default colors.textSecondary
  accessibilityLabel: string;       // REQUIRED — no optional, enforces a11y
  style?: StyleProp<ViewStyle>;
}
// Touch target enforced: minWidth/minHeight = spacing.touchTarget (56px)
```

### `src/shared/components/ListItem.tsx`

```typescript
interface ListItemProps {
  title: string;
  subtitle?: string;
  leadingIcon?: IoniconsName;        // left icon; if omitted, no leading slot
  leadingColor?: string;             // icon color, defaults to colors.textSecondary
  trailingElement?: React.ReactNode; // right slot: badge, icon, text, chevron
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}
// Height: min 56px (spacing.touchTarget) to preserve touch target
// Separator: bottom border using colors.border (same as existing eventoRow pattern)
```

### Navigation Tab Icon Map (`src/navigation/TabNavigator.tsx`)

Replace `TabIcon` with direct `<Icon>` calls. Exact Ionicons names:

| Tab | Label | Ionicons (focused) | Ionicons (unfocused) |
|-----|-------|--------------------|----------------------|
| Scan | Escanear | `scan-circle` | `scan-circle-outline` |
| Inventory | Inventario | `paw` | `paw-outline` |
| Sanidad | Sanidad | `medkit` | `medkit-outline` |
| Potreros | Potreros | `leaf` | `leaf-outline` |
| Dashboard | Dashboard | `stats-chart` | `stats-chart-outline` |
| Settings | Ajustes | `settings` | `settings-outline` |

Usage pattern in `tabBarIcon` option:
```typescript
tabBarIcon: ({ focused, color }) => (
  <Icon
    name={focused ? 'scan-circle' : 'scan-circle-outline'}
    size={24}
    color={color}  // provided by tabBarActiveTintColor / tabBarInactiveTintColor
  />
)
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `Icon`, `IconButton`, `ListItem`, `TabBar` — render without crash | `@testing-library/react-native` render + snapshot |
| Unit | `shadows`, `radii`, `semantic`, `presets` exports — shape and types | plain TS assertion, no RN renderer needed |
| Integration | DashboardScreen renders with mocked WatermelonDB | existing `ObservableErrorBoundary` wrapping; mock `database` |
| Manual | Touch target ≥56px on device | Android + iOS; use Accessibility Inspector |
| Manual | WCAG contrast — spot-check `semantic.categoryAnimal` on `colors.surface` | contrast ratio tool |

No E2E test infrastructure exists in the project — do not introduce Detox or Maestro in this change.

---

## Migration / Rollout

No data migration. No feature flags. Screen-by-screen rollout:

1. Commit Phase 1 (tokens + `Icon.tsx`): all screens still compile, no visual change
2. Commit Phase 2 (new components): still additive, zero breakage
3. Per-screen commits (Phase 3): one commit per screen file
4. Navigation commit last (replaces `TabIcon`): visual change visible immediately, low risk

Rollback granularity: per-commit. Shared components are additive — reverting a screen file restores it without touching components.

**Scan-Module-Redesign coordination**: that change consumes `Icon`, `ListItem`, `IconButton`, `shadows`, `radii`, and `semantic` built here. It must not duplicate any of these. The `Scan-Module-Redesign` design phase should reference this document's interface contracts.

---

## Open Questions

- [ ] `EmptyState` currently accepts `icon: string` (emoji). Should it accept `IoniconsName` after migration, or keep emoji support as fallback? Decision needed before refactoring screens that use `EmptyState` with emoji.
- [ ] `TabBar` component (horizontal tabs in Sanidad/Financiero): does it need scroll support for > 4 tabs, or is 2–3 tabs the only use case? Impacts whether to use `ScrollView horizontal` or static `View flexRow`.
