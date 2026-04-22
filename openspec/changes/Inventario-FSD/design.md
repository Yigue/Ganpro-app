# Design: Inventario-FSD

## Technical Approach

Split the 277-line `InventoryScreen.tsx` monolith into three files following the exact same
pattern established in `DashboardScreen.tsx`: outer props interface → `withObservables` HOC in
`model/` → pure `Inner` component + screen shell in `ui/`. The `AnimalListItem` sub-component
moves into its own file inside `ui/` to keep `InventoryScreen.tsx` under 150 lines. Navigation
import path in `TabNavigator.tsx` updates from `@features/inventory/InventoryScreen` to
`@features/inventory/ui/InventoryScreen`.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Single accordion `openCategory: string \| null` state | Only one section open at a time; simpler state shape | **Chosen** — livestock category view benefits from focused reading |
| `useState<Set>` for multi-open | Any section can stay open; more state to manage | Rejected — unnecessary complexity for the MVP |
| `LayoutAnimation` for collapse | Smooth and declarative; iOS feels native | **Chosen** — no imperative Animated.Value management |
| `Animated.Value` per accordion | Fine-grained control; heavier setup | Rejected — LayoutAnimation is sufficient and simpler |
| Group animals in container (in `withObservables` factory) | Observable per-category requires multiple queries | Rejected — single `animals` observable is reactive; grouping is pure UI logic |
| Group animals in `Inner` with `useMemo` | Derived from a single observable; zero extra queries | **Chosen** — consistent with how `DashboardInner` derives `chartData` and `gdp` from raw arrays |
| Separate `AnimalListItem.tsx` file | Clean file boundary; easier to test | **Chosen** — keeps `InventoryScreen.tsx` (ui) under 150 lines |
| Export `AnimalListItem` inline in `InventoryScreen.tsx` | Fewer files | Rejected — monolith risk; 150-line budget broken |

## Data Flow

```
TabNavigator
    │
    └─ InventoryScreen  (ui/)  — useState: filterCategory, openCategory, refreshing
            │
            └─ InventoryWithData  (model/ — HOC boundary)
                    │  props passed down: filterCategory, onFilterChange,
                    │                     openCategory, onToggleCategory,
                    │                     refreshing, onRefresh
                    │
                    ├─ WatermelonDB query (reactive)
                    │   animals: Q.where('estado','ACTIVO')
                    │            [+ Q.where('categoria', filterCategory) when set]
                    │   allAnimals: Q.where('estado','ACTIVO')   ← for stat counts
                    │
                    └─ InventoryListInner  (ui/)
                            │  useMemo: groupByCategoria(animals)
                            │  useMemo: categoryCounts(allAnimals)
                            │
                            ├─ Header + subtitle
                            ├─ StatCards ScrollView  (horizontal)
                            ├─ FilterChips ScrollView  (horizontal)
                            └─ SectionList of CategoryAccordion
                                    └─ AnimalListItem  (ui/)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/inventory/InventoryScreen.tsx` | Delete | Monolith replaced; removed after new files verified |
| `src/features/inventory/ui/InventoryScreen.tsx` | Create | Screen shell (state) + `InventoryListInner` (pure UI) |
| `src/features/inventory/ui/AnimalListItem.tsx` | Create | Presentational animal row component |
| `src/features/inventory/model/InventoryContainer.tsx` | Create | `withObservables` HOC — sole DB import in feature |
| `src/navigation/TabNavigator.tsx` | Modify | Import path: `@features/inventory/InventoryScreen` → `@features/inventory/ui/InventoryScreen` |

## Interfaces / Contracts

```typescript
// ui/AnimalListItem.tsx
interface AnimalItemProps {
  animal: AnimalModel;   // idCaravana, sexo, categoria (all non-nullable on AnimalModel)
}

// model/InventoryContainer.tsx
interface InventoryOuterProps {
  filterCategory:   CategoriaType | null;
  onFilterChange:   (cat: CategoriaType | null) => void;
  openCategory:     CategoriaType | null;
  onToggleCategory: (cat: CategoriaType | null) => void;
  refreshing:       boolean;
  onRefresh:        () => void;
}

interface InventoryInnerProps extends InventoryOuterProps {
  animals:    AnimalModel[];   // filtered by estado + filterCategory
  allAnimals: AnimalModel[];   // filtered by estado only — for stat counts
}

// withObservables wiring (exact query)
const InventoryWithData = withObservables(
  ['filterCategory'],
  ({ filterCategory }: InventoryOuterProps) => ({
    animals: (filterCategory
      ? database.get<AnimalModel>('animals').query(
          Q.where('estado', 'ACTIVO'),
          Q.where('categoria', filterCategory)
        )
      : database.get<AnimalModel>('animals').query(
          Q.where('estado', 'ACTIVO')
        )
    ).observe(),
    allAnimals: database
      .get<AnimalModel>('animals')
      .query(Q.where('estado', 'ACTIVO'))
      .observe(),
  })
)(InventoryListInner);

// Derived types in ui/InventoryScreen.tsx (no export needed)
// groupedAnimals: Record<CategoriaType, AnimalModel[]>  — from useMemo
// categoryCounts: Record<string, number>               — from useMemo
```

## Accordion Strategy

`InventoryScreen` holds `openCategory: CategoriaType | null`. Toggling the same category closes
it; toggling a different one opens it and closes the previous one. `LayoutAnimation.configureNext`
is called BEFORE the `setOpenCategory` state update so React Native animates the layout change.

```typescript
// Inside InventoryScreen (ui)
const handleToggleCategory = useCallback((cat: CategoriaType | null) => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  setOpenCategory((prev) => (prev === cat ? null : cat));
}, []);
```

`InventoryListInner` renders a `SectionList`-like structure using a plain `FlatList` whose `data`
is `Object.entries(groupedAnimals)` (sorted by category key order from `CATEGORIA`). Each section
header is a `TouchableOpacity` (minHeight 56px) that calls `onToggleCategory`. The body is
conditionally rendered (`openCategory === cat` ? animal rows : null).

## Navigation Import Fix

**Current** (`src/navigation/TabNavigator.tsx`, line 6):
```typescript
import { InventoryScreen } from '@features/inventory/InventoryScreen';
```

**After**:
```typescript
import { InventoryScreen } from '@features/inventory/ui/InventoryScreen';
```

No other files reference `InventoryScreen` (verified by grep — only `InventoryScreen.tsx` and
`TabNavigator.tsx` matched the pattern).

## Delete Strategy

1. Create `ui/InventoryScreen.tsx`, `ui/AnimalListItem.tsx`, and `model/InventoryContainer.tsx`.
2. Update `TabNavigator.tsx` import to new path.
3. Run Metro bundler and verify Inventario tab renders without error.
4. Only after step 3 passes: `git rm src/features/inventory/InventoryScreen.tsx`.

This sequence keeps the monolith as a rollback option until the new split is confirmed working.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `AnimalListItem` renders `idCaravana`, `sexo` label, `StatusBadge` with correct categoria color | Jest + React Native Testing Library |
| Unit | `groupByCategoria` useMemo produces correct Record grouping | Inline hook test with `renderHook` |
| Integration | `InventoryScreen` + `InventoryWithData` query fires with correct `Q.where` clauses | WatermelonDB in-memory test DB |
| E2E | Tapping filter chip changes list content; accordion open/close works | Detox (out of scope for this change) |

Unit tests are out of scope for this change (per proposal) — listed here for future reference.

## Migration / Rollout

No data migration required. This is a pure structural refactor with no schema or query logic
changes. The `withObservables` queries in the new container are identical to the monolith.

## Open Questions

- [ ] `AnimalModel` does not expose `pesoActual` as a decorated field — confirm with schema
  (`peso_actual` column exists but no `@field` decorator in `AnimalModel.ts`). If weight display
  is needed on the list item in a future task, the decorator must be added first.
- [ ] `LayoutAnimation` on Android requires `UIManager.setLayoutAnimationEnabledExperimental(true)`
  in `index.js`. Confirm this is already called or add it during apply.
