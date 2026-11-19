#356 머지 가능 · #373 머지 가능 · 충돌 #356 X · #373 X

## PR #356 — refactor(pos): M2-1118-B list-pos-orders 공용 step 추출

**판정: 머지 가능**

### 충돌 여부
- `gh pr view`: `mergeable: true`, `mergeable_state: unstable`
- unstable 원인: CI 실패(billing/spending limit — `The job was not started because recent account payments have failed`)
- 코드 충돌 없음. main의 `orders-list/route.ts` · `draft-orders/route.ts` 는 #356 이후 변경된 머지 없음 (#383~#404 목록 확인)
- `_shared/steps/list-pos-orders.ts` 는 main에 미존재 (현재 `_shared/` 에는 `payment-utils.ts` 만 있음)

### 로직 변경 0 근거
- 변경 범위: `query.graph(order)` + `customerModule.listCustomers` 묶음을 `listPosOrdersHandler` 로 추출
- 응답 shape, 필터, pagination 로직 동일하게 유지
- orders-list route: `ContainerRegistrationKeys.QUERY` 직접 사용 → `listPosOrdersHandler` 호출로 교체
- draft-orders route: 동일 패턴
- 신규 공용 step: `src/workflows/_shared/steps/list-pos-orders.ts` (131줄)
- IT spec 추가: `draft-orders.spec.ts` (310줄 신규) · `orders-list.spec.ts` pagination 케이스 추가

### main에 같은 추출 미존재 (대체 없음)
- #383~#404 머지 목록에서 `list-pos-orders` 추출 수행 PR 없음
- #403(quote contract), #385(R-B3 fulfillment 유틸), #384(fulfilled 환불) 모두 orders-list/draft-orders routes 미접촉

### unit 실행 숫자
- PR 설명 및 pre-push 로그: **45 suites / 528 tests PASS**
- CI pos-integration: 로컬 Postgres 없어 미실행 · CI 빌링 복구 후 재확인 필요

---

## PR #373 — docs: M1-1118-I Meros POS Go-live 계획서

**판정: 머지 가능**

### 충돌 여부
- `mergeable: true`, `mergeable_state: clean`
- 변경 파일: `docs/plans/meros-golive.md` 1개 (+184/-0)
- main에 `meros-golive.md` 미존재 → 충돌 없음

### src 변경 0
- 순수 docs PR. 코드 영향 없음.

### 오늘 머지분(#383~#404)과 어긋나는 줄 목록

| 위치 | 계획서 내용 | 현행 main 상태 | 심각도 |
|------|------------|---------------|--------|
| §1 기기표 iOS 경로 | "기존 eas-dev-build.md runbook 그대로" | iPad Split View 반응형 #392 MERGED — 완료 사실 미반영 | 낮음(보관용) |
| §4 결제표 QRIS 행 "앱 현재 상태" | "✅ 현금 흐름 재사용 가능 · 별도 UI 불필요" | #403(quote contract · qris_receipt_id · POST at) MERGED — QRIS tender 흐름 변경됨 | 낮음(보관용) |
| §5 체크리스트 #8 오프라인 배너 | "없음 · 허브 코딩" | #383~#404 중 오프라인 배너 미머지 — 일치 | 없음 |
| §6 라운드 R4 "오프라인 배너" | 미완 항목 | 여전히 미완 | 없음 |

- §1 Split View, §4 QRIS 2줄이 오늘 머지분과 어긋남
- 그러나 PR 설명 "계획서 보관용 · Kyu 승인 후 라운드 티켓 발부"이므로 세부 현황 미반영은 허용 범위
- 머지 후 §1·§4 1회 업데이트 권장

---

## 요약

| PR | 판정 | 충돌 | CI | 비고 |
|----|------|------|----|------|
| #356 | **머지 가능** | X | unstable(빌링) | unit 45/528 PASS · IT 빌링 복구 후 확인 |
| #373 | **머지 가능** | X | clean | docs only · §1 §4 2줄 업데이트 권장 |
