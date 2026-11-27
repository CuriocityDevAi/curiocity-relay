storeport#473: APPROVE · 필수 0건 · 권고 1건 | CI: heavy-mac ✅ PASS 14m56s, all checks green (gh pr checks 473 직접 확인)
POS fork 수정 필요: 아니오 — 영수증은 서버 snapshot `pos_order_num`(`receipt-escpos.ts:194`) 사용, POS 칩은 `resetSessionOrderCounter()`(`register-session.ts:110`) 로 레지스터 오픈 시 0 리셋 → 단일 POS 정상 경로에서 세 표시 위치 모두 동기화

---

## 직접 실행한 명령과 결과

### 1. CI 확인
```
$ cd ~/projects/storeport && gh pr checks 473
heavy-mac        pass  14m56s  https://github.com/CuriocityDevAi/storeport/actions/runs/45947917266/job/140337344057
heavy-cloud      skipping  0
changes-filter   pass  17s
check            pass  24s
markers-and-forbidden  pass  21s
route            pass  17s
```
→ merge-gate.mjs 스크립트 미존재(relay scripts/oke/ 없음) · gh pr checks 로 대체 확인.

### 2. 통합 테스트 직접 실행 (PR head 6f1d76d 체크아웃)
```
$ cd ~/projects/storeport/apps/commerce-core
$ TEST_TYPE=integration:pos NODE_OPTIONS=--experimental-vm-modules \
  npx jest --silent=false --runInBand --forceExit --testPathPattern="short-order-num"
```
결과:
```
PASS integration-tests/pos/short-order-num.spec.ts (23.505 s)
  ✓ ① 순환: 한 세션 안 1→2→…→99→1 (날짜 무관) (4065 ms)
  ✓ ② 매장 격리: 매장 A 와 매장 B 는 독립 카운터 (2471 ms)
  ✓ ③ 동시 할당: 같은 세션 병렬 10건이 서로 다른 번호 (701 ms)
  ✓ ④ 긴 번호 불변: order.display_id 는 짧은 번호 발급과 무관 (637 ms)
  ✓ ⑤ POS PATCH 는 서버 발급 후 무시 (silent no-op) (415 ms)
  ✓ ⑥ M0-1127-E · 열기 → 주문 3건 = 1,2,3 (세션 범위) (446 ms)
  ✓ ⑦ M0-1127-E · 닫고 다시 열기 → 다음 발급 = 1 (리셋) (744 ms)
  ✓ ⑧ M0-1127-E · 기존 active snapshot 갱신 시 번호 유지 (재발급 X) (808 ms)
Tests: 8 passed, 8 total
Time: 23.631 s
```

---

## 판정 상세

### REQ 1 · 범위 키(매장+세션) — 명세 §2.2 대사
- PK `stock_location_id` 유지 + `register_session_id` 추적 컬럼 추가 (nullable · ALTER safe)
- UPSERT CASE: 세션 동일 → `(last_value%99)+1`, 세션 다름 → `1` (리셋줄)
- "매장당 1 open 세션 허용 (409)" 전제 → 다중 POS 가 같은 session_id 공유 → 같은 counter row → row lock 직렬화 → 번호 중복 0
- **판정: ✅ 명세 일치**

### REQ 2 · 원자성
- 테스트 ③: `Promise.all` 10건 동시 호출 (순차 루프 아님)
- `medusaIntegrationTestRunner` → 실 Postgres, `rawWithTransientRetry` → `pg.raw(UPSERT)` 각 connection 별 실행
- Postgres UPSERT ON CONFLICT DO UPDATE 의 row-level lock → 직렬화 보장
- **판정: ✅ 실 DB 동시성 검증 · 로컬 실행 확인**

### REQ 3 · 테스트 ⑥⑦⑧ 직접 실행
- 위 실행 결과에서 ⑥⑦⑧ 모두 PASS
- **판정: ✅ 8/8 PASS · 23.5s**

### REQ 4 · POS fork가 서버 번호를 쓰는지

| 표시 위치 | 값의 출처 | 파일:줄 | 결론 |
|---|---|---|---|
| **영수증 Queue #N** | 서버 snapshot `pos_order_num` | `lib/printer/receipt-escpos.ts:194` | 서버 발급값 ✅ |
| **손님 화면 칩** | 서버 snapshot `pos_order_num` | CD 가 snapshot API 폴링 | 서버 발급값 ✅ |
| **POS 칩 UI** | 로컬 `_sessionOrderCounter` | `api/hooks/draft-orders.tsx:157` | 로컬 카운터 |

- POS 칩 로컬 카운터는 `useOpenRegisterSession.onSuccess → resetSessionOrderCounter()`(`api/hooks/register-session.ts:110`) 로 레지스터 오픈 시 0 리셋
- 서버 세션 발급도 새 session_id → ELSE 1 → 리셋
- 단일 POS 정상 경로: POS 칩 · 영수증 · CD 세 군데 모두 `#1` 동기화
- **POS fork 수정 필요: 아니오**
- (기존 한계: checkout 없이 취소된 draft 누적 시 POS 칩 번호가 서버보다 커질 수 있으나 이 PR 범위 밖)

Kyu 영수증 `Order #205` 는 M0-1126-Q 이전 POS 로컬 카운터가 세션 간 누적된 것. PR #473 이후 영수증은 서버 snapshot 값(세션 오픈 시 리셋) 을 읽으므로 레지스터 재오픈 뒤 `Queue #1` 표시됨.

---

## 권고 (비차단 · 1건)

`short-order-num.spec.ts` `closeSession()` 헬퍼의 `as any` 캐스트:
```ts
await svc.updateRegisterSessions({
  id: session_id,
  status: "closed",
  closed_at: new Date(),
  closed_by_user_id: "test-admin",
} as any);
```
`updateRegisterSessions` 입력 타입에 `closed_at` / `closed_by_user_id` 필드를 추가하면 타입 안전성 향상. 테스트 코드 · 비차단.

---

## PR 코멘트
storeport#473 에 COMMENT 제출 (동일 계정으로 자동 APPROVE 불가):
https://github.com/CuriocityDevAi/storeport/pull/473
