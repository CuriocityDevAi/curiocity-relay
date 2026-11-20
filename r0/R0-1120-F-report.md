# R0-1120-F 검증 보고서

**#408 CHANGES · 사실 오류 10건 · 누락 4건 · 의심1 X · 의심2 X · 의심3 O**

---

## 의심 판정 요약

| 의심 | 판정 | 근거 |
|------|------|------|
| 의심1 `kav/doneSnapshotId/skippedSnapshotId/skipped_at` "현행 코드에 없음" | **X — 모두 존재** | `useDisplayMachine.ts:49-51,92-94`, `display-machine.ts:79-86,96-98`, `order_snapshot/model.ts:41` — PR #400(a66b3c6)이 추가 |
| 의심2 `pos_screen` serializeSnapshot()/DB에 없음 | **X — 존재** | `order_snapshot/model.ts:49` enum column, `lifecycle.ts:116` serializeSnapshot 반환. `cd-pos-screen-sync.spec.ts`에서 서버응답 검증됨 |
| 의심3 docs-only PR인데 changed_files=7 | **O — 코드 혼입** | `refund/route.ts`, `return/route.ts`, `void/route.ts`, `recover-loyalty.ts`, `pos-void-route.unit.spec.ts`, `net-refund-preview-small.spec.ts` 6개 코드파일 포함 |

---

## 사실 오류 (10건)

| # | 설계서 주장 | 실제 (파일:줄) | 고칠 문장 |
|---|------------|---------------|-----------|
| E1 | §5-C: "pos_screen 필드가 serializeSnapshot() / DB에 존재하지 않음 … 항상 undefined — 서버 미저장" | `order_snapshot/model.ts:49` pos_screen enum column 존재; `lifecycle.ts:116` `pos_screen: snapshot.pos_screen ?? null` 반환 | "현행에서 pos_screen은 서버 저장·반환됨. entering 뱃지가 미표시되는 다른 원인 확인 필요. 새 설계에서 pre-payment 흐름 제거 후 이 조건이 불필요해질 뿐임" |
| E2 | §1-A row1 `display-machine.ts:10,104-105` Rule A 구현부 | 구현: `display-machine.ts:197-200` | 줄번호를 `10(주석),197-200(구현)` 으로 수정 |
| E3 | §1-A row2 `display-machine.ts:11,112-113` Rule B 구현부 | 구현: `display-machine.ts:203-204` | 줄번호를 `11(주석),203-204(구현)` 으로 수정 |
| E4 | §1-A row3 `display-machine.ts:116-119` KEYPAD_OPEN from cart | `display-machine.ts:207-209` | 줄번호 `207-209` 으로 수정 |
| E5 | §1-A row4 `display-machine.ts:121-132` Rule C | `display-machine.ts:222-231` | 줄번호 `222-231` 으로 수정 |
| E6 | §1-B `display-machine.ts:80-84` Rule H (poll error overlay) | `display-machine.ts:130-134` | 줄번호 `130-134` 으로 수정 |
| E7 | §1-B `display-machine.ts:92-95` Rule I (expired → main) | `display-machine.ts:186-188` | 줄번호 `186-188` 으로 수정 |
| E8 | §1-A `service.ts:281-291` setSnapshotPhoneEntry() | `service.ts:395-406` | 줄번호 `395-406` 으로 수정 |
| E9 | §1-B `service.ts:293-309` markSnapshotPaid() | `service.ts:427-443` | 줄번호 `427-443` 으로 수정 |
| E10 | §1-A `models/order-snapshot.ts:25` pre_entry DB 필드 | `order_snapshot/model.ts:28` (models/order-snapshot.ts는 re-export 래퍼) | 파일 경로를 `order_snapshot/model.ts:28` 으로 수정 |

---

## 누락 (4건)

| # | 항목 | 현행 위치 | 조치 |
|---|------|----------|------|
| G1 | `kav` / `keypadAfterVisited` | `display-machine.ts:83-86,96`(input/output), `useDisplayMachine.ts:51,94`(state) | 1-A DELETE 또는 1-C CHANGE에 추가 필요. 새 state machine에서 제거되면 hook도 갱신 대상 |
| G2 | `doneSnapshotId` | `display-machine.ts:80,98`, `useDisplayMachine.ts:50,93` | 동일 — 새 흐름에서 사용 여부 명시 필요 |
| G3 | `skippedSnapshotId` | `display-machine.ts:79,97`, `useDisplayMachine.ts:49,92` | 동일 |
| G4 | `skipped_at` DB 컬럼 | `order_snapshot/model.ts:41` | 새 설계 §4-C 에서 Skip = server expire로 대체 → `skipped_at` 불필요; 1-A DELETE + migration 목록에 추가 |

---

## 의심3 상세: PR 코드 혼입 목록

docs-only 라는 PR 설명과 달리 아래 6개 코드파일이 변경됨:

| 파일 | 변경 내용 |
|------|----------|
| `apps/commerce-core/integration-tests/pos/net-refund-preview-small.spec.ts` | 신규 추가 (303줄) |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/refund/route.ts` | dynamic import → static import |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/return/route.ts` | dynamic import → static import + 포맷 |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/void/route.ts` | dynamic import → static import |
| `apps/commerce-core/src/workflows/pos-refund/steps/recover-loyalty.ts` | dynamic import → static import |
| `apps/commerce-core/src/workflows/pos-void/__tests__/pos-void-route.unit.spec.ts` | mock 방식 변경 |

이 코드 변경들은 별도 PR로 분리하거나, PR 제목·설명에 명시 필요.

---

## Kyu 보완 5건 반영 여부

| 보완 항목 | 반영 | 위치 |
|----------|------|------|
| Skip (캐시어 건너뛰기) | ✅ | §4-C, S-06 |
| 20초 last-key timeout | ✅ | §3 타이머표, S-04 |
| No thanks | ✅ | §2-C mermaid, S-05 |
| 신규만 동의 | ✅ | §6-B, S-07 |
| 결제 전 회원확인은 캐시어 쪽 | ✅ | §6-C "현재 범위 외" 명시 |

---

## POS 잠김 "영원히 잠기는 경로 0개" 논증 검토

§4-D 표에서 4가지 시나리오 커버 여부:

| 시나리오 | §4-D 경로 | 판정 |
|---------|----------|------|
| 손님 화면 오프라인 | polled_at > 30s → 잠김 없음 | ✅ |
| 앱 종료 | polled_at 갱신 중단 → 30s 후 오프라인 판정과 동일 | ✅ (묵시적) |
| 네트워크 단절 | 오프라인 경로와 동일 | ✅ (묵시적) |
| 서버 재시작 | "서버 다운 → snapshot null → 잠김 없음" 경로 | ✅ |

논증 OK. 단 앱 종료·네트워크 단절을 §4-D에 명시 행으로 추가하면 더 명확.

---

## 시나리오 커버리지 (19개)

Kyu 원문 7가지 흐름 → S-01~S-05, S-18 커버 ✅  
Kyu 보완 4가지(범위 내) → S-04,S-05,S-06,S-07 커버 ✅  
결제 전 회원확인 → §6-C "범위 외" 명시, 시나리오 불필요 ✅  
나머지 보완 시나리오 S-08~S-19 모두 명시적 커버 ✅

---

## 라운드 분할 파일 겹침

| 라운드 | 주요 앱 | 겹침 |
|--------|--------|------|
| R1 (서버) | commerce-core | 없음 |
| R2 (손님화면) | customer-display | 없음 |
| R3 (POS) | pos-m1/fork | 없음 |

겹침 없음 ✅

---

## 판정 근거 요약

**CHANGES** 이유 2가지:
1. **코드 혼입**: docs-only PR인데 코드 파일 6개 포함 → 별도 처리 또는 PR 설명 수정 필요
2. **E1 사실 오류 치명**: `pos_screen` "서버 미저장" 주장이 틀림 → §5-C 버그 진단 오류, §1-A DELETE row13의 "dead code" 근거 무효화 → 설계서 §5-C 수정 필요
