PASS
PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/233
mergeable: MERGEABLE (+470 / -62)
CI: 시작됨 (route checks × 2 — pending)

---

## 구현 판정

### 1. CartBottomBar 검은 바 (시맨틱 토큰) ✅
bg-ink 적용 · 텍스트 text-surface/text-surface/60 로 교체.

### 2. CartSheet 끝까지 펼침 ✅
maxHeight: '92%' → height: height - insets.top (SafeArea 반영 전체 높이).

### 3. 칩 번호 고정 ✅
- DraftOrderListEntry.posOrderNum 추가 (session-scoped 카운터).
- addDraftOrderToList(id, posOrderNum?) — list.length+1 자동 부여.
- useCreateNewDraft → sdk.admin.draftOrder.update(newId, { metadata: { pos_order_num } }) 저장.
- restoreWaitingDraftOrders 필드 +metadata 추가, metadata.pos_order_num 복원.
- buildOrderChips의 numFor → posOrderNum 우선 사용.
- **메타데이터 키: pos_order_num**

### 4. 결제 완료 칩 즉시 제거 ✅
원인: useCompleteDraftOrder가 updateDraftPaidAt 만 호출, removeDraftOrderFromList 미호출 → 칩 2분 잔존.
수정: removeDraftOrderFromList(draftOrderId) 으로 교체.

### 5. 상태줄 … 액션시트 ✅
RegisterBadge 행 + MoreHorizontal 버튼 → BottomSheet [Pickup orders · Close register].
testID: register-menu-btn / products-pickup / products-close.

### 6. 스캔 버튼 → 영수증 QR ✅
ScanBarcode → QrCode 아이콘(lucide-react-native) 교체.
라우팅: 기존 /scan → parseScanPayload(merospos://orders/<id>) 흐름 재사용 (신규 스캐너 없음).

### 7. Ask on display 비활성 ✅
서버 필요 API: POST /admin/pos/orders/:id/ask-phone-on-display
버튼 비활성 유지 (noServerEndpoint = true 플래그). enteringOrderNum prop 연결 준비 완료.

---

## 자기 검증 (Playwright 390×844 · 1180×820)

e2e/flows/M3-1123-G-sell.spec.ts 작성 — 6개 테스트:
① 바 배경색 R+G+B < 150 어서션
② CartSheet 완전 펼침 스크린샷
③ 칩 3개 #1·#2·#3 텍스트 어서션 + 선택 순서 불변
④ #1 결제 후 chip-active-do_1 비가시 · #2·#3 번호 불변 어서션
⑤ 취소 다이얼로그 "Cancel order #N?" 텍스트 어서션
⑥ register-menu-btn 클릭 → Pickup orders · Close register 가시 어서션

진동(expo-haptics) · 카메라 · 손님 화면: 실기 필요 (Playwright 불가).

---

PR #232 close (댓글 + state=closed). 대체 명시.
