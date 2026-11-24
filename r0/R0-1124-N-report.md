APPROVE
fork #247 R0-1124-I §4 필수 수정 2건 해소 · CI 전체 초록 · typing 색 구분 확인

## 판정

| PR | 판정 | 근거 |
|----|------|------|
| fork #247 (M1-1124-B) | APPROVE | §4 필수 수정 2건 해소 + CI 전체 초록 + typing 파랑 구분 |

---

## 1. R0-1124-I §4 필수 수정 해소 현황

| 항목 | 현황 |
|------|------|
| ① m3-1105-bw Stack 가드 | ✅ 해소 |
| ② phone-status 하네스 7건 | ✅ 해소 |

### ①  Stack 가드 (m3-1105-bw.test.ts)

`tests/flows/m3-1105-bw.test.ts` (4) tender-cash 블록 갱신:

- **이전**: `it('Stack import 없음')` → M1-1124-D 의 `Stack.Screen` 선언형 headerRight 충돌 → flow-tests FAIL
- **이후**: `it('Stack.Screen 이 쓰여도 headerLargeTitle 미포함 (M1-1124-D 선언형 headerRight)')` —
  `tenderCashSrc.match(/<Stack\.Screen[\s\S]*?\/>/)` 블록 범위로 한정해 `headerLargeTitle` 없음 검증
- delivery 에 대한 `"Stack import 없음"` 테스트는 그대로 유지 (delivery 는 Stack 미사용 → 올바름)
- **flow-tests**: ✅ SUCCESS

### ② playwright 하네스 7건 (m1-1124-b-phone-status-playwright.mjs)

`gotoCheckout()` 네비게이션 수정:

- **이전**: `pre-seed localStorage + page.goto('/checkout/:id')` → Expo Router Protected 가드가 /sell 폴백 → `cd-phone-status` DOM 없음 → 7건 FAIL
- **이후**: `loginAndReachProducts(실제 로그인+wizard)` 로 세션 깨운 뒤 `history.pushState + popstate` SPA 전환 — m3-1105-d 동일 패턴
- DEFAULTS (`sc_01/sl_01/reg_01`) ID 정합 · DRAFT dummy line item 1건 추가 · receipt fixture 보완
- **playwright**: ✅ SUCCESS (6상태 + success 7건 모두 통과)

---

## 2. typing(입력 중) 색 구분

| 상태 | 클래스 | 색 |
|------|--------|-----|
| waiting | `border-line bg-surface` | 흰색 계열 |
| typing | `border-info bg-info-soft` / `text-info` / `Dots color="info"` | 파랑 #1D4ED8 / #DBEAFE |

- `info` / `info-soft` 토큰을 `tailwind.config.js` + `constants/brand.ts` 에 신설 (Kyu 11-24 11:03 승인 "파랑 계열")
- accent(앰버) 미사용 → m2-1105-n 가드 준수 · 색 하드코딩 없음
- assertions PASS (accent 가드 재실행 통과, info 토큰은 가드 범위 외)

---

## 3. CI 최종 (393a645)

| job | 결과 |
|-----|------|
| lint | ✅ SUCCESS |
| assertions | ✅ SUCCESS |
| flow-tests | ✅ SUCCESS |
| playwright | ✅ SUCCESS |
| route | ✅ SUCCESS |
| heavy-cloud | ⏭ SKIPPED (fork 조건 동일) |

---

## 4. storeport #416 계약 경로 최종 확인

- #416 머지(1fee00f) 완료
- POS: `PATCH /admin/pos/customer-display/snapshots/${snapshotId}` (`api/hooks/pos-loyalty.ts`)
- Server: `apps/commerce-core/src/api/admin/pos/customer-display/snapshots/[id]/route.ts` (admin JWT)
- 필드: `{ pos_order_num: number }` ↔ `PatchBody.pos_order_num?: number` ✅
