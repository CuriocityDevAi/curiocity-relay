# M0-1127-E — 짧은 주문번호 #N 레지스터 열 때마다 #1 리셋

**PASS** · PR #473 · head `6f1d76d` · CI: changes-filter/route/markers-and-forbidden/check 녹색 (heavy-mac 통합 러닝 중).

## 리포

- 리포: storeport
- 브랜치: `feat/M0-1127-E-short-number-register-reset`
- PR: https://github.com/CuriocityDevAi/storeport/pull/473
- 상한 45분 · 커밋 1건 · docs/feature-map.yaml 1 라인 추가.

## 선택지 · 채택 · 이유 (PR 본문 3줄)

- **A 채택**: `pos_short_number(stock_location_id PK)` 에 `register_session_id` 컬럼 추가 · UPSERT `CASE WHEN row.session = input.session THEN (last_value%99)+1 ELSE 1 END`.
- **B 비채택**: PK 를 `register_session_id` 로 교체. 단순하지만 명시적 "리셋 줄" 이 없어 자가 검증 토글이 어렵다.
- **같은 매장 다중 POS 중복 번호?** 매장당 1 open 세션만 허용 (`POST /admin/register-sessions` 409 by `findOpenSession`) → 같은 매장 POS 다중 기기는 같은 세션 id 공유 → 같은 counter row → row lock 직렬화 → 중복 0.

## 구현 위치 (명세 §2.3 PR 본문 반영)

- `apps/commerce-core/src/modules/register_session/service.ts:168-213` — `allocatePosShortNumber(stock_location_id, register_session_id, pgConnection)` + CASE 기반 리셋 줄.
- `apps/commerce-core/src/modules/register_session/models/pos-short-number.ts:19-27` — `register_session_id` nullable 컬럼.
- `apps/commerce-core/src/modules/register_session/migrations/Migration20261127000001.ts` — `ALTER TABLE … ADD COLUMN register_session_id text null`.
- 호출자: `startSnapshotForRegister` (service.ts:255-264) · `upsertSnapshotForRegister` 병렬 멀티 카트 분기 (service.ts:407-417).

## 테스트 로그 (integration-tests/pos/short-order-num.spec.ts)

```
PASS integration-tests/pos/short-order-num.spec.ts (12.084 s)
  M0-1126-Q / M0-1127-E · 짧은 주문번호 (#N · 1..99 · 세션 범위)
    ✓ ① 순환: 한 세션 안 1→2→…→99→1 (날짜 무관) (646 ms)
    ✓ ② 매장 격리: 매장 A 와 매장 B 는 독립 카운터 (555 ms)
    ✓ ③ 동시 할당: 같은 세션 병렬 10건이 서로 다른 번호 (343 ms)
    ✓ ④ 긴 번호 불변: order.display_id 는 짧은 번호 발급과 무관 (378 ms)
    ✓ ⑤ POS PATCH 는 서버 발급 후 무시 (silent no-op) (363 ms)
    ✓ ⑥ M0-1127-E · 열기 → 주문 3건 = 1,2,3 (세션 범위) (341 ms)
    ✓ ⑦ M0-1127-E · 닫고 다시 열기 → 다음 발급 = 1 (리셋) (353 ms)
    ✓ ⑧ M0-1127-E · 기존 active snapshot 갱신 시 번호 유지 (재발급 X) (360 ms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

단위 테스트 전체: 877/877 PASS. `pnpm typecheck` (apps/commerce-core): PASS.

## 검증의 검증 (리셋 줄 임시 제거 → ⑦ 빨개짐)

service.ts 의 리셋 줄
```
set "last_value" = case
      when "pos_short_number"."register_session_id" = excluded."register_session_id"
        then ("pos_short_number"."last_value" % 99) + 1
      else 1
    end,
```
를 다음으로 바꿔 세션 리셋을 무력화:
```
set "last_value" = ("pos_short_number"."last_value" % 99) + 1,
```

그 결과 (⑦ 재실행 로그):
```
FAIL integration-tests/pos/short-order-num.spec.ts (8.169 s)
  ✕ ⑦ M0-1127-E · 닫고 다시 열기 → 다음 발급 = 1 (리셋) (355 ms)

  expect(received).toBe(expected)
  Expected: 1
  Received: 3

  337 |             pg,
  338 |           ),
  > 339 |         ).toBe(1);
```
리셋 줄 원복 → 8/8 재녹색 확인.

## PR 본문 "Kyu 확인 항목" (실기 쉬운 말)

1. POS 에서 레지스터 열고 결제 **2건** → 손님 화면/POS 칩에 **#1 · #2** 가 떠야 함.
2. 레지스터 **닫기** → 다시 **열기**.
3. 그 뒤 첫 결제 → 칩에 **#1** (이전 매장 번호 이어감 X).
4. 같은 세션 안에서는 **99 다음 1** 로 순환 (하루 100건 넘겨도 끊김 없음).

## CI 요약 (실제 돌아 성공한 것만 초록)

- ✅ changes-filter 17s
- ✅ route 17s
- ✅ check 24s
- ✅ markers-and-forbidden 21s
- 🟡 heavy-mac (통합 러닝 중 · 리포트 작성 시점 pending)
- ⏭️  heavy-cloud (skipping · M2-1126-R/S 이후 iMac 전용)

## 보존 요소 (task spec 검증)

- 긴 번호 `{NICK}-{YY}{M}{SERIAL}` 불변 · 이미 저장된 `pos_order_num` 재계산 없음 · 동시 2건 서로 다른 번호 (원자성) · 99 다음 1 · 기존 주문 백필 없음 (운영 행 보존 ALTER).
- customer-display 앱 · POS fork · 긴 번호 코드 전부 무수정.
