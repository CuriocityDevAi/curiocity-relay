#195 CHANGES(완성 4/5) · #196 CHANGES(완성 3/4) · 충돌 없음(#195↔#196 파일 겹침 없음 · #192/#194 와도 무충돌)

---

## #195 — feat(cd-ask-phone): M0-1118-N

### [REQ] O/X 표

| REQ | 항목 | 판정 | 비고 |
|-----|------|------|------|
| 1 | 버튼 표시 조건: linkedResult/isLinkedByDisplay/pre_entry → hidden | O | classifyAskPhoneButton 3가지 모두 hidden |
| 1 | snapshot=null → disabled + "Customer display not paired" | O | hint Text 렌더링 확인 |
| 2 | loyalty_entry hint emit | O | posScreen.emit + setPosScreenHint 직접 호출 |
| 2 | 바쁨 확인(Alert) | O | active+!paid_at → Alert.alert("Customer display is busy") |
| 3 | 적립 완료 표시(linked) | O | snapshot.pre_entry false→true 전이 감지 → setAskPhoneStatus('linked') |
| 3 | Skipped 표시 | **X** | setAskPhoneStatus('skipped') 호출처 없음 — UI state·라벨은 있으나 이벤트 미연결 |
| 3 | 60초 무응답 복귀 | O | setTimeout 60_000 → timeout + revertDisplayToPaid |
| 4 | 자동 인쇄 충돌 없음 | O | printReceipt 미호출, hasPrintedRef 별도 보호 |
| 5 | unit 7/7 pass | O | 조건 4 + 변형(idle/expired) |
| 5 | typecheck 신규 파일 에러 0 | O | 기존 리포 에러 유지(split-pending-orders 외 7건), 신규·수정 파일 에러 없음 |
| 5 | e2e 1 pass, POST body pos_screen=loyalty_entry 캡처 | O | register_session_id=sess_e2e_01 확인 |

### CHANGES — 남은 항목

1. **REQ 3 skipped 미연결**: `setAskPhoneStatus('skipped')` 호출처 없음.  
   손님이 화면에서 "Skip"을 누를 때 snapshot 에 어떤 필드가 변화하는지(예: `link_open_until` 만료 → `snapshot_state='expired'` 조기 전환) 확인 후 useEffect에 감지 로직 추가 필요.  
   `snapshot_state === 'expired' && askPhoneStatus === 'waiting'` → `setAskPhoneStatus('skipped')` + hint 해제 조합이 가장 자연스러운 접근.

---

## #196 — fix(products): M1-1118-N

### [REQ] O/X 표

| REQ | 항목 | 판정 | 비고 |
|-----|------|------|------|
| 1 | 즉시 비움(서버 응답 전) | O | queryClient.setQueryData(['draft-order'], clearDraftOrderCustomer) — 서버 호출 전 동기적으로 실행 |
| 1 | 실패 시 유지 + 토스트 | **X** | catch 블록에서 `queryClient.invalidateQueries` 호출 → 백그라운드 refetch 시 서버가 customer 반환하면 복원됨. REQ "비운 상태 유지" 미충족 |
| 2 | 장바구니 있으면 확인 Prompt | O | requiresCartConfirmation + Prompt 컴포넌트 |
| 2 | 비어 있으면 바로 진행 | O | executeNextCustomer(false) 직접 호출 |
| 3 | 캐시 무효화(draft-order) | O | 성공 path: invalidateQueries + cancelDraftOrder.mutate |
| 4 | unit 9/9 pass | O | 즉시비움·단방향·장바구니확인 |
| 4 | typecheck 신규·수정 파일 에러 0 | O | products.tsx·next-customer-clear.ts 에러 없음 |

### CHANGES — 남은 항목

1. **REQ 1 실패 시 유지**: catch 블록의 `queryClient.invalidateQueries` 제거.  
   실패 시에도 POS 화면에 customer가 보이지 않아야 한다면 setQueryData로 cleared 상태를 직접 유지하거나, 적어도 invalidate를 하지 않는 것이 명세에 맞음.  
   (서버 응답 없이 실패한 경우 refetch하면 서버에 여전히 customer가 있으므로 복원됨)

---

## 충돌 분석

| 쌍 | 겹치는 파일 | 판정 |
|----|------------|------|
| #195 ↔ #196 | 없음 (success vs products) | 무충돌 |
| #195 ↔ #192 | 없음 (success vs tender-cash/split-tender) | 무충돌 |
| #195 ↔ #194 | 없음 (success vs printer) | 무충돌 |
| #196 ↔ #192 | 없음 (products vs tender-cash) | 무충돌 |
| #196 ↔ #194 | 없음 (products vs printer) | 무충돌 |

---

## 실행 로그

```
# PR #195 unit
npx vitest run __tests__/ask-phone-on-display.test.ts
 Test Files  1 passed (1)
      Tests  7 passed (7)
   Duration  168ms

# PR #196 unit
npx vitest run __tests__/m1-1118-n-next-customer-clear.test.ts
 Test Files  1 passed (1)
      Tests  9 passed (9)
   Duration  191ms

# typecheck (두 PR 모두) — 신규·수정 파일 에러 없음
# 기존 리포 에러 14건 유지(split-pending-orders·cart·_layout 등) — PR 도입 에러 아님
```
