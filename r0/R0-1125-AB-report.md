# R0-1125-AB 리포트

## 판정 요약

- **#264 (M0-1125-L)** CHANGES — worklet 수정·status 제거 올바름, draft-orders 테스트를 static source scan → mock fetch 행동 테스트로 교체 요청.
- **#440 (M2-1125-P)** CHANGES — CD 이미지·프리셋·read-only 수정 올바름, CI fail(playwright.cd-p.config.ts feature-map 미등록) + listStores[0] 멀티스토어 대비 필요.
- **#263 (M3-1125-P)** APPROVE — qris-cancel 계약(paid→no-delete, expired→delete, error→throw) 서버 #438 대조 확인, 행동 테스트 3케이스 완비.

---

## PR #264 (M0-1125-L) — CHANGES

**변경 파일**: `components/ui/BottomSheet.tsx` · `api/hooks/draft-orders.tsx` · `__tests__/m0-1125-l-bottomsheet-worklet.test.ts`

### 긍정
- `animateOut` worklet 패턴: `runOnJS(callback)` JS 선생성 + `runOnUI` 래퍼 제거 → withTiming 콜백 안에서 `runOnJS(callback)()` 직접 호출. Reanimated 4 / worklets 0.13 명세 준수, 같은 파일 다른 경로와 일치.
- `/admin/draft-orders?status[]=draft` → `status` 제거. Medusa v2가 거부하는 필드 올바르게 제거.
- **#262 충돌 없음**: #262(M3-1125-M)는 line ~320에 re-export 3줄 추가, #264는 line ~352의 쿼리 URL 수정 — 독립적 변경.

### 변경 요청
`m0-1125-l-bottomsheet-worklet.test.ts` #2 테스트가 소스 문자열 정적 검사. `restoreWaitingDraftOrders` 를 `sdk` 주입형 순수 async 함수로 export 후 `sdk.client.fetch` mock → 호출 URL에 `status` 없는지 행동 테스트 필요. PR #263의 `discontinueOrderMutationFn` 분리 패턴이 선례.

### CI
assertions · flow-tests · lint · playwright · unit-tests · route — **전체 pass**

---

## PR #440 (M2-1125-P) — CHANGES

**변경 파일**: `customer-display-api.ts` · `page.tsx` · `_validate.ts` · `preview/route.ts` · `service.ts` · e2e 2파일

### 긍정
- `files ?? uploads` fallback: Medusa v2 업로드 응답 형식 대응 올바름.
- 이슬람 프리셋 중복 클릭: `disabled={islamicAdding}` + 서버 overlap 거부 2중 방어 충분.
- read-only 실값: preview route에서 `Modules.STORE`로 store_name 조회, 프론트 반영 올바름.

### 변경 요청
1. **CI fail**: `playwright.cd-p.config.ts`가 `docs/feature-map.yaml` 어느 패턴에도 없음 → `pos.cd-settings` 프로세스 files에 추가 필요 (머지 블로커).
2. **listStores({}).name[0] 하드코딩**: PIM/PS 2매장 구조 도입 시 preview가 항상 1번 매장명 반환 → silent wrong data. `stock_location_id` 파라미터 계획 또는 TODO + 티켓 명시 요청.
3. **`_validate.ts` hasFileId 우회 (위험도 low)**: `store_image_file_id` DB 미검증으로 임의 비-HTTP URL 저장 가능. Admin-only + CD에서 이미지 로드 실패로 자연 차단이므로 critical은 아님 — 주석 명시 또는 file_id 검증 추가 권장.

### CI
- **check FAIL** — feature-map-check: `playwright.cd-p.config.ts` unmatched
- heavy-cloud: pending
- markers-and-forbidden · route · changes-filter: pass

---

## PR #263 (M3-1125-P) — APPROVE

**변경 파일**: `split-pending-orders.ts` · `orders.tsx` · `split-tender/[draftOrderId].tsx` · `lib/feature-flags.ts` · `__tests__/` 2파일

### 계약 대조 (서버 #438 M0-1125-K)

| 서버 응답 | 동작 | 판정 |
|-----------|------|------|
| `200 { status:'paid' }` | delete 없음 → `{ kind:'already_paid' }` | ✅ 돈 안전 |
| `200 { status:'expired' }` | delete 1회 → `{ kind:'cancelled' }` | ✅ |
| 500 / 네트워크 오류 | delete 없음 + 에러 propagate | ✅ |
| 기타 status | throw → delete 없음 | ✅ 안전 방향 |

초기 `catch 409` 패턴이 `status === 'paid'` 체크로 교체됨. 서버 계약 명세 완전 일치.

### 행동 테스트
`discontinueOrderMutationFn` pure function 분리 — `sdk.client.fetch` / `sdk.admin.draftOrder.delete` mock 주입으로 (a)(b)(c) 케이스 행동 검증 완비. 한글→영어 assertions 교체 확인(47건).

### CI
- assertions: **pending** (unit-tests green → pass 예상)
- flow-tests · lint · unit-tests · route: **pass**
