# #356 IT orders-list 10/10 · draft-orders 6/6 · CI pos-integration 실행 X(is_draft=true) · 수정 push X

## 1. 로컬 IT 실행 결과

### orders-list (10/10 PASS)
```
PASS integration-tests/pos/orders-list.spec.ts (16.986 s)
  M1-1116-B · GET /admin/pos/orders-list
    ✓ #1 전화번호 가림 형식 · loyalty_earn 객체 형식 → 숫자 반환
    ✓ #2 전화번호 일부 필터 (q=2480)
    ✓ #3 주문번호(display_id) 필터
    ✓ #4 loyalty_earn 없는 주문 → null
    ✓ #5 loyalty_earn 객체 applied=false → null
    ✓ #6 loyalty_earn + loyalty_recover → 순적립(earn − recovered)
    ✓ #OL-P limit=1 offset=0/1 · count 단언
    M0-1117-B · phone normalization search + unified mask
      ✓ q=081…(local), q=6281…(no+), q=+6281… 3모양 저장분 전부 반환
      ✓ 손님 칸 마스킹은 저장 모양과 무관하게 0813-****-2480 통일 · 응답 shape 불변
      ✓ display_id 검색 회귀 없음 — q=<display_id> 가 그대로 작동

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
Time:        17.06 s
```

### draft-orders (6/6 PASS, 1 todo)
```
PASS integration-tests/pos/draft-orders.spec.ts (9.188 s)
  M2-1118-D · GET /admin/pos/draft-orders (post-#356)
    ✓ #1 is_draft_order=false 주문은 목록에서 제외
    ✓ #2 응답 shape Object.keys().sort() 고정
    ✓ #3 tenders/paid_so_far/remaining 계산 (captured 1 · pending 1)
    ✓ #4 stock_location_id 필터 — 다른 위치 주문은 메인 위치 필터에서 제외
    ✓ #5 register_session_id 필터 — 다른 세션 주문 제외
    ✓ #6 created_at DESC 정렬 (#356 신규) — 나중 생성 주문이 더 앞에 위치
    ✎ todo #7 7일 초과 draft 는 목록에서 제외 (created_at DB 직접 패치 필요 · 실행 대기: 로컬 DB/CI 빌링)

Test Suites: 1 passed, 1 total
Tests:       1 todo, 6 passed, 7 total
Time:        9.249 s
```

## 2. CI pos-integration 실행 여부 (run 44581404664 · 커밋 기준 HEAD)

**pos-integration: 실행 X (skip)**

근거 — `gh run view --log --job=135763865412` 로그:
```
heavy-mac  Run ./.github/actions/heavy-steps  17:53:00  commerce_core: true
heavy-mac  Run ./.github/actions/heavy-steps  17:53:00  is_draft: true
...
heavy-mac  pos-integration · Wait for local Postgres     outcome=skipped;conclusion=skipped
heavy-mac  pos-integration · Create unique test database outcome=skipped;conclusion=skipped
heavy-mac  pos-integration · Restore build from cache    outcome=skipped;conclusion=skipped
heavy-mac  pos-integration                               outcome=skipped;conclusion=skipped
```

heavy-mac 소요 2m21s (평소 15~25분 → 경로가 맞아도 pos-integration 전부 skip).

## 3. skip 원인

**`is_draft: true`** — PR #356 이 Draft 상태에서 CI 가 돌았음.

`heavy-steps/action.yml` pos-integration 조건:
```yaml
if: inputs.commerce_core == 'true' && inputs.is_draft != 'true' && steps.build_cc.outcome == 'success'
```

- `commerce_core = true` (apps/commerce-core/src/** · integration-tests/** 변경 — 경로 필터 충족)
- `is_draft = true` ← **이것이 skip 원인**
- `is_draft != 'true'` → false → pos-integration 전체 skip

수정 대상: PR을 Ready for review로 전환한 뒤 CI를 재실행하면 pos-integration 이 정상 실행됨.
별건 처리 권고 (is_draft 조건 완화 or draft PR도 IT 실행 옵션 추가).

## 4. 코드 수정

없음 (tests 전부 PASS · 범위 내 수정 불필요).
