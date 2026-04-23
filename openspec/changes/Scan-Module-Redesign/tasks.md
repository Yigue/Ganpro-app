# Tasks: Scan Module Redesign

## Phase 1: Foundation — Hook & Types

- [x] 1.1 In `src/features/scan/hooks/useRFIDScanner.ts`, add `injectMock(rfid?: string): void` to `UseRFIDScannerReturn` interface
- [x] 1.2 Implement `injectMock` as `useCallback` inside the hook: call `processRfid(rfid ?? MOCK_RFID)` then `ensureFocus()`; add `const MOCK_RFID = 'MOCK-0001-TEST'` constant at module level
- [x] 1.3 Return `injectMock` from the hook alongside existing values; verify TypeScript compilation passes with no type errors

## Phase 2: Components — New Files

- [x] 2.1 Create `src/features/scan/components/RadarAnimation.tsx`: 3 concentric rings each using `useSharedValue(0)` → `withRepeat(withTiming(1, {duration:1500}), -1)` with `withDelay(index * 500)` phase offset; `useAnimatedStyle` for scale + opacity; cleanup on unmount via `cancelAnimation`
- [x] 2.2 Create `src/features/scan/components/SegmentedControl.tsx`: props `options:[string,string]`, `selectedIndex:0|1`, `onChange:(index:0|1)=>void`, `style?:ViewStyle`; each option is a `TouchableOpacity` with `accessibilityRole="button"` and `accessibilityState={{selected}}`;  active option gets pill background
- [x] 2.3 Create `src/features/scan/components/IndividualModeView.tsx`: props `phase:ScanPhase`, `currentRfid:string|null`; owns `Animated.Value` for flash; renders `RadarAnimation` when `phase==="idle"`, RFID label + phase chip otherwise; renders `AnimalCard` when `phase==="found"`; shows "Tag no registrado" when `phase==="not_found"`
- [x] 2.4 Create `src/features/scan/components/BatchModeView.tsx`: props `queue:Array<{rfid:string;animalId?:string}>`, `onClear:()=>void`, `onProcess:()=>void`, `ensureFocus:()=>void`; `FlatList` with `keyExtractor={(item,index)=>\`${item.rfid}-${index}\``; shows "Esperando escaneos..." when queue empty; "Limpiar cola" button calls `onClear` then `ensureFocus`; "PROCESAR (N)" button calls `onProcess` then `ensureFocus`
- [x] 2.5 Create `src/features/scan/components/index.ts`: barrel export for `RadarAnimation`, `SegmentedControl`, `IndividualModeView`, `BatchModeView`

## Phase 3: Integration — ScanScreen Wiring

- [x] 3.1 In `ScanScreen.tsx`, destructure `injectMock` from `useRFIDScanner`; replace existing center-content JSX with `<IndividualModeView>` or `<BatchModeView>` conditioned on `activeMode` state
- [x] 3.2 Replace existing mode chip with `<SegmentedControl options={["Individual","Lote"]} selectedIndex={activeMode==="individual"?0:1} onChange={(i)=>{setActiveMode(i===0?"individual":"batch"); ensureFocus()}} />`
- [x] 3.3 Add `__DEV__` guard mock button above sub-components: `{__DEV__ && <TouchableOpacity onPress={()=>injectMock()}><Text>Simular Escaneo</Text></TouchableOpacity>}` — **extended**: uses `SHOW_MOCK_BUTTON = __DEV__ || process.env.EXPO_PUBLIC_ENABLE_MOCK_BUTTON === 'true'` to support staging builds per user decision
- [x] 3.4 Pass `ensureFocus` as prop to `BatchModeView`; verify hidden `TextInput` remains unconditional and above all sub-components in JSX order
- [x] 3.5 Import all new components from `src/features/scan/components/index.ts`; delete extracted JSX blocks from `ScanScreen`; confirm file compiles with no unused imports

## Phase 5: Session & Hardware Mode (Manga Workflow)

- [x] 5.1 `scanStore.ts`: add `HardwareMode`, `QueueItemStatus` (5 states), enhance `QueueItem` with `categoria`/`estado`, add `sessionActive`/`sessionStartedAt`/`hardwareMode` state, add `startSession`/`endSession`/`setHardwareMode`/`enqueueLoading`/`hydrateQueueItem` actions
- [x] 5.2 `useRFIDScanner.ts`: rename debounce to `SINGLE_DEBOUNCE_MS=300`, add `CONTINUOUS_DEBOUNCE_MS=3000`, add `continuousFilterRef` (Map<rfid,timestamp>), bifurcate `processRfid` into session flow (enqueue+hydrate+DB) vs individual flow (existing sheets)
- [x] 5.3 `ScanScreen.tsx`: add session selectors/handlers, hardware mode `SegmentedControl` (visible only when session active), "INICIAR TRABAJO EN MANGA" / "FINALIZAR SESIÓN" buttons gated on `batchMode && sessionActive`

## Phase 6: Session Queue UI (Next)

- [x] 6.1 Create `SessionQueueView.tsx`: FlatList de QueueItem con StatusIndicator (spinner para loading, dot de color por estado) y badge de texto; footer con Limpiar/Procesar Lote; tap en fila llama `onItemPress`
- [x] 6.2 `BulkActionSheet.tsx` ya existía con Vacunación/Pesaje/Cambio de Lote + WatermelonDB transaccional — reutilizado sin cambios
- [x] 6.3 Create `ItemDetailModal.tsx`: Modal RN nativo con 3 vistas (pending_registration placeholder, pending→form PESAJE/VACUNACION, processed→readonly); escribe Evento a WatermelonDB + marca ítem como processed
- [x] 6.4 Wire `ScanScreen`: `sessionActive && batchMode` → SessionQueueView; `batchMode && !sessionActive` → BatchModeView; `!batchMode` → IndividualModeView; ItemDetailModal montado permanentemente con `visible={selectedQueueItem !== null}`

## Phase 4: Testing

- [ ] 4.1 Unit test `injectMock`: mock `processRfid`, spy on `ensureFocus`, call `injectMock("TEST-001")` → assert both were called in order; call with no args → assert `processRfid("MOCK-0001-TEST")` called
- [ ] 4.2 Unit test `SegmentedControl`: render with `selectedIndex=0`, tap second option → assert `onChange(1)` called; verify `accessibilityState.selected` is `true` for active and `false` for inactive option
- [ ] 4.3 Unit test `BatchModeView`: render with 3-item queue → assert 3 RFID strings in tree; tap "Limpiar cola" → assert `onClear` and `ensureFocus` called; render with empty queue → assert "Esperando escaneos..." visible
- [ ] 4.4 Unit test `IndividualModeView`: render with `phase="idle"` → assert `RadarAnimation` present; `phase="found"` → assert `AnimalCard` present; `phase="not_found"` → assert "Tag no registrado" text present
- [ ] 4.5 Integration test full mock scan flow: mount `ScanScreen` with real `useScanStore`, tap "Simular Escaneo" → assert store transitions `idle→scanning→found` and `TextInput` ref is focused after cycle
- [ ] 4.6 Manual QA: verify physical HID scanner fires `onSubmitEditing` correctly after component split; verify mock button absent in production build (`__DEV__===false`)
