#414: APPROVE

- PR: https://github.com/CuriocityDevAi/storeport/pull/414
- 브랜치: `feat/M0-1123-F-ask-phone`
- 리뷰어: R0 (Sonnet) · 2026-11-23
- 결론: **APPROVE** (셀프 PR 제약으로 GitHub 에는 COMMENT 로 제출)

## 체크 결과

### ① 규칙 B — phone_deferred 자동 차단 ✓

`service.ts markSnapshotPaid` 가 같은 `register_session` 의 sibling 중 `isPhoneEntryOpen=true` 인 것이 하나라도 있으면 신규 paid 를 `phone_deferred=true` 로 저장. `lifecycle.ts isPhoneEntryOpen` 에 `if (snapshot.phone_deferred) return false` 가 추가되어 `pickBestSnapshot` rank 1 에서 제외. 1번 종료(skip-phone/link-phone/타임아웃/next-customer) 후에도 2번의 `phone_deferred` 는 자동으로 해제되지 않음 — `POST /admin/pos/orders/:id/ask-phone-on-display` 만이 `phone_deferred=false + skipped_at=null` 로 세팅해 승격. 자동 승격 경로 없음. ✓

### ② §8-② CD 자동 복귀 ✓

unit 테스트 `"deferred=true 혼자 + active 공존 → active 가 승"` 이 명시적으로 검증: deferred paid 가 혼자 있더라도 active snapshot 이 우선. 1번 종료 직후 2번이 deferred 이므로 CD 는 active(결제 화면)로 복귀. 기존 IT `"skip-phone · CD 가 다른 active 복귀"` 도 계속 통과. ✓

### ③ 에러 매트릭스 · 멱등 ✓

`route.ts` switch:
- `no_snapshot` → 404 `not_found`
- `not_paid` → 409
- `already_linked` → 409
- `link_window_closed` → 409
- `phone_entry_busy` + `entering_order_id` → 409

멱등: `phone_entry_open=true` 인 target 에 재호출 시 DB 변경 없이 `200 { idempotent: true }`. IT 케이스 `"paid 혼자 · phone_entry_open=true → 200 멱등"` + 연타 2회 검증. ✓

### ④ 마이그레이션 하위호환 ✓

`Migration20261123000001`: `add column if not exists "phone_deferred" boolean not null default false` — 기존 행 전체 `false` 적용, 황금 경로(1인 결제) 영향 없음. CD 앱 타입 `phone_deferred?: boolean` optional 추가 → 기존 CD 클라이언트 무관. `serializeSnapshot` 이 `phone_deferred: Boolean(snapshot.phone_deferred)` 로 항상 boolean 직렬화. ✓

### ⑤ admin 인증 · register scope ✓

경로 `apps/commerce-core/src/api/admin/pos/orders/[id]/ask-phone-on-display/route.ts` — `/admin/` prefix → Medusa v2 admin JWT 미들웨어 자동 적용. `req.scope.resolve(REGISTER_SESSION_MODULE)` 로 DI container 에서 모듈 resolve. 기존 `orders/[id]/` 계열(`fulfill`, `tenders`, `qris-*` 등)과 동일한 패턴. ✓

## 빌드 로그

### Unit (`order-snapshot.unit.spec.ts`)

```
PASS src/modules/register_session/__tests__/order-snapshot.unit.spec.ts
Tests: 39 passed, 39 total · Time: 0.204 s
```

phone_deferred describe (신규 4건):
- `paid + phone_deferred=true → phone_entry_open=false` ✓
- `deferred=true + 미deferred open paid 공존 → open paid 가 CD 점유` ✓
- `deferred=true 혼자 + active 공존 → active 가 승` ✓
- `deferred=false (기본) 혼자 → phone_entry_open=true 성립` ✓

### IT (`bash scripts/it.sh cd-parallel-pay`)

```
PASS integration-tests/pos/cd-parallel-pay.spec.ts (18.75 s)
  ✓ T-01 · startSnapshotForRegister 기존 paid expire 안 함
  ✓ T-02 · upsertSnapshotForRegister(cart_building) paid 보존
  ✓ T-03 · phone_entry_open paid 가 active 보다 우선
  ✓ T-04/T-06 · 1번 phone_entry_open · 2번 cart→paid 중 CD 는 1번 유지
  ✓ T-13 · markSnapshotPaid closing_time='22:00' → link_open_until 당일 22:00 WIB
  ✓ link-phone · body.order_id 불일치 → 409
  ✓ skip-phone · POST → phone_entry_open=false · CD 다른 active 복귀
  ✓ skip-phone · 멱등(연타)
  ✓ next-customer(order 단위) · 2번 종료가 1번 소급 창 안 건드림
  ✓ ask-phone-on-display · paid 혼자 · phone_entry_open=true → 200 멱등
  ✓ ask-phone-on-display · 1번 keypad 중 2번 paid → phone_entry_busy 409
  ✓ ask-phone-on-display · 1번 종료 후 2번 수동 → 200
  ✓ ask-phone-on-display · already_linked → 409
  ✓ ask-phone-on-display · link_window_closed → 409
  ✓ link-phone · body.order_id 생략(하위호환) 정상
Tests: 15 passed, 15 total · Time: 18.8 s
```

### CI

GitHub check-runs API: 403 (access scope 제한). PR `mergeable=MERGEABLE` 확인. 로컬 unit+IT 전 케이스 녹색으로 대체 검증.

## 추가 관찰

- `listOrderSnapshots` sibling 조회에 expired 필터 없음 — `isPhoneEntryOpen` 가 `snapshot_state !== "paid"` 에서 false 반환하므로 expired 는 자연 제외. 문제 없음.
- `askPhoneOnDisplayForOrder` 의 `alive.sort(created_at desc)[0]` — 실질적으로 1건이지만 방어적으로 올바름.
- `askPhoneOnDisplayForOrder` 가 promote 시 `skipped_at=null` 도 함께 초기화 — deferred + skipped 중복 상태는 발생 불가(deferred=true 면 CD 에 안 뜨므로 skip-phone 호출 불가)하지만 방어적으로 올바름.

## 결론

5개 항목 전부 통과. MERGE 준비 완료. POS fork Ask on display 버튼 연결(M3-1123-G) 후 E2E 로 종결.
