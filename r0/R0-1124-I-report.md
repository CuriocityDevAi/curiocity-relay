R0-1124-I-report
fork #247 CHANGES · storeport #416 APPROVE

## 판정

| PR | 판정 | 주요 이유 |
|----|------|-----------|
| fork #247 (M1-1124-B) | CHANGES | flow-tests FAIL(Stack 가드) + playwright FAIL(6상태 미표시 7건) |
| storeport #416 (M2-1124-B) | APPROVE | CI 전체 초록 · MERGEABLE · 계약 일치 |

---

## 1. fork #247 — R0-1124-B 지적 해소 현황

| 지적 항목 | 현황 |
|-----------|------|
| `border-accent` assertions FAIL | ✅ 해소 — `border-line bg-surface-muted` 로 교체 (assertions PASS) |
| Stack 가드 flow-tests FAIL | ❌ 미해소 — M1-1124-D 가 Stack 재추가, `m3-1105-bw.test.ts "Stack import 없음"` 여전히 FAIL |
| pos_order_num PATCH 누락 | ✅ 해소 — `api/hooks/pos-loyalty.ts` 에 PATCH 추가 (M1-1124-C) |
| playwright SKIPPING | ⚠️ 하네스 추가됐으나 7건 FAIL (아래 상세) |

### 1-1. CI 결과 (#247)

| job | 결과 |
|-----|------|
| lint | ✅ PASS |
| assertions | ✅ PASS |
| flow-tests | ❌ FAIL — `m3-1105-bw.test.ts`: `Stack import 없음` (tender-cash:34 `import { …, Stack, … } from 'expo-router'`) |
| playwright | ❌ FAIL — `m1-1124-b-phone-status-playwright.mjs`: 7건 fail (상세 아래) |
| route | ✅ PASS |
| heavy-cloud | ⏭ SKIPPED |

### 1-2. playwright 실패 상세

```
--- Playwright: 6 phone status 상태 ---
  ✗ ask: cd-phone-status 보임
  ✗ waiting: cd-phone-status 보임
  ✗ typing: cd-phone-status 보임
  ✗ done: cd-phone-status 보임
  ✗ skipped: cd-phone-status 보임
  ✗ busy: cd-phone-status 보임
  ✗ success: cd-phone-status 보임
총계: 5 passed · 7 failed
```

원인 추정: `gotoCheckout()` 가 `history.pushState + popstate` 로 `/checkout/{id}` 로 이동하는데,
Expo Router 가 이 이벤트로 컴포넌트를 렌더링하지 않아 `testID="cd-phone-status"` 가 DOM에 존재하지 않음.
D5(cart_review emit 0) · success(ask-phone-on-display 없음) 등 소스 어설션 5건은 PASS.

**나머지 27개 기존 harness 모두 PASS** — 결제 화면 회귀 없음.

### 1-3. typing 색

| 상태 | 클래스 | 색 |
|------|--------|-----|
| waiting | `border-line bg-surface` | white |
| typing | `border-line bg-surface-muted` | #F2F2F0 (매우 연한 회색) |

`border-accent` 위반은 해소됐으나 waiting↔typing 색 차이는 미미함.
Dots 애니메이션(∙∙∙)이 1차 구분 단서 역할. 색만으로는 대기 상태와 구분하기 어려움.

---

## 2. storeport #416 — R0-1124-B 지적 해소 현황

| 지적 항목 | 현황 |
|-----------|------|
| CI 미실행 | ✅ 해소 — heavy-cloud SUCCESS (pos-integration · customer-display·unit · e2e 모두) |
| `mergeable_state: dirty` | ✅ 해소 — MERGEABLE |
| pos_order_num 서버 자동 채움 | ✅ 방향 변경: 서버 자동 채움 대신 POS가 PATCH → cbf0fb7 경로 신설 |
| keypad Next customer 회귀 | ✅ 해소 — 40b1cc0 `snapshot.id === prevSnapshot?.id` 조건 추가 |

### 2-1. CI 결과 (#416)

| sub-job (heavy-cloud 내) | 결과 |
|--------------------------|------|
| build-commerce-core | ✅ success |
| unit-commerce-core | ✅ success |
| **pos-integration** | ✅ success |
| customer-display·typecheck | ✅ success |
| **customer-display·unit** | ✅ success |
| customer-display·build | ✅ success |
| customer-display·e2e | ✅ success |

### 2-2. admin PATCH 경로 (cbf0fb7)

```
경로: PATCH /admin/pos/customer-display/snapshots/:id
파일: apps/commerce-core/src/api/admin/pos/customer-display/snapshots/[id]/route.ts
인증: admin JWT (Medusa MedusaRequest)
```

POS #247 호출(`PATCH /admin/pos/customer-display/snapshots/${snapshotId}`)과 완전 일치 ✅

### 2-3. keypad 잠금 해제 조건 (40b1cc0)

```ts
// 변경 전
if (currentScreen === "keypad") {
  return stay("keypad");
}

// 변경 후
if (currentScreen === "keypad" && snapshot.id === prevSnapshot?.id) {
  return stay("keypad");
}
```

동일 snapshot ID 일 때만 keypad 잠금 유지 → Next customer(새 snapshot) 도착 시 잠금 해제. M0-1120-A 회귀 수정 ✅

---

## 3. 계약 최종 대조표

| 항목 | POS (#247) | Server (#416) | 판정 |
|------|-----------|---------------|------|
| pos_order_num 쓰기 경로 | PATCH `/admin/pos/customer-display/snapshots/${snapshotId}` | `/admin/pos/customer-display/snapshots/[id]/route.ts` | ✅ |
| 인증 | admin JWT (sdk.client.fetch) | admin JWT (Medusa middleware) | ✅ |
| 필드 | `{ pos_order_num: number }` | `PatchBody.pos_order_num?: number` | ✅ |
| phone_entry_state 쓰기 | X-Device-Token → customer-display PATCH | 기존 경로 그대로 | ✅ |
| phone_entry_state 읽기 | classifyPhoneStatus → 6상태 | waiting\|typing\|done\|skipped DTO | ✅ |

---

## 4. 필수 수정 (#247)

1. `tests/flows/m3-1105-bw.test.ts` — `"Stack import 없음"` 케이스를
   `"Stack.Screen 선언형일 때 Stack import 허용"` 조건으로 갱신
   (M1-1124-D 에서 tender-cash 가 Stack.Screen declarative headerRight 를 사용하므로)
2. `scripts/m1-1124-b-phone-status-playwright.mjs` — `gotoCheckout()` 네비게이션 방식 수정:
   `history.pushState + popstate` → `page.goto(url('/checkout/${draftId}'))` 등 Expo Router
   가 렌더링을 트리거하는 방식으로 교체 (6상태 · success 테스트 7건 FAIL 해소 필요)
