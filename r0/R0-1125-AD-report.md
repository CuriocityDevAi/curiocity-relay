CHANGES

## PR별 판정

| PR | 판정 | CI |
|----|------|----|
| storeport #433 (M1-1125-Q) | **APPROVE** | heavy-cloud PASS · heavy-mac pending(CI 큐) |
| storeport #437 (M1-1125-P) | **CHANGES** | heavy-cloud PASS |
| storeport #440 (M2-1125-R) | **APPROVE** | heavy-cloud PASS · heavy-mac skipping |
| fork #264 (M0-1125-O) | **APPROVE** | 전체 PASS |
| relay #34 → #35 | **CHANGES** | CI 없음(relay repo) |

---

## #433 APPROVE

- R1' `after:absolute after:top-0 after:left-[20%] after:right-[20%] after:h-0.5` → 직선 막대 (rounded-full 아치 아님) ✅
- R2' `formatOrderNumber` 항상 하이픈 · spec 전부 `PIM-\d...` 형식 ✅
- format.unit.spec 22 cases · 전체 unit 690 green ✅
- #431 rebase 완료 ✅
- heavy-cloud PASS (playwright 포함) · heavy-mac CI 큐 대기 중

## #437 CHANGES

**블로킹**: `apps/commerce-core/src/types/customer-display.ts`

```typescript
export type { SnapshotItem, ReceiptItem } from "@storeport/receipt-view-model";
```

#442 핫픽스가 `commerce-core` 의존성에서 `receipt-view-model`을 제거 → `src/types/`(서버 런타임)에 이 import 존재 → Railway 빌드 깨짐.

수정: `SnapshotItem`/`ReceiptItem`을 `customer-display.ts`에 로컬 정의하거나 상대 경로로 교체.

나머지(CD snapshot 머지·line_total→total·subtotal null 수정·테스트 65 suites green)는 이상 없음.

## #440 APPROVE

- feature-map.yaml `playwright.cd-p.config.ts → customer-display-settings` 등록 ✅
- preview/route.ts location_id → STOCK_LOCATION 지점명 반환 (PIM·PS 2매장 대응) ✅
- _validate.ts `store_image_file_id` 동반 시 URL 완화 제거 → 항상 http(s) 강제 ✅
- 단위 테스트 8건 추가 · 705 green ✅
- CI 전체 PASS ✅

## #264 APPROVE

- `restoreWaitingDraftOrders` 정적 소스 문자열 검사 → `sdk.client.fetch` mock 행동 테스트로 교체 (R0-1125-AB CHANGES 해소) ✅
- BottomSheet worklet 정적 검사 #1·#2 유지 (웹/vitest 런타임 재현 불가 · R0 동의) ✅
- origin/master(`#262` 머지) rebase 완료 ✅
- CI 전체 PASS (85 files · 1086 pass) ✅

## relay #34 → #35 CHANGES

`--once` 검증 (feat/M2-1125-Q HEAD ea158bcc2 · 1.207s):

| 기준 | 결과 |
|------|------|
| (a) 1초대 출력 | ✅ 1.207s |
| (b) rl# 항목 CI 큐에 없음 | ✅ |
| (c) 주의 줄 사유 문구 | ❌ |
| (d) sp# 접두어·프롬프트 ID | ❌ |

`feat/M2-1125-S`(`c686e5073`) 로컬 브랜치가 `origin/feat/M2-1125-Q(#35)`에 미push.
(c)(d)는 M2-1125-S에서 수정됐으나 반영 안 됨.

수정: `c686e5073`을 `feat/M2-1125-Q` 위에 push → #35 업데이트.
