# Proposal: Scan Module Redesign

## Intent

`ScanScreen.tsx` is a monolithic file mixing HID capture, state logic, and UI rendering. The UI is unpolished (flash animation, plain text radar, bare batch counter) and there is no way to test the RFID flow without physical hardware. This blocks development and degrades the field UX in manga (chute) conditions.

## Scope

### In Scope
- Mock scan button: inject a fake RFID read string without hardware, without stealing TextInput focus
- `RadarAnimation` component: concentric pulse waves via `react-native-reanimated` for idle state
- `SegmentedControl` component: rounded toggle replacing the current mode chip
- `IndividualModeView` component: extract individual scan result rendering from `ScanScreen`
- `BatchModeView` component: extract batch mode rendering, replace plain counter with `FlatList`
- Wire `BottomSheet` (or slide-up panel) for batch queue display
- Preserve 100% of existing HID capture and state machine logic (`useScanStore`, `useRFIDScanner`)

### Out of Scope
- Haptic / audio feedback (deferred to UX polish phase)
- Rewriting `useScanStore` state machine logic
- Action sheets / navigation from scan result (existing behavior unchanged)
- New animal lookup or API changes

## Approach

Split `ScanScreen.tsx` into a thin orchestrator + focused sub-components. The hidden `TextInput` and its `onSubmitEditing` handler stay untouched inside the orchestrator. A mock injection function is added to `useRFIDScanner` (or inline in `ScanScreen`) that calls the same handler with a hardcoded string, then immediately re-focuses the `TextInput` ref.

UI layers use `react-native-reanimated` `withRepeat`/`withTiming` for radar waves and Animated values for found/not-found flash. Mode toggle becomes a self-contained `SegmentedControl`. Batch queue renders via `FlatList` in a bottom-anchored panel.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/scan/ScanScreen.tsx` | Modified | Slim orchestrator; delegates to sub-components |
| `src/features/scan/components/RadarAnimation.tsx` | New | Concentric pulse animation (Reanimated) |
| `src/features/scan/components/IndividualModeView.tsx` | New | Found/not-found card extracted from monolith |
| `src/features/scan/components/BatchModeView.tsx` | New | FlatList queue + clear button |
| `src/features/scan/components/SegmentedControl.tsx` | New | Rounded mode toggle |
| `src/features/scan/hooks/useRFIDScanner.ts` | Modified | Add `injectMock(string)` method |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Mock button steals TextInput focus | High | Call `hiddenInputRef.current?.focus()` immediately after `injectMock` fires |
| Reanimated version mismatch | Med | Pin to version already in package.json; no upgrade |
| Component split breaks HID event flow | Med | Keep TextInput + onSubmitEditing inside `ScanScreen` orchestrator, never move to child |
| BottomSheet z-index conflicts with action sheets | Low | Use simple `FlatList` inside a `View` with `position: absolute` bottom anchor first; upgrade to full BottomSheet library only if needed |

## Rollback Plan

All changes are additive component extractions. `ScanScreen.tsx` can be reverted to its current monolithic version via `git revert` on the feature branch without touching any store, hook, or navigation logic.

## Dependencies

- `react-native-reanimated` (already in project — verify version supports `withRepeat`)
- No new libraries required for MVP scope

## Success Criteria

- [ ] Tapping "Simular Escaneo" triggers the full scan flow (store phase transitions: idle → scanning → found/not_found) without a real RFID reader
- [ ] Hidden TextInput retains focus after mock button tap (physical scanner still works alongside mock)
- [ ] Idle state shows animated concentric pulse waves (not static text)
- [ ] Mode toggle is a rounded segmented control, usable one-handed
- [ ] Batch queue shows scrollable list of scanned tags, not just a counter
- [ ] All existing scan flows (individual found, individual not-found, batch accumulation, clear queue) pass manual QA
