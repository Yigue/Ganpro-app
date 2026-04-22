# Tasks: Inventario-FSD

## Phase 1: Foundation — Interfaces & Directory Setup

- [ ] 1.1 Create directories `src/features/inventory/ui/` and `src/features/inventory/model/` if missing (verify with ls before creating)
- [ ] 1.2 Create `src/features/inventory/ui/AnimalListItem.tsx` — define `AnimalItemProps` interface (`animal: AnimalModel` — idCaravana, sexo, categoria) and export presentational `AnimalListItem` component; row minHeight 56px; renders idCaravana, sexo label ("Macho"/"Hembra"), and `StatusBadge` for categoria; zero WatermelonDB imports; under 40 lines
- [ ] 1.3 In `src/features/inventory/model/InventoryContainer.tsx` — define `InventoryOuterProps` and `InventoryInnerProps extends InventoryOuterProps` interfaces (filterCategory, onFilterChange, openCategory, onToggleCategory, refreshing, onRefresh; plus animals/allAnimals on Inner); zero JSX

## Phase 2: Core Implementation

- [ ] 2.1 Complete `src/features/inventory/model/InventoryContainer.tsx` — import `withObservables`, `database`, `Q`, `AnimalModel`; implement `InventoryWithData = withObservables(['filterCategory'], ({ filterCategory }) => ({ animals: (filterCategory ? query with Q.where('estado','ACTIVO') + Q.where('categoria', filterCategory) : query with Q.where('estado','ACTIVO')).observe(), allAnimals: Q.where('estado','ACTIVO').observe() }))(InventoryListInner)`; sole DB import in feature; no JSX; no StyleSheet; under 150 lines
- [ ] 2.2 Create `src/features/inventory/ui/InventoryScreen.tsx` — export outer `InventoryScreen` with `useState<CategoriaType | null>` for `filterCategory` and `openCategory`, `useState<boolean>` for `refreshing`; implement `handleToggleCategory` with `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` BEFORE `setOpenCategory`; render `InventoryWithData` passing all props; zero WatermelonDB imports; under 150 lines
- [ ] 2.3 In `ui/InventoryScreen.tsx` — implement `InventoryListInner` (inline or same file if under budget): `useMemo` for `groupByCategoria(animals)` returning `Record<CategoriaType, AnimalModel[]>` sorted by CATEGORIA order; `useMemo` for `categoryCounts(allAnimals)`; render header, horizontal StatCards, horizontal FilterChips (one per CategoriaType + "Todos" chip; active chip visually distinct; "Todos" calls `onFilterChange(null)`), and FlatList of accordion sections; `EmptyState` when `animals.length === 0` with subtitle referencing category name if filter active or "primer animal" if null; zero `any`

## Phase 3: Integration & Wiring

- [ ] 3.1 Verify `index.js` — check if `UIManager.setLayoutAnimationEnabledExperimental(true)` is present; if missing, add it before `AppRegistry.registerComponent`
- [ ] 3.2 Modify `src/navigation/TabNavigator.tsx` — update import from `@features/inventory/InventoryScreen` to `@features/inventory/ui/InventoryScreen`; verify no other nav/tab files import old path (grep `inventory/InventoryScreen` before proceeding)
- [ ] 3.3 Verify Metro bundles without error and Inventario tab renders accordion UI with category filter chips working (manual smoke test via Metro dev server)

## Phase 4: Cleanup

- [ ] 4.1 Delete `src/features/inventory/InventoryScreen.tsx` (the 277-line monolith) using `git rm` — ONLY after Phase 3.3 passes
- [ ] 4.2 Confirm all success criteria from proposal: zero TS `any`, all files under 150 lines, `ui/` has zero WatermelonDB imports, `model/` has zero JSX/StyleSheet, navigation resolves without "module not found" errors
