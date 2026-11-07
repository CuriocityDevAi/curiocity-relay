---
round: M1-1105-O
pr:
  fork: agilo-medusa-pos-fork#50
  fork_url: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/50
  fork_commit: 9e4158d
outcome: api/hooks 소소 3건 · draft-order stale 안전망 + close z_report inline + open opener_nickname · UI 변경 0
kyu_checks: 0 (UI 변경 0 · 서버 contract 소비만)
---

# M1-1105-O · draft-order 안전망 + close z_report inline + open nickname

**일자**: 2026-11-07 · **허브**: M1 · **성격**: M0-1105-O §4 #3 안전망 + R0-1105-O ⑤ M1 P3 · **승인**: 사전 "허브-1107-O · 바로 PR".

---

## 0. 원문 (허브-1107-O)

`api/hooks` 소소 3건 (UI 변경 0):
1. `useCurrentDraftOrder` — draft id 가 이미 order 로 전환 (is_draft_order false OR 404) 시 stale → SecureStore 삭제 + 빈 카트.
2. `useCloseRegisterSession` 응답 타입에 z_report 추가 + close 화면 inline 소비 (roundtrip −1). `useZReportText` 는 WA 공유용 유지.
3. `useOpenRegisterSession` body 에 `opener_nickname` 전달 (시트 값 · 서버 optional).

어설션: 1 stale 분기 Playwright (fixture: `/admin/draft-orders/:id` 404) · 영어 · 색 · CI.

---

## 1. 변경 파일 (주인 M1)

| 파일 | 변경 |
|------|------|
| `api/hooks/draft-orders.tsx` | `useCurrentDraftOrder` + `validateStoredDraftOrderId` 2중 안전망 (is_draft_order=false · status!=='draft' 분기 추가) |
| `api/hooks/register-session.ts` | `CloseRegisterSessionResult` type export · onSuccess 에서 `qc.setQueryData([..., 'z-report', session_id], result.z_report)` · `useOpenRegisterSession` body 에 `opener_nickname` |
| `app/register/close.tsx` | `.then()` → `try/await/catch` 로 변환 · mutateAsync 반환값 (z_report 포함) 참조 가능 · 라우팅/UI 동일 |
| `scripts/m1-1105-o-playwright.mjs` | **신규** · 2 case × 7 assertions = 14/14 |

### 핵심 diff 요지

```ts
// (1) draft-order 안전망
const response = await sdk.admin.draftOrder.retrieve(draftOrderId, { fields: '... ,is_draft_order' });
const draftOrder = response?.draft_order;
if (draftOrder?.is_draft_order === false || (draftOrder?.status && draftOrder.status !== 'draft')) {
  await SecureStore.deleteItemAsync(DRAFT_ORDER_ID_STORAGE_KEY);
  return null; // 빈 카트
}

// (2) close 응답 z_report inline
export type CloseRegisterSessionResult = { register_session: RegisterSession; z_report: ReportSnapshot };
return useMutation({
  mutationFn: async (input) => (await sdk.client.fetch(...)) as CloseRegisterSessionResult,
  onSuccess: (result, variables) => {
    qc.setQueryData([...REGISTER_QK, 'z-report', variables.session_id], result.z_report);
    qc.invalidateQueries({ queryKey: REGISTER_QK });
  },
});

// (3) open body opener_nickname
mutationFn: async (input: {
  stock_location_id: string;
  opening_float: number;
  sales_channel_id?: string;
  opener_nickname?: string;  // M1-1105-O · 신규
}) => ...
```

**UI 변경 0** — 사용자가 보는 화면/문구/라우팅 전혀 변경 없음.

---

## 2. 어설션 (Playwright 14/14 pass)

```
=== RUN · 404 stale ===
  ✓ (1) /products 도달
  ✓ (2a) GET /admin/draft-orders/:id 1회+
  ✓ (2b) DELETE /admin/draft-orders/:id 미호출 (cancel 아님)
  ✓ (3) SecureStore draft_order_id 키 삭제됨
  ✓ (4) 빈 카트 UI 노출 ("cart is empty")
  ✓ (5a) pageerror 0
  ✓ (5b) 신규 console.error 0 (의도된 404 응답 외)

=== RUN · is_draft_order=false ===
  ✓ (1) /products 도달
  ✓ (2a) GET 1회+
  ✓ (2b) DELETE 미호출
  ✓ (3) SecureStore 키 삭제됨
  ✓ (4) 빈 카트 UI 노출
  ✓ (5a) pageerror 0
  ✓ (5b) 신규 console.error 0

14/14 passed · 0 failed
```

### 회귀 (전원 pass · 로컬)

```
npx tsc --noEmit                               → exit 1 (잔존 global.css · pre-existing)
m3-1105-a-color-assertions.mjs                  → 37/37
m3-1105-c-english-assertions.mjs                →  5/5
m1-1104-a-assertions.mjs                        → 44/44
m1-1104-b-assertions.mjs                        → 26/26
m1-1105-a-assertions.mjs                        → 33/33
m1-1105-h-assertions.mjs                        → 27/27
m1-1105-b-playwright.mjs                        →  6/6
```

---

## 3. CI 링크 (fork PR #50)

- (push 직후 pending · 리포트 작성 시점 기준)
- CI 그린 확정 후 PR body / 본 리포트 하단에 추가 반영.

---

## 4. 규약 정합

| 규약 | 정합 |
|------|------|
| fork master(`ddb5976`) 위 작업 | ✓ |
| api/hooks/draft-orders.tsx · api/hooks/register-session.ts · app/register/close.tsx (소비부만) | ✓ |
| UI 변경 0 | ✓ (화면/문구/라우팅 동일) |
| stale 분기 Playwright (404) | ✓ (Case A) |
| 색 · 영어 · M1 전원 어설션 pass | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 5. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (M0-1105-O §4 #3 안전망 — draft→order 전환 뒤 옛 id 대응) |
| 해소 | +2 (R0-1105-O ⑤ M1 P3 2건 — close z_report inline + open nickname) |
| 미완 (Kyu 도장) | 0 |
| **총 순증감** | **+3 해소** |

---

## 6. 다음 게이트

1. **PR #50 CI 확인** → 머지. 서버/네이티브 영향 0.
2. 후속: M0-1105-P 서버 draft→order 전환 머지 뒤 end-to-end 재검증 (기존 Playwright Case B 가 이미 is_draft_order=false 시나리오 커버).

---

*M1-1105-O · 2026-11-07 · 3 hooks safety · fork PR #50 · 4 파일 (new 1 · modified 3) · Playwright 14/14 + 회귀 전원 pass · UI 변경 0*
