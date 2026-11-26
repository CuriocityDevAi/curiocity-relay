fork#279 CHANGES · storeport#465 APPROVE

## fork#279 — M3-1126-R (agilo-medusa-pos-fork)

**판정: CHANGES**

### 수정 내용 평가

- 수정 방향 올바름. `useSafeAreaFrame().width`(최대 1200px+) → `initial width=0 + onLayout.nativeEvent.layout.width` 측정 후 렌더. 근본 원인 제거.
- `aspectRatio 4/3` placeholder 로 레이아웃 jump 방지. 접근 올바름.
- SELL-PRODUCT-SHEET-IMG spec guard 삭제 없음 ✅.

### CHANGES 근거

REQ: "가로/세로(폰 세로 포함) 두 크기에서 실제 bbox 확인 · 스샷"

`M3-1126-R-pos-fixes.spec.ts` 는 `IPAD_LANDSCAPE { width:1180, height:820 }` 1가지만 테스트. portrait 뷰포트 bbox 검증 + 스크린샷 없음.

fix 코드(`onLayout.nativeEvent.layout.width`)는 portrait 에서도 올바른 값을 반환하므로 로직 버그는 아님. spec guard 가 portrait 를 커버하지 않으면 이후 회귀 감지 불가.

**요청**: portrait 뷰포트(예: 390×844) 에서 동일 bbox 검증 + 스크린샷 케이스 추가.

### 참고 (non-blocking)

- placeholder 깜빡임: spec 의 1200ms 대기는 측정이 아니라 안정화 목적. 체감 여부는 Kyu 실기 확인 필요 (PR Kyu 확인 ① 항목).
- 증상 2·3·4 서버/CD 이관 근거 명확, PR 범위 외 올바름.

---

## storeport#465 — M0-1126-Q (storeport)

**판정: APPROVE**

### 체크 항목

| 항목 | 판정 |
|------|------|
| 매장별 1→99→1 순환 `(last_value % 99) + 1` | ✅ |
| UPSERT 원자성 `INSERT … ON CONFLICT DO UPDATE RETURNING` · Postgres row lock | ✅ |
| 매장 격리 `stock_location_id` PK · 행 분리 | ✅ |
| 기존 주문 번호 불변 · 백필 없음 · upsert update 경로 재할당 없음 | ✅ |
| POS PATCH no-op · admin + device-token route 양쪽 `pos_order_num != null` 가드 | ✅ |
| 마이그레이션 `CREATE TABLE IF NOT EXISTS` · 신규 테이블만 · 기존 데이터 무충돌 | ✅ |
| 긴 번호 `display_id` / `custom_display_id` PIM-26B… 불변 | ✅ |

### 신규 snapshot 경로 전수 확인

`upsertSnapshotForRegister` 3 분기 모두 추적:
1. `existing && existingMatchesOrder` → 기존 갱신, 재할당 없음 ✅
2. `existing && !existingMatchesOrder && order_id` → 신규 생성, 짧은 번호 할당 ✅
3. 나머지(existing 없음) → `startSnapshotForRegister(input)` 위임 → 거기서 할당 ✅

### 결정 충돌 판정 (Kyu 보고용)

**충돌 있음.** 11-23 결정("레지스터 열 때마다 #1 재시작")과 이번 PR 의 11-26 결정("매장별 1→99 날짜 무관 이어감")은 직접 충돌함.

이 PR 은 Kyu 가 11-26 22:13 확정(`decision-kyu-4q-20261126.md ②`)한 결정을 구현하므로 **구현 자체는 올바름**. 11-23 결정은 11-26 결정으로 대체된 것으로 해석되나, 최종 대체 여부는 Kyu 확인 필요.

현재 동작: 레지스터를 새로 열어도 #1 재시작 없이 전날 카운터에서 이어감.

**이 충돌은 CHANGES 사유 아님. 오케(Kyu)에게만 보고.**
