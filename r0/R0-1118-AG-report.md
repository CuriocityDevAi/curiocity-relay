fork #192 CHANGES · 정상 결제 비회귀 O · 다음 손님 안 막음 O · 중복 0 O · PayLater 단독 없음 · 충돌 O

# R0-1118-AG — PR #192 리뷰 보고서

**판정**: CHANGES (머지 충돌 해결 후 APPROVE 예정)
**리뷰어**: R0 (Claude)
**날짜**: 2026-11-18

---

## 충돌 (CHANGES 근거)

```
git merge-tree 결과:
  changed in both: app/checkout/split-tender/[draftOrderId].tsx
  changed in both: app/checkout/tender-cash/[draftOrderId].tsx
```

PR #193(싱크 R2 — usePosScreenAutoEmit)이 master 머지 후 두 파일 모두 수정됨.
#192 베이스 SHA(`0ce47c0`) 뒤에 #191(프린터 · success 화면) + #193(싱크 R2 · tender-cash + split-tender) 모두 머지.
→ **rebase on master 필요**. 충돌 해결 범위: `usePosScreenAutoEmit` import/hook 호출과 `isOnline` 가드·idempotency 가드 위치 조율. 로직 충돌 없음(다른 함수 위치).

---

## [REQ-1] 정상 결제 비회귀 ✅

- idempotency 키 = `tender_submitted_{draftOrderId}` → **각 장바구니(UUID)가 독립 키**.  
  새 손님 = 새 draftOrderId = 다른 키 → 차단 없음.
- 성공 시 `clearTenderSubmitted` 즉시 호출 → 같은 draftOrderId 재사용 시도 차단 없음.
- `if (!isOnline)` 가드는 오프라인 경우만 걸림 → 온라인 정상 결제 흐름 변화 없음.
- 타입체크: #192 수정 파일에 신규 TS 에러 없음(pre-existing 에러만 · `@playwright/test` 미설치 등).
- 단위 테스트: 22건 실패 모두 pre-existing(screen-calcs · m3-1105-bw · m3-1105-bz 등) — #192 파일 관련 실패 없음.

---

## [REQ-2] 중복 방지 ✅

**마커 lifecycle**:
1. `markTenderSubmitted` → POST 직전 SecureStore 기록
2. POST 성공 → `clearTenderSubmitted` → 마커 삭제 → 다음 손님 정상
3. POST 실패(네트워크 컷) → 마커 유지 → 재시도 시 `isTenderSubmitted()=true` → `setOrderMayExist(true)` → 복구 UI 표시, 서버 미호출 → **중복 0**

**복구 UI**:
- "Orders에서 확인" → `router.replace('/(tabs)/orders')` → 주문 1건 확인 가능
- "재시도 (주문 없음 확인 후)" → `clearTenderSubmitted` → 마커 삭제 → 결제 화면 복원

**다음 손님 안 막음**:
- 성공 시 마커 삭제됨 → 차단 없음
- 앱 재시작 후 동일 draftOrderId 재접근 → 복구 UI 표시(올바른 동작)
- 새 손님 = 새 draftOrderId → 완전 독립

**in-flight 가드 연동** (DuplicateTenderError):
- `markTenderSubmitted` await 완료 전 두 번째 탭 → 마커 없음 상태에서 `createTender.mutateAsync` → `DuplicateTenderError` → catch에서 `return` (silent).  
  이때 두 번째 `markTenderSubmitted`도 완료되므로 마커는 설정됨. 첫 번째 request 성공 시 `clearTenderSubmitted` 호출 → 정상. 첫 번째 실패 시 마커 유지 → 다음 클릭 복구 UI. **문제 없음.**

---

## [REQ-3] PayLater 경로 ✅ → 단독 없음

`app/checkout/` 디렉터리: `[draftOrderId]`, `delivery/`, `split-tender/`, `success/`, `tender-cash/`, `tender-qris/`.  
PayLater 전용 화면 **없음**. PayLater 주문은 `split-tender` 경유 (리포트 기재대로).  
split-tender에 오프라인 가드 추가됨(Step1·Step2 모두 7개 핸들러 커버).

**후속 과제**: split-tender Step1/Step2에 SecureStore idempotency 마커 없음.  
오프라인 사전 체크는 있으나, Step1 POST 성공 후 응답 유실 → 재시도 → 중복 Step1 위험 잔존.  
PayLater(= split-tender 경유)에서 재현 가능. tender-cash 대비 보호 수준 낮음 → **후속 PR 대상**.

---

## [REQ-4] 오프라인 즉시 안내 ✅

- tender-cash `onProcess`, `onConfirmCard`, `onGenerateQris` → `if (!isOnline) { showToast.error(...); return; }` 추가
- split-tender `onProcessFirst`, `onConfirmFirstCard`, `onProcessFirstQris`, `onProcessSecond`, `onConfirmSecondCard`, `onProcessSecondQris` → 동일 가드
- 15초 스피너 없음 — 즉시 토스트 반환
- 장바구니 유지 — `router.push` 없이 `return`만 하므로 화면 유지

**Hand over 실패 안내** (FulfillSheet):
- `${orderRef} — Fulfill failed` + `${msg} · Open Orders to retry Hand over`
- `orderRef` = `Order No. ${order.displayId}` 또는 `Order ${order.id.slice(-6)}` → 주문번호 포함 ✓
- `visibilityTime` 4000 → 6000ms 연장 ✓

---

## [REQ-5] e2e / 타입체크 / 머지 충돌

| 항목 | 결과 |
|------|------|
| e2e 마커 키 일치 | `meros.secureStorage.v1.tender_submitted_order_mock_01` = `KEY_PREFIX + keyFor(id)` ✅ |
| e2e REQ-3 오프라인 토스트 | `page.getByRole('alert')` · tenderCallCount=0 확인 ✅ |
| e2e REQ-2 복구 UI | `tender-order-may-exist` testID · tenderCallCount=0 확인 ✅ |
| e2e REQ-2 재시도 | 마커 삭제 후 `processBtn` 복원 · 정상 결제 성공 ✅ |
| 타입체크 | #192 파일 신규 에러 없음 ✅ (pre-existing 에러들은 무관) |
| 단위 테스트 | 22건 pre-existing 실패 · #192 관련 실패 없음 ✅ |
| #191(프린터) 충돌 | ❌ 없음 (success 화면만 수정 · #192 범위 외) |
| #193(싱크 R2) 충돌 | ✅ 있음 — tender-cash + split-tender 모두 충돌 |

---

## 소결

**CHANGES 1건**: #193 머지 후 `tender-cash` + `split-tender` 충돌. rebase on master 필요.  
충돌 해결 후 로직 자체는 APPROVE 수준.  
나머지 로직(idempotency lifecycle · 오프라인 가드 · FulfillSheet 안내) 모두 올바름.
