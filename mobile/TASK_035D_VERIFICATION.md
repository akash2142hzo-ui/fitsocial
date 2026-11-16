# Task 035D — FitPoints information button visual correction

Date: 2026-11-16

## Change

Replaced the large lime outlined circle and circled information glyph with a minimal 22 dp information glyph on a borderless 36 × 36 dp dark rounded-square background (10 dp corner radius). The enclosing Pressable remains 44 × 44 dp, in the same position to the right of the balance below Demo. Its transparent resting border retains keyboard focus feedback without a permanent outline. The outer dimensions, balance-card styles, spacing and row alignment are unchanged, so this change introduces no card-height increase. Decorative glyph scaling is capped independently of readable screen text.

The About FitPoints label/hint, expanded state, press feedback, earning-information modal, Close control, accessibility escape and native Android onRequestClose dismissal are unchanged. No other Rewards cards, illustrations, sheets, navigation or demo restrictions changed.

## Verification

- `npm.cmd run typecheck`: PASS.
- `npm.cmd run lint`: PASS, no warnings/errors.
- Focused Rewards/UI/navigation tests: PASS, 176 tests across 4 suites.
- Full mobile regression (`npm.cmd test -- --watch=false`): PASS, 709 tests across 32 suites.
- `git diff --check`: PASS; prior unrelated line-ending notices only.
- Empty-baseline whitespace checks: PASS for all three task files, including untracked files.
- SHA-256 preservation check: PASS; all 1,453 nonignored files outside the three task paths match the pre-task baseline, including Admin Studio, backend, navigation, other mobile screens and all prior reports.

Updated visual regression assertions require the unchanged 44 dp target, transparent outer resting border, 36 dp rounded-square visual with no border, minimal information glyph and absence of the old circled glyph. Existing tests verify its position beside the balance, opening the correct information modal, Close/Android Back callback/accessibility-escape dismissal, and unchanged balance, cards, Shop previews and navigation.

Focused command:

```powershell
npm.cmd test -- --watch=false src/screens/RewardsScreen.test.tsx src/screens/mobileExperience.test.tsx src/navigation/navigationState.test.ts src/navigation/PrototypeNavigator.test.tsx
```

## Exact changed files

1. `mobile/src/screens/RewardsScreen.tsx`
2. `mobile/src/screens/RewardsScreen.test.tsx`
3. `mobile/TASK_035D_VERIFICATION.md` — new

No dependencies or business logic changed. All unrelated uncommitted work preserved. Nothing staged, committed, pushed or deployed.

## Limitations

Physical Android/iOS visual review, screen-reader focus, font rendering, hit testing and hardware Back remain pending device testing. Automated tests use mocked React Native hosts and invoke the existing modal's native onRequestClose callback; they do not replace device-level layout or OS interaction verification. No native screenshot is claimed.
