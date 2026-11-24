PASS

# M3-1124-M 리포트 — draft 생성 시 metadata.stock_location_id 전달

**날짜**: 2026-11-24  
**브랜치**: `fix/M3-1124-M-draft-location-stamp`  
**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/253  
**커밋**: `598d55a`

---

## 변경 요약

### 문제

서버는 draft 생성 순간 `metadata.stock_location_id` 를 보고 매장별 월간 주문번호(PIM26BXXXX)를 발급한다. 기존 POS 는 결제 완료 시에만 stamp(#251)하므로 Order #185 처럼 번호가 비는 문제 발생.

### 수정 (`api/hooks/draft-orders.tsx`)

| 경로 | 수정 내용 |
|------|-----------|
| `useCreateNewDraft` (line 144) | create body 에 `metadata: { stock_location_id: locationId }` 추가 (매장 있을 때만) |
| `useCreateNewDraft` (line 156 → stamp update) | `pos_order_num` 과 `stock_location_id` 를 함께 stamp — update 가 metadata 를 교체하므로 병합 필수 |
| `useResetAndCreateDraftOrderId` (line 241) | 복구 경로도 create body 에 동일하게 포함 (이후 metadata update 없으므로 create 에서만) |
| `useCompleteDraftOrder` (line 1308) | 기존 spread 패턴 유지 — 이미 올바름 ✓ |

**회귀 0 보장**: 매장 미선택 태블릿은 `metadata` 를 아예 보내지 않음 (`locationId ? { stock_location_id: locationId } : undefined`).

---

## 실행 로그

### vitest

```
npx vitest run __tests__/m3-1124-m-draft-location-stamp.test.ts

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  21:30:38
   Duration  194ms
```

**9/9 PASS**

### lint

```
npx eslint api/hooks/draft-orders.tsx --max-warnings=0
# (출력 없음 — error 0)

npx eslint __tests__/m3-1124-m-draft-location-stamp.test.ts --max-warnings=0
# (출력 없음 — error 0, auto-fix 적용 후)
```

### playwright E2E

**미실행** — 로컬 서버 미기동. Kyu 실기 항목으로 위임.

---

## 어설션 파일

`__tests__/m3-1124-m-draft-location-stamp.test.ts` (9개 케이스)

| 테스트 | 내용 |
|--------|------|
| `(#1) 매장 설정 있음 → create body 에 metadata.stock_location_id 포함` | spy 가로채기로 create body 검증 |
| `(#1) 매장 미선택 → create body 에 metadata 없음 (회귀 0)` | null 전달 시 metadata undefined 확인 |
| `(#1) 매장 설정 있음 → update body 에 pos_order_num + stock_location_id 포함` | stamp update 병합 검증 |
| `(#1) 매장 미선택 → update body 에 pos_order_num 만 포함` | stock_location_id 미포함 확인 |
| `(#1) 복구 경로 create body 에 metadata.stock_location_id 포함` | useResetAndCreateDraftOrderId 검증 |
| `(#1) 복구 경로 매장 미선택 → metadata 없음 (회귀 0)` | undefined 전달 시 확인 |
| `(#1 병합 점검) 기존 metadata.stock_location_id 가 완료 시 그대로 유지됨` | useCompleteDraftOrder 병합 패턴 |
| `(#1 병합 점검) 완료 단계에서 stock_location_id 덮어쓰기 안됨` | pos_order_num 보존 확인 |
| `(#2) draft 생성 stamp 와 완료 stamp 는 같은 키·값 (중복 무방)` | 동일 locationId 일관성 확인 |

---

## 기술 선택

**권장안**: create body 에 직접 `metadata` 포함 + stamp update 에서 병합.  
Medusa v2 의 metadata update 는 **교체(replace)** 방식이므로 create 에만 넣으면 stamp update 가 `stock_location_id` 를 지운다. 두 곳 모두 stamp하여 선후 경쟁 없이 보장.

**PR 본문 3줄**: create·update 양쪽 stamp, 매장 미선택 미전송, 완료 단계 spread 패턴 유지.
