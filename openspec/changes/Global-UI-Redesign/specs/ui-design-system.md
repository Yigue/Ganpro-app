# UI Design System Specification

**Change:** Global-UI-Redesign
**Domain:** Design Tokens + Component Library + Screen Consistency
**Type:** New (no prior spec exists for this domain)

---

## Purpose

Define the behavioral contract for Ganpro-app's design system: tokens, shared components, and screen-level consistency rules. All in-scope screens and components MUST conform to these requirements. ScanScreen is explicitly excluded (covered by `Scan-Module-Redesign`).

---

## Domain 1: Design Tokens

### Requirement: Color Centralization

All color values MUST be declared in `src/theme/colors.ts`. No screen, component, or navigation file SHALL contain hardcoded hex values or inline `rgba()` calls.

Semantic aliases MUST include: `surface`, `surfaceElevated`, `border`, `textPrimary`, `textSecondary`, `textMuted`.

#### Scenario: New color used in a screen

- GIVEN a developer needs a color in any screen file
- WHEN they reference a color value
- THEN it MUST be imported from `src/theme/colors.ts` (or via theme index)
- AND no hex literal SHALL appear in the screen file

#### Scenario: Hardcoded purple elimination

- GIVEN `#C35BD0` currently appears in FinancieroScreen and other files
- WHEN the refactor is applied
- THEN `#C35BD0` MUST be replaced by a named token (e.g., `colors.categoryFinance`)
- AND `grep -r '#C35BD0' src/screens/` MUST return zero results

#### Scenario: Semantic alias resolution

- GIVEN a component uses `colors.surface`
- WHEN rendered on dark theme
- THEN the resolved value MUST produce WCAG AAA contrast (≥7:1) against `colors.textPrimary`

---

### Requirement: Shadow Variants

`src/theme/` MUST export three shadow variants: `small`, `medium`, `large`. Shadows MUST be dark-theme appropriate (subtle glow or low-opacity dark shadow — no white box-shadows).

#### Scenario: Card elevation

- GIVEN a Card component is rendered
- WHEN the `elevation` prop is `medium`
- THEN the shadow token `shadows.medium` is applied
- AND the shadow does NOT use white or light color values

#### Scenario: No shadow variant outside tokens

- GIVEN any component applies visual elevation
- WHEN that elevation is implemented
- THEN it MUST use a named shadow token — no inline `shadowColor`/`shadowOffset` literals

---

### Requirement: Border Radius Scale

A border radius scale MUST be exported from `src/theme/`: `sm` (8px), `md` (12px), `lg` (16px), `full` (999px).

#### Scenario: Consistent card corners

- GIVEN a Card component is rendered
- WHEN border radius is applied
- THEN it MUST use `radii.md` (12px) — not a hardcoded `12` or `borderRadius: 12`

#### Scenario: Pill badge uses full radius

- GIVEN a StatusBadge or TrendBadge renders a pill shape
- WHEN border radius is applied
- THEN it MUST use `radii.full`

---

### Requirement: Typography Presets

`src/theme/typography.ts` MUST export named presets: `headline`, `title`, `body`, `caption`, `label`. Screens MUST reference these presets — not raw `fontSize`/`fontWeight` combinations.

#### Scenario: Screen heading uses preset

- GIVEN a screen title is rendered (e.g., "Inventario")
- WHEN the text style is applied
- THEN it MUST use `typography.headline` or `typography.title`
- AND no raw `fontSize: 24` literal SHALL appear in the same rule

#### Scenario: List row metadata uses caption

- GIVEN a ListItem renders secondary/metadata text
- WHEN the text style is applied
- THEN it MUST use `typography.caption` or `typography.label`

---

## Domain 2: Component Library

### Requirement: ListItem Component

`src/shared/components/ListItem` MUST exist and implement a consistent row pattern: optional leading icon (Ionicons), primary title, optional subtitle, optional right action slot.

Touch target MUST be minimum 44px height; recommended default 56px.

#### Scenario: Standard list row

- GIVEN a list of animals or events is rendered
- WHEN each row is rendered using ListItem
- THEN the row displays: leading icon (if provided), title text, subtitle text (if provided)
- AND the row touch target is ≥44px height

#### Scenario: Right action in ListItem

- GIVEN a ListItem has a `rightAction` prop (e.g., edit button)
- WHEN the user taps the action
- THEN the action handler is called
- AND the right action touch target is ≥44px

#### Scenario: ListItem without icon

- GIVEN `icon` prop is not provided to ListItem
- WHEN rendered
- THEN no empty icon placeholder space is shown — layout adjusts gracefully

---

### Requirement: IconButton Component

`src/shared/components/IconButton` MUST exist. It wraps a single Ionicons icon in a pressable element. It MUST NOT accept emoji strings as icon values. Minimum touch target: 44px; default 56px.

#### Scenario: Replace emoji action button

- GIVEN a screen previously used a TouchableOpacity with "✏️" text
- WHEN refactored to IconButton
- THEN the button renders an Ionicons glyph (e.g., `pencil-outline`)
- AND the touch target is ≥44px

#### Scenario: IconButton disabled state

- GIVEN an IconButton receives `disabled={true}`
- WHEN rendered
- THEN the icon color uses `colors.textMuted`
- AND touch events are suppressed

---

### Requirement: Input Component

`src/shared/components/Input` MUST exist with: label text, text input, error state display. It MUST use theme tokens for colors, typography, and border radius — no inline styles.

#### Scenario: Input with validation error

- GIVEN an Input component has `error="Campo requerido"`
- WHEN rendered
- THEN the border color changes to `colors.error`
- AND the error message is displayed below the input using `typography.caption`

#### Scenario: Input focused state

- GIVEN an Input component receives focus
- WHEN the user taps the field
- THEN the border color changes to `colors.primary`

---

### Requirement: AppModal Component

`src/shared/components/AppModal` MUST exist as a base modal wrapper with: header slot, close button (Ionicons `close` icon), body slot. It MUST use theme tokens exclusively.

#### Scenario: Modal renders with header and body

- GIVEN AppModal receives `title` and `children` props
- WHEN rendered
- THEN the header displays the title using `typography.title`
- AND the close button is an Ionicons icon (not "✕" text or emoji)
- AND the body slot renders `children`

#### Scenario: Modal close action

- GIVEN AppModal is visible
- WHEN the user taps the close button
- THEN `onClose` prop callback is invoked
- AND the modal dismisses

---

### Requirement: Loader Component

`src/shared/components/Loader` MUST exist as a loading spinner using React Native's `ActivityIndicator` or equivalent. It MUST use `colors.primary` as the indicator color.

#### Scenario: Async data loading

- GIVEN a screen is waiting for async data
- WHEN `isLoading` is true
- THEN the Loader component is rendered
- AND no emoji (e.g., ⏳) is used to represent loading state

---

### Requirement: No Emoji in Components

ALL shared components MUST use Ionicons (via `@expo/vector-icons`) for any iconographic element. Emoji strings MUST NOT appear in any component in `src/shared/components/`.

#### Scenario: Existing component emoji audit

- GIVEN any component in `src/shared/components/` is inspected
- WHEN its render output is examined
- THEN no emoji character (Unicode range U+1F300–U+1FAFF) SHALL appear as a literal string

---

## Domain 3: Screen Consistency

### Requirement: Token-Only Colors in Screens

All 8 in-scope screens MUST use theme tokens for all color values. No hardcoded hex or inline `rgba()` SHALL remain after refactor. (ScanScreen excluded.)

| Screen | Applies |
|--------|---------|
| DashboardScreen | YES |
| InventoryScreen | YES |
| SanidadScreen | YES |
| FinancieroScreen | YES |
| PotrerosScreen | YES |
| SettingsScreen | YES |
| EventHistoryScreen | YES |
| ScanScreen | NO — excluded |

#### Scenario: Post-refactor color audit passes

- GIVEN all 7 in-scope screens have been refactored
- WHEN `src/screens/` is scanned for hex literals
- THEN zero results are found (excluding ScanScreen)

---

### Requirement: Shared Component Adoption

Each in-scope screen MUST use at least one shared component from the expanded library (ListItem, IconButton, Input, AppModal, Loader, Card, EmptyState, etc.).

#### Scenario: EventHistoryScreen uses ListItem

- GIVEN EventHistoryScreen renders a list of events
- WHEN the list is rendered
- THEN each row uses the shared `ListItem` component
- AND no inline `StyleSheet.create` row styles duplicate ListItem's layout

---

### Requirement: Ionicons in Navigation Tabs

All 6 navigation tab icons MUST use Ionicons. No emoji SHALL appear as tab icon in `src/navigation/`.

#### Scenario: Navigation tab renders Ionicons

- GIVEN the bottom tab navigator is rendered
- WHEN any of the 6 tabs is examined
- THEN the icon is sourced from Ionicons (e.g., `scan-outline`, `list-outline`)
- AND no emoji string (e.g., "📡", "🐄") is used as a tab icon

---

### Requirement: EmptyState Component Usage

All screens that render conditional empty states MUST use the shared `EmptyState` component. No screen SHALL implement its own empty state UI independently.

#### Scenario: Inventory with no animals

- GIVEN InventoryScreen has zero animals in the list
- WHEN rendered
- THEN the shared `EmptyState` component is displayed
- AND it uses an Ionicons icon (not emoji) and `typography.body` text

---

### Requirement: Consistent Loading Pattern

All screens MUST use the shared `Loader` component for async loading states. No screen SHALL implement an independent loading spinner or use emoji (e.g., ⏳) as a loading indicator.

#### Scenario: Screen loading state

- GIVEN any in-scope screen is fetching data
- WHEN `isLoading` is true
- THEN only the `Loader` component is rendered — no custom spinner or emoji

---

### Requirement: Touch Target Preservation

All interactive elements across all in-scope screens MUST maintain a minimum touch target of 44px height. IconButton and ListItem defaults MUST enforce 56px minimum. No refactor SHALL reduce any currently compliant touch target below 44px.

#### Scenario: IconButton preserves touch area

- GIVEN an IconButton replaces an emoji TouchableOpacity
- WHEN touch target size is measured
- THEN height AND width are ≥44px
- AND if the button was previously 56px+, it MUST remain ≥56px

---

### Requirement: Scan Module Boundary

No spec, component, or screen change in this change set SHALL modify `ScanScreen` internals. Tokens and shared components built here MAY be consumed by `Scan-Module-Redesign` but MUST NOT be coupled to Scan-specific logic.

#### Scenario: Token used in ScanScreen (future)

- GIVEN `Scan-Module-Redesign` consumes a token from `src/theme/colors.ts`
- WHEN the token value changes
- THEN ScanScreen benefits automatically — no Global-UI-Redesign task touches ScanScreen

---

## Constraints Summary

| Constraint | Rule |
|------------|------|
| Dark theme only | MUST NOT introduce light-mode code or conditional theming |
| No new npm packages | MUST NOT add any dependency not already in `package.json` |
| WCAG AAA contrast | All semantic color aliases MUST achieve ≥7:1 contrast ratio |
| Touch targets | Minimum 44px; 56px default on interactive components |
| Ionicons source | MUST use `@expo/vector-icons` — already bundled via Expo |
| Scan exclusion | ScanScreen internals are out of scope — zero modifications |
