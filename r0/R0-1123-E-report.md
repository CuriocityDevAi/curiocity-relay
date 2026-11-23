#413: APPROVE

## 판정: APPROVE

R0-1123-C CHANGES 2건(skip-phone · nextCustomerForOrder) + cdwResolveFile .html 폴백 전부 올바르게 구현됨. 로컬 재실행 테스트 전항목 통과. 머지 가능.

---

## 검증 항목

### CHANGES 1 — skip-phone ✅

| 파일 | 확인 |
|------|------|
| `lifecycle.ts:isPhoneEntryOpen` | `if (snapshot.skipped_at) return false` 추가 → No thanks/타임아웃 후 `phone_entry_open=false` 전환 ✅ |
| `LifecycleCandidate` 인터페이스 | `skipped_at?: Date \| string \| null` 추가 ✅ |
| `skip-phone/route.ts` (신규) | 디바이스 토큰 인증 + register scope 403 · `svc.skipSnapshot` 호출 · `skipped_at` 만 기록 · `link_open_until(EOB)` 불변 ✅ |
| `service.ts::skipSnapshot` | paid/active 모두 `skipped_at` 만 기록 · `pre_entry\|\|customer_phone` 세팅 시 무시 ✅ |
| `snapshot-api.ts::skipPhoneOnServer` | POST `/skip-phone` 호출 · `_sent` 멱등 세트 `skipSnapshotOnServer` 와 공유 ✅ |
| `index.tsx::handleSkip` | `dispatch` 먼저 + `skipPhoneOnServer` fire-and-forget ✅ |
| `index.tsx::handleTimeout` | 동일 — 이전 로컬 전이만 하던 버그 해결 ✅ |

§8-② 성립: skip 후 `pickBestSnapshot` rank1 에서 내려와 다른 active → CD 자동 복귀 ✅  
IT `skip-phone 정상 흐름 · 멱등 · CD 복귀` 10/10 ✅

### CHANGES 2 — nextCustomerForOrder ✅

| 파일 | 확인 |
|------|------|
| `service.ts::nextCustomerForOrder` | `listOrderSnapshots({ order_id })` — 해당 주문 snapshot 만 expire · 다른 주문 `link_open_until(EOB)` 불변 · idle 미생성 ✅ |
| `orders/[id]/next-customer/route.ts` (신규) | `POST /admin/pos/orders/:id/next-customer` · `{ ok, expired_ids }` 응답 ✅ |
| `nextCustomerForRegister` | 하위호환 유지 · 멀티 카트 간섭 경고 주석 추가 ✅ |

IT `next-customer(order 단위) · 2번 종료가 1번 paid 소급 창을 건드리지 않는다` ✅

### cdwResolveFile .html 폴백 ✅

`middlewares.ts::cdwResolveFile` — SPA fallback(`index.html`) 로 돌기 전 `requested + ".html"` 변형을 먼저 시도. `/customer-display-web/mirror` → `mirror.html` ✅. POS fork `/mirror.html` 명시와 멱등 ✅

---

## B 규칙 §7·§8 대조

| 규칙 | R1 서버 구현 |
|------|-------------|
| §7 번호 입력 중 CD 점유 | `pickBestSnapshot` rank1 = `phone_entry_open` ✅ |
| §7 1번 중 2번 결제 CD 미노출 | `upsertSnapshotForRegister` paid 가드 ✅ |
| §7 1번 종료 후 2번 번호입력 수동 | skip-phone 종료 후 CD 복귀 · 2번 keypad 수동은 POS R2 앱 소관 |
| §8-② 1번 종료 시 2번 결제화면 CD 자동 복귀 | skip-phone + `pickBestSnapshot` ✅ |
| §8-① QRIS CD 차단 무관 | POS R2 앱 소관 |
| §8-③ 번호없음 칩 · 2분 뒤 Orders | 서버 소급 창 보존 ✅ · UI POS R2 소관 |
| §8-④ 종이영수증 포인트 미표시 | 이 PR 범위 외 |

R1 서버 소관 항목 전부 구현 ✅

---

## 하위호환 확인

**현 POS 앱**: `order_id` 미제공 경로 보존 · `nextCustomerForRegister` + `/registers/:id/next-customer` 유지 ✅  
**현 CD 앱**: 기존 API 무변경 · `skipPhoneOnServer` 신규 추가만(기존 CD 미호출 무해) ✅

---

## 테스트 로컬 재실행 결과

| 수트 | 결과 |
|------|------|
| `pnpm test` (commerce-core unit) | **554 passed / 47 suites** |
| `pnpm test` (customer-display vitest) | **231 passed / 12 files** |
| `it.sh cd-parallel-pay` | **10 passed** |
| `it.sh cd-full-flow` | **8 passed** |
| `it.sh cd-pos-screen-sync` | **5 passed** |
| CI check runs | 403 접근 불가 (pre-existing · R0 동일) |

---

## 후속 사항

- **POS fork R2 라운드**: success page Next customer 를 `/admin/pos/orders/:id/next-customer` 로 전환 필요.
- **Kyu 실기**: 머지 · 운영 재배포 후 ① No thanks/타임아웃 → CD 메인 복귀 ② 2번 Next customer → 1번 LateLink 소급 창 보존 확인.

---

_생성 시각: 2026-11-23 · 모델: Sonnet · 상한 40분 안._
