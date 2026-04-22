# Proposal: Global UI Redesign

## Intent

Ganpro-app is visually inconsistent and informal: emoji icons, 33 scattered StyleSheets, hardcoded colors, and no shared patterns across 8 screens. The goal is a modern, polished UI that feels professional while preserving the dark theme and field usability that the app depends on.

## Scope

### In Scope
- Finalize design tokens: shadows, border-radius scale, semantic color aliases, typography presets (headline/body/caption)
- Replace all emoji icons with Ionicons across navigation and screens
- Centralize all hardcoded colors (`#C35BD0`, inline `rgba()`) into `src/theme/colors.ts`
- Expand shared component library from 10 to ~16 components (add `ListItem`, `InputBase`, `ModalBase`, `Spinner`, `IconButton`)
- Screen-by-screen refactor: Dashboard → Inventory → Sanidad → Financiero → Potreros → Settings → EventHistory
- Consistent card, list, filter, and summary patterns across all screens

### Out of Scope
- Scan module (covered by `Scan-Module-Redesign` change — coordinate, do not duplicate)
- Light theme variant — dark only
- New npm packages — Ionicons is already bundled via Expo
- Animation/gesture library additions
- Backend or data layer changes

## Approach

Design System First. Tokens and shared components are built once, then screens consume them. This ensures global changes require touching one file, not 33.

**Phase 1 — Tokens & Foundations** (`src/theme/`)
- Add `shadows.ts` with 3 elevation levels (sm, md, lg)
- Add border-radius variants to `spacing.ts` or new `radii.ts`
- Add semantic aliases to `colors.ts` (e.g., `surface`, `onSurface`, `categoryAnimal`, `categoryFinance`)
- Add named presets to `typography.ts` (e.g., `headline`, `bodyLg`, `bodySm`, `caption`, `label`)

**Phase 2 — Component Library** (`src/components/`)
- `IconButton`: Ionicons-based, replaces emoji action buttons (✏️ 🗑️)
- `ListItem`: standard row with leading icon, title, subtitle, trailing action
- `InputBase`: styled text input aligned with dark theme tokens
- `ModalBase`: consistent modal shell with header/close/body slots
- `Spinner`: loading indicator for async states
- `TabBar`: reusable tab strip (used by Sanidad and Financiero)

**Phase 3 — Screen Refactor** (all screens except Scan)
- Apply tokens and shared components screen by screen
- Eliminate local StyleSheets where shared patterns exist
- Replace all emoji with Ionicons equivalents

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/theme/colors.ts` | Modified | Add semantic aliases, remove hardcoded callers |
| `src/theme/typography.ts` | Modified | Add named text presets |
| `src/theme/spacing.ts` | Modified | Add border-radius scale |
| `src/theme/shadows.ts` | New | Elevation tokens (sm/md/lg) |
| `src/components/` | Modified + New | 6 new components, update existing 10 |
| `src/navigation/` | Modified | Replace emoji tab icons with Ionicons |
| `src/screens/DashboardScreen.tsx` | Modified | Apply tokens, shared components |
| `src/screens/InventoryScreen.tsx` | Modified | Apply tokens, replace emoji actions |
| `src/screens/SanidadScreen.tsx` | Modified | Apply tokens, use TabBar component |
| `src/screens/FinancieroScreen.tsx` | Modified | Centralize `#C35BD0` usage |
| `src/screens/PotrerosScreen.tsx` | Modified | Apply tokens, card patterns |
| `src/screens/SettingsScreen.tsx` | Modified | Apply tokens |
| `src/screens/EventHistoryScreen.tsx` | Modified | Apply ListItem pattern |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scope creep into Scan module | Med | Explicit out-of-scope boundary; sync with `Scan-Module-Redesign` at integration |
| Breaking touch targets (<56px) | Low | Enforce via shared component defaults; review each screen |
| WCAG contrast regression | Low | Use semantic color aliases with pre-validated contrast; spot-check after each phase |
| StyleSheet consolidation introduces regressions | Med | Phase-by-phase approach; test each screen before moving to next |
| Ionicons glyph mismatch (wrong icon feel) | Low | Review icon list against Ionicons v5 before Phase 2 |

## Rollback Plan

- All work on feature branch `claude/livestock-management-mvp-5UuhX` — revert to commit before Phase 1 starts if tokens cause regressions
- Each phase is independently committable; rollback granularity is per-phase
- Screen-level rollback: revert individual screen file, shared components are additive (old screens still compile)
- No database or API changes — frontend-only, zero data risk

## Dependencies

- `Scan-Module-Redesign` change: must not duplicate Scan screen work; tokens/components built here are consumed by Scan redesign
- Ionicons already available via `@expo/vector-icons` — no install required

## Success Criteria

- [ ] Zero hardcoded color hex values outside `src/theme/colors.ts`
- [ ] All tab icons use Ionicons (no emoji in navigation)
- [ ] Zero emoji used as action buttons across all in-scope screens
- [ ] All screens use at least one shared component from the expanded library
- [ ] `StyleSheet.create()` count reduced from 33 to ≤15 (local styles only for truly unique layouts)
- [ ] Touch targets remain ≥56px on all interactive elements
- [ ] Dark theme preserved — no light mode code introduced
- [ ] App compiles and runs without errors after each phase
