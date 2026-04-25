# Design: Mejoras-Potreros-Nutricion

## Technical Approach
This change refactors the `PotrerosScreen` to transform it from a static view into a robust "Centro de Mando" for resources and nutrition. The approach focuses on extracting complex UI components (like Modals) into separate files for better maintainability, implementing new CRUD operations for `Potreros` and `Suplementos`, and moving business logic (cost calculations, GDP projections) into `NutricionRepository`. We will also fix structural UI bugs, specifically the React Native warning about nested `VirtualizedLists` inside `ScrollViews`, adding missing close buttons to modals, and removing deprecated experimental animation flags.

## Architecture Decisions

### Decision: Extraction of Modals
**Choice**: Move `RacionMixerModal`, `PotreroDetailsModal`, and all new CRUD modals (`PotreroFormModal`, `SuplementoFormModal`, `CCAuditModal`) into separate files under `src/features/potreros/ui/`.
**Alternatives considered**: Keeping all modals within `PotrerosScreen.tsx`.
**Rationale**: `PotrerosScreen.tsx` is already over 350 lines and contains multiple complex inline components. Extracting them reduces file size, improves modularity, and makes it easier to maintain individual features (like adding the Close button to `RacionMixerModal`).

### Decision: Fixing Nested VirtualizedLists
**Choice**: In `PotrerosScreen.tsx`, ensure the main container is a `SafeAreaView` with segmented controls, and the active tab renders a single `FlatList`. Any scrollable sections within the lists will use `ListHeaderComponent` or `.map()` for small datasets (e.g., the `suplementos` list inside `RacionMixerModal`), removing any `ScrollView` wrapping a `FlatList`.
**Alternatives considered**: Ignoring the warning or using `nestedScrollEnabled`.
**Rationale**: React Native explicitly warns against nesting `VirtualizedLists` (like `FlatList`) inside plain `ScrollViews` because it breaks memory optimizations and can cause performance degradation or crashes.

### Decision: Condicion Corporal (CC) Data Binding
**Choice**: The CC LineChart will directly consume the `ccs` observable prop injected via `withObservables` in `PotrerosWithData`, replacing the hardcoded array `[320, 335...]` with `ccs.map(c => c.score)`.
**Alternatives considered**: Fetching CC data via a one-off async call.
**Rationale**: Using WatermelonDB observables ensures the chart updates reactively in real-time whenever a new CC audit is saved via the new `CCAuditModal`.

## Data Flow

```text
  UI Layer (React Native)                     Data Layer (WatermelonDB)
 ┌───────────────────────┐                   ┌──────────────────────────┐
 │ PotrerosScreen        │                   │                          │
 │ ├── CC Chart          │◄── observables ───│ CondicionCorporalModel   │
 │ ├── RacionMixerModal  │                   │ SuplementoModel          │
 │ └── CCAuditModal      │── save audit ────►│                          │
 └──────────┬────────────┘                   └─────────────┬────────────┘
            │                                              ▲
            │ (complex business logic)                     │
            ▼                                              │
 ┌───────────────────────┐                                 │
 │ NutricionRepository   │── CRUD / domain operations ─────┘
 └───────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/inventory/InventoryScreen.tsx` | Modify | Remove `UIManager.setLayoutAnimationEnabledExperimental(true)` to fix Fabric warnings. |
| `src/features/potreros/PotrerosScreen.tsx` | Modify | Remove nested `FlatList`/`ScrollView`. Wire CC chart to real data. Import extracted modals. |
| `src/features/potreros/ui/RacionMixerModal.tsx` | Create | Extract from `PotrerosScreen`. Add header with a close button to prevent blocking. |
| `src/features/potreros/ui/PotreroFormModal.tsx` | Create | Implement CRUD UI for Potreros (Create/Edit). |
| `src/features/potreros/ui/SuplementoFormModal.tsx` | Create | Implement CRUD UI for Suplementos (New Component). |
| `src/features/potreros/ui/CCAuditModal.tsx` | Create | Implement CC audit input (1-5 scale) and save logic. |
| `src/data/repositories/NutricionRepository.ts` | Modify | Add methods for `applyRacionToPotrero` and `calculateGDPEstimado`. |

## Interfaces / Contracts

```typescript
// NutricionRepository.ts additions
export interface GDPResult {
  gdp: number;
  costoKgProducido: number;
}

// CCAuditModal.tsx
export interface CCAuditModalProps {
  visible: boolean;
  onClose: () => void;
  potreros: PotreroModel[];
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `NutricionRepository` | Test `calculateGDPEstimado` logic and ensure `applyRacionToPotrero` creates correct log models. |
| Unit | `RacionMixerModal` | Verify validation logic (must equal 100%) and that the new `onClose` header button functions correctly. |
| E2E | CC Chart Rendering | Ensure inserting a new CC score updates the chart dynamically. |

## Migration / Rollout

No data migration required. The changes leverage existing WatermelonDB schemas (`PotreroModel`, `SuplementoModel`, `RacionModel`, `CondicionCorporalModel`).

## Open Questions

- [ ] None.
