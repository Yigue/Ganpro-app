# Design: Scan Module Redesign

## Technical Approach

Extract UI concerns from `ScanScreen.tsx` into focused sub-components under `src/features/scan/components/`. Add `injectMock` to `useRFIDScanner` (not inline in the screen) so the method is testable independently. The hidden `TextInput` plus all its event handlers stays locked inside `ScanScreen` — no child component ever receives or re-renders it. Reanimated 4.x (`withRepeat`/`withTiming`) drives `RadarAnimation`. `SegmentedControl` is a custom component (no new library). `BatchModeView` uses a `FlatList` inside a bottom-anchored `View` (no BottomSheet library upgrade needed for MVP).

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|----------|--------|-----------------------|-----------|
| `injectMock` location | Method added to `useRFIDScanner`, returned on the hook interface | Inline in `ScanScreen` | Hook owns the `inputRef` and `processRfid`; putting mock there avoids prop-drilling the ref. Testable in isolation. |
| Mock re-focus strategy | After `processRfid(mockRfid)`, call `ensureFocus()` inside `injectMock` | Caller re-focuses after tap | Caller should not know about focus mechanics. Hook owns it. |
| `RadarAnimation` animation driver | `react-native-reanimated` `withRepeat(withTiming(...))` on `useSharedValue` | `Animated` API (legacy) | Reanimated 4.1 is already in package.json; runs on UI thread, no bridge jank. |
| `SegmentedControl` | Custom component, no new library | `@react-native-segmented-control/segmented-control` | Zero new dependency. Project uses custom `Button` and `StatusBadge` — same pattern applies. Two-option toggle is trivial to build. |
| `BatchModeView` scroll container | `FlatList` inside a `View` with `position: absolute; bottom: 0` | Full `@gorhom/bottom-sheet` integration | Library already in package.json but adds gesture complexity. Flat panel is sufficient for MVP. Can be upgraded later without changing `BatchModeView`'s data interface. |
| `IndividualModeView` flash animation | Keep `Animated.Value` + `Animated.sequence` from existing code, move it into the component | Port to Reanimated | Flash is a simple two-step sequence; `Animated` API works fine and avoids mixing two animation systems in one component. |
| Batch swipe-to-remove | Clear button only (no swipe-to-remove) | `react-native-swipeable` | Swipe gesture conflicts with scroll in a `FlatList` inside a bottom panel. Out of scope per proposal. Clear button is sufficient. |

## Data Flow

```
Physical HID reader
        │  (keystrokes → Enter)
        ▼
 hidden TextInput (stays in ScanScreen, never moves)
        │  onSubmitEditing
        ▼
 useRFIDScanner.processRfid(rawId)
        │
        ├─→ useScanStore (phase, currentRfid, queue)
        │
        └─→ WatermelonDB query

 Mock button tap (dev only)
        │  onPress
        ▼
 useRFIDScanner.injectMock()
        │  calls processRfid(MOCK_RFID)
        │  then ensureFocus()
        ▼
 same path as physical scan ↑

ScanScreen (thin orchestrator)
  ├── hidden TextInput
  ├── Animated flash overlay
  ├── StatusBar (inline, small)
  ├── SegmentedControl  ──→  toggleBatchMode + ensureFocus
  ├── [batchMode=false] IndividualModeView
  │     ├── RadarAnimation (idle phase)
  │     └── AnimalCard (found phase)
  └── [batchMode=true]  BatchModeView
        └── FlatList of queue items + Clear button
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/scan/hooks/useRFIDScanner.ts` | Modify | Add `injectMock()` to return type and implementation |
| `src/features/scan/ScanScreen.tsx` | Modify | Remove center-content JSX; import and compose sub-components; add mock button (dev guard) |
| `src/features/scan/components/RadarAnimation.tsx` | Create | Reanimated concentric pulse waves for idle state |
| `src/features/scan/components/SegmentedControl.tsx` | Create | Two-option rounded toggle; replaces emoji chip |
| `src/features/scan/components/IndividualModeView.tsx` | Create | RFID value, phase chip, flash animation, AnimalCard, idle state |
| `src/features/scan/components/BatchModeView.tsx` | Create | FlatList of queued RFIDs, clear button, process button |
| `src/features/scan/components/index.ts` | Create | Barrel export for all new components |

## Interfaces / Contracts

```typescript
// useRFIDScanner.ts — extended return type
export interface UseRFIDScannerReturn {
  inputRef: React.RefObject<TextInput | null>;
  ensureFocus: () => void;
  onSubmitEditing: (event: { nativeEvent: { text: string } }) => void;
  onChangeText: (text: string) => void;
  injectMock: (rfid?: string) => void; // NEW
}

// Hardcoded default inside the hook:
const MOCK_RFID = 'MOCK-0001-TEST';

// injectMock implementation (inside useRFIDScanner):
const injectMock = useCallback((rfid: string = MOCK_RFID) => {
  processRfid(rfid);
  ensureFocus(); // re-focus AFTER processRfid fires — no await needed
}, [processRfid, ensureFocus]);
```

```typescript
// SegmentedControl.tsx
interface SegmentedControlProps {
  options: [string, string];          // exactly two labels
  selectedIndex: 0 | 1;
  onChange: (index: 0 | 1) => void;
  style?: ViewStyle;
}
```

```typescript
// RadarAnimation.tsx
interface RadarAnimationProps {
  size?: number;       // default 200
  color?: string;      // default colors.primary
  pulseCount?: number; // default 3 concentric rings
}
// Internal: useSharedValue(0) animated 0→1 with withRepeat(withTiming(1, {duration:1500}), -1)
// Each ring offset by (index / pulseCount) phase delay via withDelay
```

```typescript
// IndividualModeView.tsx
interface IndividualModeViewProps {
  phase: ScanPhase;
  currentRfid: string | null;
}
// Owns: flashAnim (Animated.Value), PHASE_MESSAGES, PHASE_COLORS
// Renders: rfidLabel, rfidValue, phaseChip, AnimalCard, RadarAnimation (idle only)
```

```typescript
// BatchModeView.tsx
interface BatchModeViewProps {
  queue: Array<{ rfid: string; animalId?: string }>;
  onClear: () => void;
  onProcess: () => void;
}
// FlatList keyExtractor: (item, index) => `${item.rfid}-${index}`
// No swipe-to-remove. Single "Limpiar cola" button. "PROCESAR (N)" primary button at bottom.
```

## Critical Constraint: Hidden TextInput Focus

The `TextInput` stays rendered unconditionally inside `ScanScreen`, above all sub-components. It is never passed as a prop or rendered conditionally. Any button that could steal focus (mock button, SegmentedControl, clear button, process button) must call `ensureFocus()` in its `onPress` AFTER the primary action. `injectMock` handles its own re-focus internally. All other buttons in sub-components receive an `onAfterPress` or the parent passes `ensureFocus` explicitly. `BatchModeView` receives `ensureFocus` as a prop.

```typescript
// ScanScreen.tsx — mock button dev guard
{__DEV__ && (
  <TouchableOpacity onPress={() => injectMock()} style={styles.mockBtn}>
    <Text>Simular Escaneo</Text>
  </TouchableOpacity>
)}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `injectMock` calls `processRfid` and re-focuses | Jest + mock `processRfid`, spy on `ensureFocus` |
| Unit | `SegmentedControl` calls `onChange` with correct index | `@testing-library/react-native` |
| Unit | `BatchModeView` renders queue items via FlatList | RNTL, verify `getByText` on RFID strings |
| Unit | `RadarAnimation` mounts without crash, no NaN in shared values | Snapshot + Reanimated test utils |
| Integration | Full mock scan flow: tap mock → phase transitions → focus retained | RNTL + `useScanStore` real store |
| Manual QA | Physical HID reader still works after component split | Field test on device |

## Migration / Rollout

No data migration required. All changes are additive extractions on a feature branch. The monolithic `ScanScreen.tsx` remains recoverable via `git revert` on the branch. The `injectMock` method is gated behind `__DEV__` at the call site, so it ships safely to production builds (the function exists but the button is never rendered).

## Open Questions

- [ ] Should `BatchModeView` show animal names (requires a DB lookup per queue item) or just raw RFID strings? Proposal shows FlatList but doesn't specify. Current `queue` store shape only has `rfid` + optional `animalId`.
- [ ] Should the mock button be visible only in DEV builds or also in staging? `__DEV__` flag covers Expo dev client but not standalone staging builds.
