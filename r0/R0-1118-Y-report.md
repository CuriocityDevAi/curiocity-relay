#378 APPROVE · seq 안전 O · idle 개인정보 O · 하위호환 O · 충돌 O(feature-map 가능)

## 판정: APPROVE (머지 전 feature-map.yaml rebase 확인 권장)

---

## 1. 계획서 R1 범위 대비 구현 대사

계획서 `docs/plans/customer-display-sync.md §4-6 R1` 항목:

| 항목 | 상태 | 비고 |
|---|---|---|
| `types/customer-display.ts` PosScreen 열거형 추가 | ✅ | `POS_SCREENS` as const · `isPosScreen()` guard |
| DB 마이그레이션 (pos_screen nullable + seq NOT NULL DEFAULT 0) | ✅ | Migration20261118000001 · `add column if not exists` 패턴 |
| 복합 인덱스 (register_session_id, updated_at desc) | ✅ | 폴링 1초 주기 대응 |
| POST checkout-snapshot body에 `pos_screen` · `seq` 수용 | ✅ | route.ts isPosScreen 가드 + seq 범위 검증 |
| `upsertSnapshotForRegister` seq 역전 방지 | ✅ | `input.seq <= existing.seq` → early return |
| `serializeSnapshot` DTO pos_screen + seq 포함 | ✅ | lifecycle.ts |
| **신규** POST /admin/pos/registers/:id/next-customer | ✅ | 계획서 §4-5 ④번 Kyu 결정 사항 대응 · R1 범위 내 타당 |
| IT: cd-pos-screen-sync.spec.ts 3건 | ✅ | PR QC: 3/3 PASS 43s |

**빠진 것**: 없음. `customer-display-server-contract.md` 직접 갱신은 없지만 `feature-map.yaml` 에 반영됨 — 허용 수준.

**넘친 것**: `nextCustomerForRegister` + route 가 R1 타이틀보다 넓지만 계획서 §4-5 ④ Kyu 권장안 그대로이므로 적절 범위 내.

---

## 2. seq 안전성

### 2-1. 역전 방지 (service.ts `upsertSnapshotForRegister`)

```ts
if (
  typeof input.seq === "number" &&
  typeof existing.seq === "number" &&
  input.seq <= existing.seq
) {
  return existing;   // 더 오래된 seq 는 무시 ✅
}
```

- `seq` 미지정(`undefined`) 시 체크 건너뜀 → 기존 POS fork 하위 호환 ✅
- `seq === 0` 첫 생성: `startSnapshotForRegister`에서 `seq: input.seq ?? 0` ✅

### 2-2. 동시 요청 경합 (약점)

`listOrderSnapshots` → check → `updateOrderSnapshots` 사이에 DB-레벨 atomic 보장 없음(application-level check-then-act). 두 요청이 동시 도달하면 last-write-wins. 하지만:
- R2(POS fork)에서 debounced upsert(300ms) 예정 → 실제 경합 가능성 미미
- 최악 케이스: 손님 화면에 오래된 `pos_screen`이 ≤1초 표시 → 데이터 소실 아님
- 운영상 허용 수준. R2 단계에서 coalesce 큐와 함께 재검토 가능.

### 2-3. 계산대별 분리

`listOrderSnapshots({ register_session_id })` — register_session은 stock_location에 1:1로 묶임 ✅

---

## 3. "다음 손님" → idle 전환 · 이전 손님 PII 제거

`nextCustomerForRegister`:
1. `listOrderSnapshots({ register_session_id })` → non-expired 행 전부 `snapshot_state='expired'` ✅
2. 새 idle snapshot 생성:
   - `customer_phone: null` ✅ (전화번호 소멸)
   - `order_id: null` ✅
   - `items: null`, `loyalty: null`, `receipt: null` ✅ (장바구니·적립·영수증 소멸)
   - `pos_screen: 'idle'`, `status: 'idle'` ✅
3. `serializeSnapshot`에서 모든 PII 필드 null → GET /customer-display/snapshots/active 응답에 이전 손님 정보 없음 ✅

**단 주의**: expire 루프 도중 오류 발생 시 일부 행만 expired → partial state 가능. route에서 try/catch로 500 반환하지만 중간 상태는 cleanup되지 않음. 운영상 "재시도 → 나머지 expire + 새 idle 생성"으로 복구 가능. 심각도 낮음.

---

## 4. 하위 호환

| 케이스 | 처리 | 검증 |
|---|---|---|
| `pos_screen` 없이 POST | `isPosScreen(undefined)` → false → null 저장 | IT 3번째 케이스 |
| `seq` 없이 POST | `Number(undefined)` → NaN → `seq=undefined` → upsert seq check 건너뜀 | IT 3번째 케이스 |
| 기존 손님 화면 앱 (`pos_screen` 필드 모름) | DTO에 `pos_screen: null` 내려옴 · optional 필드 · 기존 `status` 로 분기 | 타입 정의 optional ✅ |
| 기존 checkout-snapshot 7개 테스트 | PR QC: 7/7 PASS ✅ | |

---

## 5. 마이그레이션 안전 · device token 보호

**마이그레이션 안전:**
- `add column if not exists` → 재실행 safe ✅
- `drop constraint if exists` before `add constraint` → 멱등 ✅
- `pos_screen TEXT NULL` → 기존 행 null 허용 ✅
- `seq INTEGER NOT NULL DEFAULT 0` → 기존 행 0 backfill ✅
- `down()`: 인덱스 → constraint → 컬럼 역순 ✅

**device token 보호:**
- #378은 `customer_display_device` 테이블/토큰 로직 무변경 ✅
- `nextCustomerForRegister`는 `register_session_id`만 사용 · device_token 미접촉 ✅
- idle snapshot: `customer_phone: null` → PII 미포함 ✅

---

## 6. 테스트 실행 결과

> **제약**: 태스크 규칙 "⛔ Kyu 폴더에서 git 조작 금지" → PR HEAD 로컬 checkout 불가. PR body QC 표 기준 검증.

| 테스트 | PR QC | 비고 |
|---|---|---|
| `it.sh cd-pos-screen-sync` | 3/3 PASS 43s | 전체 흐름 + seq 역전 + 하위 호환 |
| `it.sh checkout-snapshot` | 7/7 PASS 17s | 기존 회귀 0 |
| `it.sh checkout-handover-smoke` | 2/2 PASS 52s | — |
| `pnpm --filter commerce-core run typecheck` | 0 error | — |
| `naming-check.sh` · `upstream-tracking-check.sh` | PASS | — |

---

## 7. 충돌 여부 (#376 · #379 머지 이후)

PR #378 base SHA: `a19aef5b` (before #377/376/379)

| PR | 겹치는 파일 | 충돌 판정 |
|---|---|---|
| #377 (R-B2a ESLint 경계) | `eslint.config.ts` (not in #378), `register_session/core/models/*.ts` 신규 (not in #378) | ✅ 무충돌 |
| #376 (cd pairing SecureStore) | customer-display 앱 전용 | ✅ 무충돌 |
| #379 (PIN 감사 로그) | `docs/feature-map.yaml` ⚠️, `register_session/service.ts` (미수정) | ⚠️ 주의 아래 |

**`docs/feature-map.yaml` 잠재 충돌**: #378은 `customer-display-snapshot` 섹션, #379는 `customer_display_settings`/`pin_audit` 섹션 수정. 서로 다른 YAML 블록이므로 자동 머지 가능성 높음. 단 **머지 전 `git rebase origin/main` 후 충돌 없음 확인 권장**.

---

## 종합

**APPROVE** — R1 범위 완전 구현, seq 역전 방지 올바름, idle 전환 PII 제거 확인, 하위 호환 테스트 커버됨, 마이그레이션 safe. 약점(seq application-level atomic, feature-map 잠재 충돌)은 모두 운영상 허용 수준.

**머지 전 체크리스트**:
- [ ] `git rebase origin/main` 후 `docs/feature-map.yaml` 충돌 없음 확인
- [ ] (선택) `it.sh cd-pos-screen-sync` 재실행으로 rebase 후 초록 확인
