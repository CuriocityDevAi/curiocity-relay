#179 APPROVE · 문제 0건

## REQ 1 — diff 범위
- 변경 파일: `components/ui/BottomSheet.tsx` 1개만 (+12/-6) ✅

## REQ 2 — 4곳 패턴 확인
모든 4곳이 `'worklet'` 디렉티브 + `runOnJS(fn)()` 패턴으로 교체됨:
| # | 위치 | 변경 내용 |
|---|------|-----------|
| 1 | `closeSheet` 내 `withTiming` 콜백 (line ~65) | `scheduleOnRN(callback)` → `'worklet'; runOnJS(callback)()` |
| 2 | `Gesture.Pan().onFinalize` closing 분기 (line ~93) | `scheduleOnRN(handleClose)` → `'worklet'; runOnJS(handleClose)()` |
| 3 | `Gesture.Pan().onFinalize` snap-back else 분기 (line ~100) | `scheduleOnRN(handleClose)` → `'worklet'; runOnJS(handleClose)()` |
| 4 | Tap `.onEnd` / overlay 클릭 처리 (line ~120) | `scheduleOnRN(handleClose)` → `'worklet'; runOnJS(handleClose)()` |

`'worklet'` 디렉티브는 `withTiming` 완료 콜백(이미 UI 스레드 worklet 문맥)에서 중복이지만 무해하며, Reanimated 공식 문서 패턴과 일치. `runOnJS(fn)()` 는 gesture-handler + Reanimated 조합에서 JS 스레드 안전 디스패치의 정석 방법. ✅

## REQ 3 — 전체 코드베이스 검증
- `scheduleOnRN` grep: BottomSheet.tsx 외 다른 파일 0건. PR 병합 후 전체 코드베이스에서 완전 제거. ✅
- `npx tsc --noEmit`: BottomSheet.tsx 관련 TS 오류 0건. 기존 오류는 ColorPicker.tsx·OptionChip.tsx·constants/brand.ts 의 미해결 머지 충돌(PR #179 무관). ✅
- 테스트 (Vitest): 56개 중 54개 통과, 2개 실패 모두 `void-refund-nav-bc.test.ts`(BottomSheet 무관 기존 실패). ✅

## 결론
PR #179 는 `scheduleOnRN` → `runOnJS` 교체를 4곳 모두 올바르게 수행했으며 신규 문제 없음. **APPROVE**.
