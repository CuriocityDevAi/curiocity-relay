#195 판단필요 · #196 APPROVE || checks: #195 flow-tests pass · assertions/lint master와 동일 11건 · #196 flow-tests pass · assertions/lint master와 동일 11건

---

## #195 — M0-1119-A 반영 (snapshot_state 'expired' → skipped) : **제품 판단 필요**

### REQ 1 · 타이밍 분석

`loyalty-snapshot.ts` SnapshotState: `'active' | 'expired' | 'pending_display'` — 전용 "skipped" 값 없음.  
`useCustomerDisplaySnapshot` 폴링 주기 **10초**, POS 타이머 **60초**, `link_open_until` 최대 **10분**.

**시간선 (고객 iPad가 즉시 API 호출 없는 경우)**

```
T=0s   : 캐셔 "Ask phone on display" → 60s 타이머 시작
T=0s   : 서버 snapshot_state='active', link_open_until=T+10min
         고객 iPad → Skip 버튼 클릭 (서버 상태 변경 없음)
T=10s~ : POS 폴링 → snapshot_state 여전히 'active' → 전이 없음
T=60s  : 타이머 만료 → askPhoneStatus='timeout' (waiting 아님)
T+10min: link_open_until 만료 → snapshot_state='expired'
         shouldTransitionToSkipped: askPhoneStatus!='waiting' → false
```

→ **"Skipped" 라벨 사실상 뜨지 않음. 항상 "No response — returned to receipt" 로 종결.**

**단, 고객 iPad가 Skip 시 즉시 DELETE /checkout-snapshot 호출하는 경우**:
`snapshot_state='expired'` → 10초 이내 POS 감지 → 60s 전에 "Skipped" 정상 표시.  
서버/고객 앱 코드 접근 불가로 현재 확인 불가.

### Unit 8/8 직접 확인

| # | it | 판단 |
|---|---|---|
| 1 | hidden — linkedResult 있음 | ✓ |
| 2 | hidden — isLinkedByDisplay=true | ✓ |
| 3 | hidden — snapshot.pre_entry=true | ✓ |
| 4 | disabled('not_paired') — snapshot=null | ✓ |
| 5 | enabled+busy — active && !paid_at | ✓ |
| 6 | enabled+busy=false — paid_at 있음 | ✓ |
| 7 | enabled+busy=false — expired idle | ✓ |
| 8 | shouldTransitionToSkipped: waiting+expired→true · idle→false · not-expired→false · null→false | ✓ |

### 선택지

**A. 서버에 skip 즉시 반영 추가**  
고객 iPad Skip 버튼 → `DELETE /admin/pos/orders/:id/checkout-snapshot` 즉시 호출(또는 전용 PATCH).  
`snapshot_state='expired'` → POS 10s 이내 감지 → 60s 전에 "Skipped" 표시.  
필요: 서버 or 고객 앱 확인·수정.

**B. 현재대로 timeout 으로 단일 처리**  
`shouldTransitionToSkipped` 로직 제거. 60s 무응답 = "No response" 하나로 통일.  
Skip과 timeout 구분 불필요하다면 코드 단순화. 서버 변경 없음.

---

## #196 — M1-1119-A 반영 (catch invalidate 제거 + 영어 토스트 + prettier) : **APPROVE**

### REQ 2 · 세 가지 확인

**① catch 에서 invalidate 제거 후 성공 경로 여전히 invalidate 하는가?**

```ts
try {
  await nextCustomer(sessionId);
  setPosScreenHint(null);
  if (clearCart) {
    cancelDraftOrder.mutate();                                          // ← mutation onSuccess에서 처리
  } else {
    queryClient.invalidateQueries({ queryKey: ['draft-order'], exact: false }); // ← ✓ 성공 시 invalidate 유지
  }
} catch {
  showToast.error("Couldn't reach server — previous customer cleared on this device"); // invalidate 없음 ✓
}
```

성공 경로 `invalidateQueries` 유지 ✓ · catch 에서 제거 ✓ → 서버 실패 시 refetch로 이전 손님 복원 차단됨.

**② products.tsx prettier 들여쓰기 동작 변경 0인가?**

변경 전: `<Layout>...</Layout>` (최상위)  
변경 후: `<><Layout>...</Layout><Prompt/></>` (Fragment 래핑 후 2칸 들여쓰기)

JSX 들여쓰기만 변경. 렌더 트리 구조는 동일. `<Prompt>` 컴포넌트는 M1-1118-N 커밋에서 이미 추가된 것. **동작 변경 없음** ✓.

**③ 영어 토스트 반영**

Before: `'Next customer failed'` (에러 메시지 포함)  
After: `"Couldn't reach server — previous customer cleared on this device"` ✓

### Unit 10/10 직접 확인

| # | it | 판단 |
|---|---|---|
| 1 | customer·customer_id·email → null/undefined | ✓ |
| 2 | items·total 등 다른 필드 보존 | ✓ |
| 3 | draft_order null → 원본 그대로 | ✓ |
| 4 | old null → null | ✓ |
| 5 | old undefined → null | ✓ |
| 6 | cleared 결과 customer 참조 없음 (단방향) | ✓ |
| 7 | invalidateQueries 없으면 cleared 캐시 유지 (refetch 불변성) | ✓ |
| 8 | requiresCartConfirmation(0) → false | ✓ |
| 9 | requiresCartConfirmation(1) → true | ✓ |
| 10 | requiresCartConfirmation(5) → true | ✓ |

---

## CI 체크 요약

| Check | #195 | #196 | master |
|-------|------|------|--------|
| flow-tests | **pass** | **pass** | fail(내포) |
| assertions | fail 11건 | fail 11건 | fail 11건 |
| lint | fail | fail | fail |
| playwright | skipping | skipping | — |

assertions 실패 파일: `m0-1103-c · m0-1105-at · m2-1105-ar · m3-1105-aj/al/am/an/ar/ax · m3-1105-c-english · m3-1105-d` — master와 완전 동일 (기존 11건). PR 신규 실패 없음 ✓.
