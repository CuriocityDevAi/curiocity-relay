# R0-1119-C — #385 review + CI 상태표 (#383 #384 #385)

checks: #383 all-pending · #384 all-pending · #385 markers✅ build/unit pending || #385 APPROVE(c) · 로직0 O · eslint 전체 X(pre-existing 7 errors, CI miss)

---

## CI 상태표

### #383 (register-session X/Z 계산)
| 체크 | 상태 | 비고 |
|------|------|------|
| markers-and-forbidden | pending | — |
| changes-filter | pending | — |
| check | pending | — |

**요약**: 전체 pending. CI 러너 큐 대기 중.

### #384 (POS 환불 route)
| 체크 | 상태 | 비고 |
|------|------|------|
| markers-and-forbidden | pending | — |
| changes-filter | pending | — |
| check | pending | — |

**요약**: 전체 pending. CI 러너 큐 대기 중.

### #385 (R-B3 공용 정리)
| 체크 | 상태 | 경과 |
|------|------|------|
| markers-and-forbidden | **pass** | 1m 9s |
| build-commerce-core | pending | — |
| unit-commerce-core | pending | — |
| changes-filter | pending | — |
| check | pending | — |

**요약**: fast-gate(markers-and-forbidden) 통과. build/unit 아직 pending.

---

## #385 리뷰 (refactor/M2-1118-V-rb3)

### 판정: APPROVE (조건부 코멘트 포함)

### 1. 로직 diff — O (변경 없음) ✅

| 파일 | 변경 내용 |
|------|-----------|
| `_shared/fulfillment-cancel.ts` | 224줄 → 4줄 얇은 재수출 |
| `_shared/fulfillment-items.ts` | 140줄 → 8줄 얇은 재수출 |
| `src/lib/fulfillment-cancel.ts` | 新 파일 (기존 코드 그대로 이동) |
| `src/lib/fulfillment-polyfill-items.ts` | 新 파일 (기존 코드 그대로 이동) |
| `execute-fulfillment.ts` | import 경로 변경 + 불필요 줄바꿈 제거(포맷만) |
| `pos-void/steps.ts` | import 경로 1줄 변경 |
| `eslint.config.ts` | warn → error + 메시지 텍스트 갱신 |

새 `src/lib/*.ts` 파일을 기존 _shared/ 코드와 행 대 행 비교: 로직 추가·삭제·변경 없음.

### 2. 옛 경로 import 남은 곳

**1건 발견** (PR 대사표 미포함, 하위 호환 유지됨):
```
src/api/admin/pos/maintenance/repair-stuck-fulfillments/route.ts:3
  import { buildFulfillmentPolyfillItems } from "../../_shared/fulfillment-items";
```
- POS 전용 영역 파일 → ESLint SHARED_FILES 범위 외 → 경계 위반 아님
- `_shared/fulfillment-items.ts`의 얇은 재수출 덕분에 런타임 동작 유지
- 차후 cleanup 대상이지만 이 PR 범위 내에서 블록 사항 없음

### 3. ESLint error 모드 — X (전체 실행 시 pre-existing 7 errors) ⚠️

```
$ eslint src/ --max-warnings=0
✖ 13 problems (7 errors, 6 warnings)
```

**7 errors (전부 pre-existing, 이 PR 도입 아님)**:
| 파일 | 위반 패턴 |
|------|-----------|
| `src/lib/link-customer-order.ts:20` | `api/admin/pos/_shared/manager-pin` |
| `src/lib/loyalty/earn.ts:26` | `../../modules/pos_settings` |
| `src/lib/loyalty/snapshot-earn.ts:22` | `../../modules/pos_settings` |
| `src/lib/loyalty/__tests__/earn-offset.unit.spec.ts:7` | `pos_settings` |
| `src/lib/loyalty/__tests__/snapshot-earn.unit.spec.ts:12` | `pos_settings` |
| `src/modules/payment_xendit/__tests__/qris-simulate-bk.unit.spec.ts:17` | `api/admin/pos/...` |
| `src/modules/payment_xendit/__tests__/qris-xendit-bd.unit.spec.ts:22` | `api/admin/pos/_shared/xendit-refund` |

**이 PR 추가 2개 파일(fulfillment-cancel.ts, fulfillment-polyfill-items.ts)**: violations 0 ✅

**CI 블록 여부**: 없음. `eslint`가 package.json devDependencies에 없어 `medusa lint` 는 "Linting skipped" 메시지와 함께 스킵됨. `medusa build`도 lint 단계 미실행.

**PR 본문 "ESLint (SHARED_FILES): **위반 0** → error 승격 안전" 주장은 부정확**:
- 이 PR의 새 파일들은 0이 맞음
- 그러나 기존 `src/lib/` 파일들에 warn 7건 → error 7건으로 승격됨
- 로컬에서 `eslint`를 직접 실행하는 개발자는 error를 보게 됨

**6 warnings**: unused eslint-disable directive (non-blocking).

### 4. Unit tests — O (all pass) ✅

```
Test Suites: 47 passed, 47 total
Tests:       539 passed, 539 total
Snapshots:   18 passed, 18 total
Time:        31.874 s
```

### 5. Build — O (pass) ✅

```
info: Backend build completed successfully (7.39s)
info: Frontend build completed successfully (23.45s)
```

---

## pin-audit main 독립 실패 — #385 무관 ✅

- `pin_audit` 모듈은 #379(M2-1118-N)에서 main에 도입
- #385 변경 범위: fulfillment 유틸 이동(2파일) + 2개 import 경로 수정 + ESLint 설정
- `pin_audit` 모듈·`manager-pin` 라우트·나중 연결 PIN 플로우: **#385 diff와 비중첩**
- pin-audit integration test 실패는 #385 이전부터 존재, 이 PR에서 발생한 것 아님

---

## 리뷰 코멘트 (GitHub에 남길 내용)

**판정: APPROVE**

> **로직0 O** — 이동·재수출만, 동작 변경 없음. unit 47s/539t pass, build pass.
>
> **하나 지적**: `repair-stuck-fulfillments/route.ts:3` 가 여전히 `_shared/fulfillment-items` 옛 경로를 사용 중 (re-export로 호환 유지되어 블록 아님, 차후 정리 대상).
>
> **ESLint 주의**: `eslint src/ --max-warnings=0` 로컬 실행 시 pre-existing 7 errors가 error 레벨로 올라옴. CI는 `eslint` 미설치로 블록 없지만, PR 본문 "위반 0" 주장은 "이 PR의 신규 파일 기준 0"으로 보정 필요. 기존 loyalty/link-customer-order 파일들은 R-B3 후속 정리 작업 범위.
