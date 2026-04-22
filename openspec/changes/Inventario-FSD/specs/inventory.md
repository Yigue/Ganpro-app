# Inventory FSD Refactor Specification

## Purpose

Replace the 277-line `InventoryScreen.tsx` monolith with a proper FSD layered structure:
`model/InventoryContainer.tsx` (HOC wiring only) and `ui/InventoryScreen.tsx` (pure presentational).

---

## TypeScript Interfaces

### Requirement: Define shared interfaces before implementation

The system MUST define the following interfaces in a shared types file or at the top of the relevant module before any component implementation begins. Zero `any` usage is allowed.

| Interface | Location | Fields |
|-----------|----------|--------|
| `AnimalItemProps` | `ui/` | `id: string`, `idCaravana: string`, `sexo: 'M' \| 'F'`, `categoria: CategoriaType` |
| `CategorySectionProps` | `ui/` | `categoria: CategoriaType`, `color: string`, `count: number`, `animals: AnimalItemProps[]`, `expanded: boolean`, `onToggle: () => void` |
| `InventoryInnerProps` | `model/` | `animals: AnimalModel[]`, `allAnimals: AnimalModel[]` + all `InventoryOuterProps` |
| `InventoryOuterProps` | `model/` | `filterCategory: CategoriaType \| null`, `onFilterChange: (cat: CategoriaType \| null) => void`, `refreshing: boolean`, `onRefresh: () => void` |

#### Scenario: Interfaces enforce layer boundary

- GIVEN a developer imports `AnimalItemProps` in `ui/InventoryScreen.tsx`
- WHEN they try to assign an `AnimalModel` instance directly to it
- THEN TypeScript MUST raise a type error because `AnimalModel` is not assignable to `AnimalItemProps`

---

## InventoryContainer (model layer)

### Requirement: Single responsibility — HOC wiring only

`model/InventoryContainer.tsx` MUST import `withObservables` and `database`. It MUST NOT contain any JSX or style declarations. It MUST NOT exceed 150 lines.

#### Scenario: Container exports reactive HOC

- GIVEN the `InventoryContainer` module is imported
- WHEN navigation renders `InventoryWithData` with `filterCategory = null`
- THEN `withObservables` MUST subscribe all `ACTIVO` animals and pass them as `animals` prop to the inner component

#### Scenario: Filter by categoria

- GIVEN `filterCategory = 'Vaca'`
- WHEN WatermelonDB emits a new animal with `categoria = 'Ternero'`
- THEN the `animals` observable MUST NOT include that animal in the emission

#### Scenario: allAnimals always unfiltered

- GIVEN any value of `filterCategory`
- WHEN the container builds its observables
- THEN `allAnimals` MUST always observe all `ACTIVO` animals regardless of `filterCategory`

### Requirement: Zero UI in container

The file MUST NOT import from `react-native`, `@theme`, or any style utility.

#### Scenario: No JSX in container

- GIVEN a linter or type-check runs on `model/InventoryContainer.tsx`
- WHEN the file is analyzed
- THEN MUST find zero JSX elements and zero `StyleSheet` references

---

## InventoryScreen UI (presentational layer)

### Requirement: Zero WatermelonDB imports

`ui/InventoryScreen.tsx` MUST NOT import from `@nozbe/watermelondb`, `@nozbe/with-observables`, or `@data/database/database`.

#### Scenario: Compile without DB deps

- GIVEN `ui/InventoryScreen.tsx` is compiled in isolation
- WHEN WatermelonDB packages are removed from node_modules
- THEN the UI file MUST still compile without errors

### Requirement: Accordion view grouped by categoria

The UI MUST render one collapsible section per `CategoriaType` present in `animals`. Each section header MUST display: category name, category color, and animal count.

#### Scenario: Sections render for present categories

- GIVEN `animals` contains 3 Vacas and 2 Terneros, no other categories
- WHEN the component renders
- THEN MUST show exactly 2 accordion section headers (Vaca, Ternero)
- AND each header MUST show the correct count

#### Scenario: Expand/collapse section

- GIVEN a category section is collapsed
- WHEN the user taps the section header
- THEN the section MUST expand, showing all animal rows for that category
- AND tapping again MUST collapse it

### Requirement: Animal row content and touch target

Each animal row MUST display `idCaravana`, `sexo` label, and a `StatusBadge` for `categoria`. Row minimum height MUST be 56px.

#### Scenario: Animal row renders required fields

- GIVEN an animal with `idCaravana = "AR-1234"`, `sexo = "M"`, `categoria = "Toro"`
- WHEN the row renders
- THEN MUST show text "AR-1234", text "Macho", and a `StatusBadge` with label "Toro"

#### Scenario: Touch target compliance

- GIVEN any animal row
- WHEN rendered
- THEN the touchable/pressable area MUST have `minHeight` of 56

### Requirement: Category filter chips

The UI MUST render a horizontal filter chip list with one chip per `CategoriaType` plus an "Todos" chip. The active chip MUST be visually distinct.

#### Scenario: Filter chip activates

- GIVEN the "Todos" chip is active
- WHEN the user taps the "Vaca" chip
- THEN `onFilterChange('Vaca')` MUST be called
- AND the "Vaca" chip MUST render with active styles

#### Scenario: "Todos" chip clears filter

- GIVEN `filterCategory = 'Toro'`
- WHEN the user taps "Todos"
- THEN `onFilterChange(null)` MUST be called

### Requirement: EmptyState when no animals

WHEN `animals.length === 0`, the component MUST render `EmptyState`. MUST NOT render the `FlatList`.

#### Scenario: EmptyState with active filter

- GIVEN `filterCategory = 'Novillo'` and `animals = []`
- WHEN the component renders
- THEN MUST show `EmptyState` with a subtitle referencing the category name

#### Scenario: EmptyState without filter

- GIVEN `filterCategory = null` and `animals = []`
- WHEN the component renders
- THEN MUST show `EmptyState` with subtitle prompting to register the first animal

### Requirement: File size budget

`ui/InventoryScreen.tsx` MUST NOT exceed 150 lines. If `AnimalListItem` grows beyond ~40 lines, it MUST be extracted to `ui/AnimalListItem.tsx`.

---

## Navigation Integrity

### Requirement: Navigation import resolves after monolith deletion

All tab/navigation files that import `InventoryScreen` MUST be updated to point to `ui/InventoryScreen` before the monolith is deleted.

#### Scenario: Old import path removed

- GIVEN `src/features/inventory/InventoryScreen.tsx` has been deleted
- WHEN the app is bundled
- THEN zero "module not found" errors for any `inventory/InventoryScreen` import path MUST occur

#### Scenario: New import path works at runtime

- GIVEN the navigation stack imports from `../inventory/ui/InventoryScreen`
- WHEN the user navigates to the Inventario tab
- THEN the screen MUST render without a runtime error

---

## Cross-Cutting Rules

| Rule | Applies to |
|------|------------|
| Zero `any` | All new files |
| Max 150 lines | Each individual file |
| No WatermelonDB in `ui/` | `ui/InventoryScreen.tsx`, `ui/AnimalListItem.tsx` |
| No JSX in `model/` | `model/InventoryContainer.tsx` |
| `ACTIVO` estado filter | Both `animals` and `allAnimals` queries |
