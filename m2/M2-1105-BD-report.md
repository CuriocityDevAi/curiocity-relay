# M2-1105-BD 착지 리포트

## 실패 2건 원인표

| # | 테스트 이름 | 실패 메시지 | 겹친 PR | 처리 |
|---|---|---|---|---|
| 1 | `R1: 선주문 잔금 완납 + 같은 교대 → action=void (sameShift)` | `expected undefined to be 'void'` (`__tests__/void-refund-nav-bc.test.ts:94`) | #114 (`feat: Void and Refund always for paid orders`) | 테스트 수정: `result.action` → `result.sameShift` |
| 2 | `R1: 선주문 잔금 완납 + 다른 교대 → action=refund (differentShift)` | `expected undefined to be 'refund'` (`__tests__/void-refund-nav-bc.test.ts:106`) | #114 | 테스트 수정: 동상 |

**원인 상세**: PR #114 (`c3b8b7c feat(pos): Void and Refund always for paid orders`) 에서  
`VoidRefundExposure { kind:'show' }` 타입이 `action:'void'|'refund'` → `sameShift:boolean` 으로 교체됨.  
(코드 주석 `lib/refund-rules.ts:206`: "M3-1105-BH: sameShift 노출 — 버튼은 항상 Void + Refund 둘 다")  
#120 테스트는 구버전 `action` 필드를 가정해 작성됐음. #118/#119 는 `refund-rules.ts` 미수정.

## PR · CI

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/122
- 브랜치: `test/m2-1105-bd-void-refund-nav-bc` (base: master)
- CI run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/43324075410

## 확인 항목 (자기 검증 로그)

### (a) `npx vitest run __tests__/void-refund-nav-bc.test.ts`
```
Test Files  1 passed (1)
     Tests  14 passed | 2 todo (16)
  Start at  05:53:03
  Duration  167ms
```
→ **0 failed** ✓

### (b) 전체 `npx vitest run`
```
Test Files  16 passed (16)
     Tests  174 passed | 6 expected fail | 2 todo (182)
  Start at  05:53:06
  Duration  468ms
```
→ **0 failed** ✓

### (c) lint errors
```
npx eslint __tests__/void-refund-nav-bc.test.ts   ← 출력 없음(0 errors)
```
→ **0 errors** ✓

### (d) CI run 결과 (PR #122)
- assertions: pass
- flow-tests: pass
- lint: pass
- playwright: pass (15m33s)

## 발견 제품 버그

없음.
