# R0-1127-N 리뷰 리포트

fork#291+storeport#476: APPROVE · CI 미확인(fork#291 branch checks 없음) · storeport#476 CI pass · 필수 0 · 권고 0
fork#290: APPROVE · CI pass (assertions·flow-tests·lint·playwright·unit-tests 전부 통과) · 필수 0 · 권고 0

## fork#291 + storeport#476 (엣지 띠 + mirror 진입)

**CI:** fork#291 — no checks reported on branch(미확인) / storeport#476 — heavy-mac·actionlint·check·route 전부 pass

### 시안 대조 (artifact Y5ogGgGwp6QfxyYAPquVFL)
- ✅ 가장자리 띠: `CdPreviewEdgeStrip` STRIP_W=22·STRIP_H=120·주황선 testID 존재
- ✅ 절반 넘게 당기면 열림: `gestureState.dx < -STRIP_W / 2` → `onOpen()` 호출
- ✅ 코너 스냅: `snapToNearestCorner` + SNAP_THRESHOLD=60 구현
- ✅ 모서리 리사이즈: 웹 `setPointerCapture` 기반 · `Platform.OS !== 'web'` 얼리 리턴 → 네이티브 무시
- ✅ X → 띠: `testID="cd-preview-close"` + `onPress={onClose}` + `store.close()` → `isOpen: false`
- ✅ 눈 버튼 삭제: `SellTopBar` 에서 `sell-preview-btn`·`<Eye` 완전 제거

### REQ 2 — mirror=1 경로가 iPad 정상 흐름에 영향 없는지
storeport#476 `_layout.tsx`: `useMirror=false`(파라미터 없음) → `if (useMirror)` 블록 무시 → 기존 `useMock` 로직 그대로 → iPad bootCheck·페어링 흐름 100% 유지 ✅

### REQ 3 — setPointerCapture 네이티브 크래시 없는지
resize `useEffect` 내 `if (Platform.OS !== 'web') return;` 얼리 리턴 → 네이티브에서 이벤트 리스너 미등록 → 크래시 없이 무시 ✅

### 번들 포함 항목 (시안 외)
- M3-1127-G: 이미지 높이 상한(screenH×0.26) — BottomSheet 버그 픽스, 독립적
- M3-1127-H: `mergeActiveId __temp__` 가드 — 카트 칩 중복 버그 픽스, 독립적

**판정: 시안 요소 전부 구현 · 시안에 없는 필수 추가 없음 → APPROVE**

---

## fork#290 (Phone entry 입구 통일)

**CI:** assertions·flow-tests·lint·playwright·unit-tests·route 전부 pass

### REQ 4 체크
- ✅ 세 입구 모두 `useOpenPostSettlementPhoneEntry` → POST `/phone-entry`
  - ① Re-enter: `phoneEntry.mutate(orderId)`
  - ② Order 상세 `PhoneEntryButton`: `open.mutate(orderId)` (파일 변경 없음)
  - ③ Link customer `LateLinkCustomerSheet`: `phoneEntryMut.mutate(orderId)`
- ✅ 기존 Order 상세 `PhoneEntryButton` 유지 — 변경 파일 목록에 없음
- ✅ Sell 화면 무변경 — `app/(tabs)/sell.tsx` 미포함
- ✅ 레거시 `pos_screen: 'loyalty_entry'` hint 제거 · `onAskOnDisplay` 핸들러 제거
- ✅ `CustomerPhoneStatus` 칩 재사용 · `eligible=false` → `REASON_TOAST` + `phone-method` 복귀

**판정: 세 입구 통일 · 기존 경로 보존 · 레거시 제거 완료 → APPROVE**

---

## PR 코멘트 링크
- fork#291: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/291#issuecomment-7213159536
- storeport#476: https://github.com/CuriocityDevAi/storeport/pull/476#issuecomment-7213160466
- fork#290: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/290#issuecomment-7213161415

## 직접 실행 명령
```
gh pr checks 291 --repo CuriocityDevAi/agilo-medusa-pos-fork
gh pr checks 476 --repo CuriocityDevAi/storeport
gh pr checks 290 --repo CuriocityDevAi/agilo-medusa-pos-fork
gh pr diff 291 --repo CuriocityDevAi/agilo-medusa-pos-fork
gh pr diff 476 --repo CuriocityDevAi/storeport
gh pr diff 290 --repo CuriocityDevAi/agilo-medusa-pos-fork
```
