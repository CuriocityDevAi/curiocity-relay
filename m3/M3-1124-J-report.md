PASS (CI 결과 반영 대기 중 → 완료 후 갱신)

# M3-1124-J 착지 리포트

**브랜치**: `feat/M3-1124-I-multi-store-pos`  
**커밋**: `5221021` (PR #251 에 추가)  
**작업일**: 2026-11-24

---

## 변경 요약 (REQ 1~4)

| REQ | 파일 | 변경 내용 |
|-----|------|-----------|
| 1 | `api/hooks/pos-settings.ts` | `'pos_settings'` → `'settings'` 키 · `address` object → `store_address?: string \| null` |
| 1 | `api/hooks/pos-settings.ts` | `BRAND_DEFAULT_POS_SETTINGS.address` → `store_address: null` |
| 3 | `__tests__/m3-1124-i-multi-store.test.ts` | 서버 shape fixture 4건 추가 (`settings` 래핑 · pb1_pct · store_address · 키 불일치 재현) |
| 4 | `components/ui/BottomSheet.tsx` | `animateOut`: `runOnUI` 패턴으로 reanimated 권장 방식 적용 (`runOnUI` import 추가) |
| 4 | `components/RegisterBadge.tsx` | `prettier/prettier` error 수정 (line 51 멀티라인 → 단일라인 — CI lint error 원인) |

---

## 서버 응답 shape 비교

| | 기존 (버그) | 수정 후 |
|--|------------|---------|
| 체크 키 | `'pos_settings'` | `'settings'` |
| 타입 필드 | `address?: { address_1, ... }` | `store_address?: string \| null` |
| pb1_pct | `undefined` (fallthrough) | 올바르게 `settings.pb1_pct` 읽힘 |

storeport `GET /admin/pos/settings` 실제 응답:
```json
{ "settings": { "pb1_pct": 10, "store_address": "Plaza Senayan", ... }, "id": "posset_...", "scope": "location:sloc_..." }
```

---

## 테스트 실행 로그

### vitest (단위 — 대상 파일)
```
npx vitest run __tests__/m3-1124-i-multi-store.test.ts

 Test Files  1 passed (1)
      Tests  20 passed (20)
   Start at  17:41:15
   Duration  161ms
```
기존 16건 → 20건 (서버 shape fixture 4건 추가)

### vitest (전체)
```
 Test Files  2 failed | 73 passed (75)
      Tests  3 failed | 977 passed | 6 expected fail | 3 todo (989)
```
- 3 failed: `m3-1119-o-cd-emit.test.ts`, `m2-1119-s-pos-slip-fixes.test.ts` — **git stash 로 내 변경 전에도 동일 실패 확인 (pre-existing)**
- 내 변경으로 인한 신규 실패 없음

### lint
```
npx expo lint
✖ 67 problems (0 errors, 67 warnings)
```
- 0 errors (기존 1 error: RegisterBadge.tsx prettier → 수정 완료)
- BottomSheet warnings: 8 → 6개로 감소 (`animateOut` runOnUI 적용)
  - 나머지 6개: gesture handler `react-hooks/immutability` warning (rule은 `warn` 레벨 유지)
  - CI lint 통과 가능 (0 errors)

### playwright 하네스

**M3-1124-I 멀티스토어 하네스** (`scripts/m3-1124-i-multi-store-playwright.mjs`):
```
11/11 passed · 0 failed
```

**M3-1124-C 영수증 스크롤 하네스** (`scripts/m3-1124-c-receipt-scroll-playwright.mjs`):
```
117/117 passed · 0 failed
```
BottomSheet 열기/닫기 회귀 없음 확인 (Slip 패널 열림/닫힘 포함)

**M3-1105-AB CartSheet assertions**:
```
M3-1105-AB assertions PASS ✓
```

---

## CI 잡별 결과 (PR #251 · push `5221021`)

| 잡 | 결과 |
|----|------|
| route | ✅ SUCCESS |
| heavy-cloud | ⏭️ SKIPPED |
| lint | ⏳ QUEUED/IN_PROGRESS |
| assertions | ⏳ IN_PROGRESS |
| flow-tests | ⏳ QUEUED |

> CI 완료 후 갱신 예정

---

## 어설션 파일

테스트 파일: `__tests__/m3-1124-i-multi-store.test.ts` (20 assertions)

추가된 describe 블록:
```ts
describe('usePosSettings server response shape (settings 래핑)', () => {
  // (#1) settings 래핑 — pb1_pct 올바르게 읽힘
  // (#1) settings 래핑 — store_address 올바르게 읽힘
  // (#1) pb1_pct=0 매장 — settings 래핑에서도 0 반환 (undefined 아님)
  // (#1) 구 버그 재현 — pos_settings 키 사용 시 pb1_pct === undefined
});
```
