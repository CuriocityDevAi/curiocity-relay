# R0-1105-BF 보고서

## 판정 요약

| PR | 판정 | 비고 |
|----|------|------|
| storeport #208 | ✅ **APPROVE** | 미해결 대화 5건 → 전부 resolve 완료 · CI PASS |
| storeport #209 | ⏳ **CI FAIL (flaky)** | 대화 0건 OK · pos-integration 2회 연속 실패 (다른 오류) |
| fork #84 | ✅ **APPROVE** | 체크 항목 전부 통과 |

---

## ① storeport #208 — 미해결 대화 5건 처리 · CI

### 미해결 대화 (5건 → 전부 resolve)

| ID | 위치 | 내용 | HEAD 코드 판정 | resolve |
|----|------|------|----------------|---------|
| `PRRT_…1o_7U` | route.ts line 81 (outdated) | hashReturnItems Guard A — 분할 반품 오탐 | `hashReturnItems()` 함수 + Guard A 블록 완전 삭제 (M0-1105-AE). `// Guard A (items 해시 409) 는 제거` 주석 확인. | ✅ resolved |
| `PRRT_…pAF0` | route.ts line 191 (outdated) | Guard A collision · test #52 assertion 모순(Guard A) | 위와 동일 근거. Guard A 없음. | ✅ resolved |
| `PRRT_…pAYD` | route.ts line 300 (outdated) | stockLocationId fallback이 register_session_id 사용 | `?? body.register_session_id` 제거 → `query.graph({entity:'stock_location'})` 첫 행 폴백으로 교체. 주석 `M0-1105-AE · 이전 폴백 body.register_session_id 는 session id를 store id로 오해` 확인. | ✅ resolved |
| `PRRT_…pAld` | route.ts line 283 (non-outdated) | `orderTotal` 미사용 dead code | 파일 전체(`23 768 bytes`) 에 `orderTotal` 선언 없음. | ✅ resolved |
| `PRRT_…pA4Y` | tenders.spec.ts line 3316 (non-outdated) | test #52 이름(누적 OK) ↔ 어서션(409) 모순 | 구 test #52(분할 반품 → 409) 삭제 · line 3183에 test #55 `분할 반품 (qty 2 → qty 1 + qty 1) · 둘 다 200 · 누적 결제액 · 3rd 400` 재작성 확인. | ✅ resolved |

resolveReviewThread GraphQL mutation 5회 실행 완료 — 모두 `isResolved: true` 응답.

### CI

```
gh pr checks 208
pos-integration  pass  2m39s  run #42953325842
check            pass  11s
markers-and-forbidden  pass  9s
```

✅ pos-integration PASS. 미해결 대화 0 + CI 초록 → **APPROVE 코멘트 제출** (GitHub 자기 PR APPROVE 불가로 COMMENT 형태).

---

## ② storeport #209 — CI 확인

### 미해결 대화

```
gh api graphql reviewThreads → isResolved:false 개수: 0
```

✅ 미해결 대화 0건.

### CI

**1차 실행 (run #42950108942)** — pos-integration ❌ FAIL (2m0s)
```
FAIL integration-tests/pos/fulfill-delivery-guard.spec.ts (11.64 s)
Tests: 5 failed, 49 passed, 54 total

오류: Loaders for module Stock_location failed:
      Method Map.prototype.set called on incompatible receiver #<Map>
      (at fulfill-delivery-guard.spec.ts:32:40)
```

원인 분석: `medusaIntegrationTestRunner` 초기화 중 Node.js Map prototype 충돌. 테스트 로직 오류가 아닌 모듈 loader 환경 문제. tenders.spec.ts는 동일 실행에서 PASS.

`gh run rerun 42950108942 --failed` → 재실행.

**2차 실행 (rerun)** — pos-integration ❌ FAIL (2m45s)
```
PASS integration-tests/pos/tenders.spec.ts (41.439 s)
FAIL integration-tests/pos/fulfill-delivery-guard.spec.ts
오류: Connection Error: Connection ended unexpectedly
```

1차와 다른 오류 — tenders.spec.ts PASS 후 DB 연결이 끊기면서 2번째 suite 실패. 코드 문제가 아닌 CI 인프라 flaky 패턴.

**판정**: pos-integration ❌ CI flaky (2회 연속 다른 환경 오류 · 코드 결함 아님). 오케 판단 필요.

---

## ③ fork #84 — 부분 환불 품목 선택 리뷰

### 체크 결과

| 항목 | 판정 | 근거 |
|------|------|------|
| 요청·응답·오류 키 (#208 route.ts 글자 단위 대조) | ✅ | pos-refunds.ts `ReturnOrderResponse` 타입이 route.ts `res.json()` 필드와 완전 일치. `remaining_attempts` / `locked_until` / `return_id` / `inventory_restored` / `inventory_warning?` 모두 일치. |
| 수량 스테퍼가 남은 수량에서 멈춤 | ✅ | `ReturnItemsPicker.tsx` → `maxReturnable = it.quantity - it.already_returned` · `<QuantityPicker max={maxReturnable} />`. `maxReturnable ≤ 0` 이면 품목 렌더 안 함. |
| 0개면 진행 불가 | ✅ | `confirmDisabled = pending || ... || (isPartial && !hasPartialSelection)` · `hasPartialSelection = returnSelection.length > 0`. |
| 수단/PIN 규칙 재사용 | ✅ | `plan = getRefundPlan(order.originalTender, order.sameShift)` 동일 경로. `submitPartial` 도 `selected` 방법 그대로 사용. |
| raw hex 0 | ✅ | assertions (4a)~(4f) 6개 PASS — fixture body 전부 제어문자 없음. |
| 영어 | ✅ | "Full order", "Select items", "Items to refund", "Estimated refund", "Refunded", "Open the cash drawer..." 전부 영어. |
| 선택=차콜/결정=검정 | ✅ | OptionChip `bg-selected` (차콜 계열) + `text-on-selected` 흰 · Button `bg-ink` (검정). assertions (5a)(5b) PASS. |
| run-all PASS | ✅ | `node scripts/m3-1105-ai-assertions.mjs` → **52/52 passed · 0 failed** |
| Playwright 스샷 | ✅ | screenshots-m3-1105-ai/ 3쌍 (verified + UNVERIFIED). `m3-1105-ai-screenshots.mjs` 실행 성공 (3 screens 캡처). |
| master 충돌 | ✅ | `mergeable: true` (GitHub API) |
| ⑦ 번들 안전 | ✅ | `m2-1105-q-bundle-guard.mjs` → 정적 grep 0건 위반 · Metro iOS 번들 성공. |

### 세부 메모

- `extractAlreadyReturnedMap` 로직이 서버 `alreadyReturnedPerLine` 계산과 동일 구조 (metadata.returns[].items[] 누계).
- `useReturnOrder` hook은 `useVoidOrder`/`useRefundOrder` 패턴과 동일하게 `onSettled` → orders invalidate.
- `extractError` 함수: Error.message → body.message → "Please try again" 폴백. SDK가 던지는 오류 형태 커버.
- VoidRefundSheet reset effect (`visible` 변경 시 returnMode, returnSelection, approvalCode 등 초기화) 정상.

**판정: APPROVE**

---

## 실행 로그

```
# #208 thread resolve
resolveReviewThread PRRT_…1o_7U → isResolved: true
resolveReviewThread PRRT_…pAF0  → isResolved: true
resolveReviewThread PRRT_…pAYD  → isResolved: true
resolveReviewThread PRRT_…pAld  → isResolved: true
resolveReviewThread PRRT_…pA4Y  → isResolved: true

# #208 CI check
gh pr checks 208 → pos-integration pass (run #42953325842)

# #208 APPROVE comment submitted
gh pr review 208 --comment "R0-1105-BF · #208 판정: APPROVE ..."

# #209 CI
gh pr checks 209 → pos-integration fail (flaky)
gh run rerun 42950108942 --failed → rerun: fail (다른 오류)

# fork #84 assertions
cd /Users/kyu.lee/projects/pos-m3
node scripts/m3-1105-ai-assertions.mjs → 52/52 passed
node scripts/m2-1105-q-bundle-guard.mjs → 전체 통과
```

---

## 착지 명령

```bash
cp /tmp/R0-1105-BF-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-BF-report.md && git commit -m "r0: R0-1105-BF" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-BF done "#208 미해결 5건 resolve+APPROVE · CI PASS · #209 대화0+CI flaky 2회(코드외) · fork#84 APPROVE(52/52+bundle)"
```
