# R0-1116-X 리포트

**#314 C(시점·색) · #313 A(merge-order 주의) · 두 PR 충돌: snapshot-earn.ts 양쪽 추가 — #313 먼저 머지 후 #314 rebase 필요**

---

## #314 — M3-1116-N (CHANGES · 블로커 2건)

### B1 · 시점 블로커 ✅ 확정

`startSnapshotForRegister()` 가 `tenders/route.ts` cash/card (line 1155+) · QRIS (line 1026+) 양쪽 모두에서 tenders POST 시점에만 호출됨.

**Kyu 기대 vs 실제**:
- 기대: `app/checkout/[draftOrderId].tsx` 렌더 시점(결제 수단 고르는 동안) 손님 화면에 품목·금액 표시.
- 실제: Checkout 화면에 있는 동안 snapshot 없음 → 손님 화면 대기화면 고착 → tenders POST 직전에야 ~1초 표시.

fork `app/checkout/[draftOrderId].tsx` 확인: 화면 진입 시 snapshot 관련 API 호출 없음. 원장 대사 "add to cart > checkout 을 했는데, HP Point 화면에 품목과 금액이 안뜨고 그냥 대기화면" 과 완전히 일치하는 버그 — tenders 호출 이전 시점이 무제.

**수정 방향**:
- Checkout 진입 시 snapshot 생성 (fork useEffect 또는 checkout 전용 서버 엔드포인트).
- tenders: 기존 snapshot 있으면 skip/upsert, 없으면(레거시) 신규 생성.
- 장바구니 변경 시 갱신 고려.

#295 근거 확인: PR #295 (M2-1116-G, merged) — customer-display 실서버 연결 구현. "POS에서 주문 시작하면 Cart 화면 자동 전환" 의도이나 POS 쪽 snapshot 생성 호출 지점은 명시되지 않음. M3-1116-N 이 처음으로 `startSnapshotForRegister()` 를 호출한 PR이지만 tenders 시점은 Kyu 기대와 불일치 → **CHANGES 블로커**.

### B2 · 색 토큰 위반 ✅ 확정

`apps/customer-display/app/index.tsx` `liveStyles`:
```ts
connDotOk: { backgroundColor: "#22c55e" }
connDotErr: { backgroundColor: "#f59e0b" }
```

`apps/customer-display/src/theme/tokens.ts` 최상단 주석:
> "Screen code MUST only reference these token names — never raw hex strings."

`ThemeTokens` 에 연결 상태 표시용 항목 없음. `statusOk`/`statusWarn` 을 `tokens.ts` 또는 `system-colors.ts` 에 named constant 로 추가 후 참조 필요 → **CHANGES 블로커**.

### Non-blocking
- `pollErrorCount` 외부 노출 ✅ · 통합 테스트 3케이스 구조 ✅.
- ci-summary 미게시 (GitHub API 403, PR 생성 직후 pending).

---

## #313 — M0-1116-M (APPROVE · 머지 순서 필수)

### REQ 체크

| 항목 | 판정 |
|------|------|
| 예고 = 실제 같은 함수(`previewReceipt`) | ✅ — `computeEarnPreviewForTotals` → `previewReceipt` 경유. 테스트에서 직접 호출 결과와 1:1 비교 |
| `paid_non_credit` / `paid_non_credit_pre_tax` 두 설정 | ✅ — 세후 990 · 세전 900 모두 테스트 통과 |
| POS 가 보낸 loyalty 필드 보존 | ✅ — `phone_masked · balance · use_amount · available_use` 보존, `earn_preview` 만 override |
| 할인·적립금 사용 시 예고값 | ✅ — `discount_total` 반영 테스트 `(20,000 - 10,000) × 9% = 900` 확인. `credit_requested=0` 디폴트(예고 단계에선 적립금 사용 여부 미확정 — 올바른 동작) |

### #314 와 snapshot 라우트 충돌

두 PR 모두 `main @ 58c48a7` 베이스에서 아래 파일들을 **동일 내용** 으로 추가·수정:
- 신규: `snapshot-earn.ts` (hash `ea3f0d42`) · `snapshot-earn.unit.spec.ts`
- 수정 5개: `customer-display/snapshots/{active,[id]}/route.ts` · `registers/[id]/snapshot/route.ts` · `loyalty/sessions/snapshots/{active,[id]}/route.ts`

독립 머지 시 나중 PR 에서 "both added" conflict 발생 → **merge-tree 무충돌 아님**.

**올바른 순서**: #313 먼저 머지 → #314 브랜치 rebase → 충돌 없이 diff 4개 파일로 축소.

### ci-summary
미게시 (GitHub API 403, pending).

---

## 착지 명령
