# Tasks: Mejoras-Potreros-Nutricion

## Phase 1: Foundation & Refactor

- [x] 1.1 In `src/features/inventory/InventoryScreen.tsx` (or `App.tsx`/`index.ts`), remove `UIManager.setLayoutAnimationEnabledExperimental(true)` to fix Fabric warnings.
- [x] 1.2 In `src/features/potreros/PotrerosScreen.tsx`, replace nested `ScrollView` wrapping `FlatList` with a single `FlatList` using `ListHeaderComponent` for tabs/segment controls.
- [x] 1.3 In `src/data/repositories/NutricionRepository.ts`, add methods `applyRacionToPotrero(racionId, potreroId, kilos)` and `calculateGDPEstimado(racionId, pesoPromedio)`.

## Phase 2: Core UI Extraction & CRUD

- [x] 2.1 Create `src/features/potreros/ui/PotreroFormModal.tsx` for Potreros Create/Edit ABM.
- [x] 2.2 Create `src/features/potreros/ui/SuplementoFormModal.tsx` for Suplementos Create/Edit ABM.
- [x] 2.3 Extract `RacionMixerModal` from `PotrerosScreen.tsx` to `src/features/potreros/ui/RacionMixerModal.tsx`.
- [x] 2.4 In `src/features/potreros/ui/RacionMixerModal.tsx`, add a header with a Close button to fix UX blocking bug.

## Phase 3: Condicion Corporal (CC) & Integration

- [x] 3.1 Create `src/features/potreros/ui/CCAuditModal.tsx` with date selector, 1-5 scale slider, and WatermelonDB save logic.
- [x] 3.2 In `src/features/potreros/PotrerosScreen.tsx`, integrate `CCAuditModal` triggered by a new FAB (+) in the C.C. tab.
- [x] 3.3 In `src/features/potreros/PotrerosScreen.tsx`, update CC LineChart to use `ccs.map(c => c.score)` injected via `withObservables` instead of hardcoded data.
- [x] 3.4 In `src/features/potreros/PotrerosScreen.tsx`, integrate `PotreroFormModal` (triggered by FAB) and `SuplementoFormModal` in their respective tabs.

## Phase 4: Testing & Verification

- [ ] 4.1 In `src/data/repositories/__tests__/NutricionRepository.test.ts`, write unit tests for `calculateGDPEstimado` and `applyRacionToPotrero`.
- [ ] 4.2 In `src/features/potreros/ui/__tests__/RacionMixerModal.test.tsx`, verify percentage validation (must equal 100%) and close button functionality.
- [ ] 4.3 Verify end-to-end that inserting a new CC score via `CCAuditModal` updates the CC LineChart dynamically.