# Scan Module Redesign Specification

## Purpose

Decompose the monolithic `ScanScreen` into a thin orchestrator + focused sub-components, add a dev-only mock injection mechanism, and polish the idle and batch UIs with animated radar waves and a scrollable queue.

---

## Requirements

### Requirement: MockScanButton

The system MUST provide a visible button in dev/test environments that injects a hardcoded RFID string into the scan flow without requiring physical hardware.

The button MUST NOT steal or permanently remove focus from the hidden `TextInput`.

The button MUST be absent (not rendered) in production builds.

#### Scenario: Developer taps mock button in idle state

- GIVEN the app runs in `__DEV__ === true` and `ScanScreen` is mounted in idle state
- WHEN the user taps "Simular Escaneo"
- THEN `injectMock` fires with a hardcoded EPC string
- AND the scan state machine transitions from `idle` → `scanning` → `found` or `not_found`
- AND the hidden `TextInput` regains focus within the same JS event loop tick

#### Scenario: Mock button absent in production

- GIVEN `__DEV__ === false`
- WHEN `ScanScreen` renders
- THEN no "Simular Escaneo" button appears in the component tree

#### Scenario: Physical scanner still works after mock tap

- GIVEN the mock button was tapped and the scan cycle completed
- WHEN a physical HID reader sends a barcode/RFID string
- THEN `onSubmitEditing` fires as normal and the scan flow executes correctly

---

### Requirement: RadarAnimation

The system MUST display animated concentric pulse waves during the idle scanning state using `react-native-reanimated` `withRepeat`.

The animation MUST loop indefinitely while the screen is in idle/ready state.

The animation MUST stop or freeze when the component unmounts.

#### Scenario: Idle state shows radar waves

- GIVEN `ScanScreen` is mounted and scan state is `idle`
- WHEN the `RadarAnimation` component renders
- THEN at least two concentric circles animate outward with decreasing opacity in a repeating loop

#### Scenario: Animation cleans up on unmount

- GIVEN `RadarAnimation` is mounted and animating
- WHEN the component unmounts (user navigates away)
- THEN all `useAnimatedStyle` / `withRepeat` loops are cancelled with no memory leaks or warnings

---

### Requirement: SegmentedControl

The system MUST render a rounded two-option toggle (Individual / Batch) that switches the active scan mode.

The control MUST be accessible: each option MUST have an `accessibilityRole="button"` and `accessibilityState.selected` reflecting active state.

#### Scenario: Toggle switches to Batch mode

- GIVEN `SegmentedControl` displays Individual as the active option
- WHEN the user taps "Lote"
- THEN the active indicator moves to "Lote"
- AND `onModeChange("batch")` is called

#### Scenario: Toggle switches back to Individual mode

- GIVEN `SegmentedControl` displays Batch as the active option
- WHEN the user taps "Individual"
- THEN the active indicator moves to "Individual"
- AND `onModeChange("individual")` is called

#### Scenario: Accessibility state is correct

- GIVEN `SegmentedControl` renders with `activeMode="individual"`
- WHEN an assistive technology reads the options
- THEN "Individual" has `accessibilityState.selected=true`
- AND "Lote" has `accessibilityState.selected=false`

---

### Requirement: IndividualModeView

The system MUST render a single-animal result card (found or not-found) extracted from `ScanScreen`.

The component MUST accept animal data and scan-result state as props; it MUST NOT read from the store directly.

#### Scenario: Renders found animal card

- GIVEN `IndividualModeView` receives `result="found"` and a valid `animal` prop
- WHEN the component renders
- THEN the animal's identifier, species, and status are displayed
- AND a visual "found" indicator (color/icon) is shown

#### Scenario: Renders not-found state

- GIVEN `IndividualModeView` receives `result="not_found"` and `animal=null`
- WHEN the component renders
- THEN a "Tag no registrado" message is displayed
- AND no animal data fields are rendered

#### Scenario: Renders idle/ready placeholder

- GIVEN `IndividualModeView` receives `result="idle"`
- WHEN the component renders
- THEN a neutral placeholder or instruction text is shown (no result card)

---

### Requirement: BatchModeView

The system MUST render a scrollable `FlatList` of all scanned RFID tags in the current batch queue.

The component MUST display a running count of scanned items.

The component MUST provide a "Limpiar" (clear) button that empties the queue.

#### Scenario: Shows scanned tags list

- GIVEN `BatchModeView` receives a non-empty `queue` array
- WHEN the component renders
- THEN each tag string appears as a row in the `FlatList`
- AND the count label shows the correct number (e.g., "3 animales escaneados")

#### Scenario: Clear button empties the queue

- GIVEN `BatchModeView` shows a queue with items
- WHEN the user taps "Limpiar"
- THEN `onClearQueue` callback is called
- AND the list becomes empty after state update

#### Scenario: Empty queue shows placeholder

- GIVEN `BatchModeView` receives `queue=[]`
- WHEN the component renders
- THEN a "Esperando escaneos..." placeholder is shown
- AND no `FlatList` rows render

---

### Requirement: ScanScreen Orchestrator

`ScanScreen` MUST act as a thin orchestrator: it retains the hidden `TextInput` and its `onSubmitEditing` handler, and delegates all UI rendering to sub-components.

The hidden `TextInput` and its ref MUST NOT be moved into any child component.

`ScanScreen` MUST wire `injectMock` from `useRFIDScanner` (or inline equivalent) to `MockScanButton`.

#### Scenario: HID input wired correctly after refactor

- GIVEN `ScanScreen` is the orchestrator and sub-components handle UI
- WHEN a physical scanner sends a keystroke sequence ending in Enter
- THEN `onSubmitEditing` fires on the hidden `TextInput` inside `ScanScreen`
- AND the scan state machine processes the EPC string identically to pre-refactor behavior

#### Scenario: Mode switch renders correct sub-component

- GIVEN `ScanScreen` tracks `activeMode` state
- WHEN `activeMode === "individual"`
- THEN `IndividualModeView` is rendered and `BatchModeView` is NOT
- WHEN `activeMode === "batch"`
- THEN `BatchModeView` is rendered and `IndividualModeView` is NOT

---

### Requirement: injectMock on useRFIDScanner

`useRFIDScanner` MUST expose an `injectMock(epc: string)` method that calls the same internal handler as `onSubmitEditing`, then synchronously re-focuses the hidden input ref.

#### Scenario: injectMock triggers full scan cycle

- GIVEN `useRFIDScanner` is initialized with a valid `inputRef`
- WHEN `injectMock("E200123456789ABC")` is called
- THEN the hook's internal scan handler processes `"E200123456789ABC"`
- AND `inputRef.current?.focus()` is called before the function returns
