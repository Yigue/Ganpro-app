# Proposal: Inventario-FSD

## Intent

`src/features/inventory/InventoryScreen.tsx` is a 277-line monolith that violates every architectural rule the project mandates:

- WatermelonDB imports (`withObservables`, `database`) live inside a component that also renders UI
- No `ui/` or `model/` sub-folders — FSD structure is absent
- `InventoryListInner` and `AnimalListItem` are embedded in the same file as the HOC wiring
- The file exceeds 150 lines (277 actual)

The fix: split the file into proper FSD layers, moving the HOC wiring to `model/` and all presentational components to `ui/`, so future contributors cannot accidentally query the DB from a render function.

## Scope

### In Scope

- Create `src/features/inventory/ui/InventoryScreen.tsx` — pure presentational component (accordion/table view grouped by category, no DB imports)
- Create `src/features/inventory/model/InventoryContainer.tsx` — `withObservables` HOC wiring (only file that touches WatermelonDB)
- Delete `src/features/inventory/InventoryScreen.tsx` (the current monolith)
- Update any navigation/tab imports that reference the old file path
- Extract `AnimalListItem` as a self-contained presentational sub-component inside `ui/`
- Ensure all files stay under 150 lines

### Out of Scope

- Adding new fields to the `animals` table
- Weight history or movement history views
- Search/filter beyond existing category chips
- Unit tests (separate change)
- Any other feature module refactors

## Approach

Follow the pattern already established in `DashboardScreen.tsx`:

```
InventoryInner (pure props) → lives in ui/
InventoryWithData = withObservables([...], () => ({ animals: ... }))(InventoryInner) → lives in model/
InventoryScreen () → manages local state, renders InventoryWithData → lives in ui/
```

The `model/InventoryContainer.tsx` file is the ONLY file that imports `database` or `withObservables`. It exports `InventoryWithData` which the screen composes. No component in `ui/` knows WatermelonDB exists.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/inventory/InventoryScreen.tsx` | Removed | Monolith replaced by split structure |
| `src/features/inventory/ui/InventoryScreen.tsx` | New | Presentational screen + sub-components |
| `src/features/inventory/model/InventoryContainer.tsx` | New | `withObservables` HOC wiring |
| Navigation/tab barrel imports | Modified | Update path from `../inventory/InventoryScreen` to `../inventory/ui/InventoryScreen` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Navigation import path breaks at runtime | Med | Grep all tab/nav files for old import before deleting monolith |
| `AnimalListItem` split causes prop interface drift | Low | Define shared `AnimalItemProps` interface first, then implement |
| File count split still breaches 150 lines | Low | `InventoryScreen.tsx` (ui) gets header + filter chips + FlatList; `AnimalListItem` is a separate export in the same folder |

## Rollback Plan

The current monolith (`InventoryScreen.tsx`) is tracked in git. If the split causes runtime regressions, revert with:
```
git checkout HEAD -- src/features/inventory/InventoryScreen.tsx
git rm src/features/inventory/ui/InventoryScreen.tsx src/features/inventory/model/InventoryContainer.tsx
```
Navigation imports were the only external dependency — restore old path strings.

## Dependencies

- `@nozbe/with-observables` — already installed
- `@nozbe/watermelondb` — already installed
- `@data/models/AnimalModel` — already exists
- `@data/database/database` — already exists
- Shared components (`StatusBadge`, `EmptyState`, `ObservableErrorBoundary`) — already in `@shared/components`

## Success Criteria

- [ ] `src/features/inventory/InventoryScreen.tsx` (monolith) no longer exists
- [ ] `ui/InventoryScreen.tsx` has zero imports from `@nozbe/watermelondb` or `@data/database/database`
- [ ] `model/InventoryContainer.tsx` is the sole file that imports `withObservables` and `database` in this feature
- [ ] All new files are under 150 lines
- [ ] Zero TypeScript `any` usage
- [ ] App navigates to Inventario tab without runtime error
- [ ] Category filter chips still work reactively
