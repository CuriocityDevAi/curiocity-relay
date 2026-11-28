# R0-1128-H 리뷰 보고서

## 판정 요약

| PR | 판정 | byte-diff |
|---|---|---|
| fork#292 (M1-1128-H 프린터 체계) | **CHANGES** (CI 2종 실패 · 필수 수정 4건) | 0 ✅ |
| relay#82 (M1-1128-E 사용량 한도) | **APPROVE** | — |
| fork#301 (M3-1128-K text node) | **APPROVE** | — |

---

## fork#292 — CHANGES

### byte-diff 직접 확인

- `pos-m1` worktree (head 4ebb006) 에서 직접 실행
- `m2-1105-m-receipt-escpos-assertions.mjs` → **45/45 PASS**
- `m1-1127-m-receipt-lines-sync.test.ts` → **11/11 PASS** (GitHub raw fallback · storeport@2c6b08e5 vendored 5파일 sha256 일치)
- storeport `receipt-escpos-printer-*.txt` 5종 구조 대조: Queue #N · Order #N · Rp 포맷 일치 ✅
- `forkReceiptToArgs` adapter: `order_display_id: snap.order_display_id ?? null` · `pos_order_num` 분리 ✅
- 손님 화면 영수증: `lib/receipt-lines` 임포트 UI 컴포넌트 없음 — printer 경로만 사용 ✅

**byte-diff = 0**

### CI 실패 원인 (필수 수정 4건)

1. **lint error** (`components/cart/CartPanel.tsx` L60): prettier/prettier — `LineItemType` 타입 정의 leading `|` 형식 불일치
2. **prettier error** (`lib/printer/receipt-escpos.ts`): `m0-1105-at` assertion `prettier --check` 실패
3. **`scripts/m1-1105-av-assertions.mjs` 갱신 누락**: IDR 포맷 기대 → Rp 포맷으로 갱신 필요 (CI 18/34 → 16 failed)
4. **`scripts/m3-1105-af-assertions.mjs` 갱신 누락**: IDR 포맷 기대 → Rp 포맷으로 갱신 필요 (CI 25/30 → 5 failed)

PR 코멘트 첨부 완료.

---

## relay#82 — APPROVE

### R0-1128-F 필수 반영 확인

- **resets_at ISO 변환 ✅**: `parseResetsAt("Nov 30 at 9am", "(Asia/Jakarta)")` → `"2026-11-30T02:00:00.000Z"` · `checkRunnerPauseExpiry` 자동 해제 정상 동작
- **AND 조건 ✅**: `HIT_LIMIT_RE && RATE_LIMIT_OPTIONS_RE` 적용 · `/rate-limit-options` 단독 오판 방지
- **자동 해제 ✅**: `Date.now() >= Date.parse(p.resets_at)` 조건으로 경과 시 자동 삭제

### 테스트 직접 실행 로그

```
node --test scripts/test/hub-runner-usage-limit.test.mjs
# tests 10 / pass 10 / fail 0
```

(fixture: M0/M2/M3 로그 3건 + 오판 방지 4건 + 변조 미감지 2건 + 경과 판정 1건)

기존 리뷰 스레드 `PRRT_kwDOTvdbA869AsBo` (CHANGES-필수 · 선택) → **resolve** 완료.

---

## fork#301 — APPROVE

- v1.3 busy L192 · v1.4 confirming L301 각각 template literal 단일 표현식으로 통합 ✅
- 렌더 텍스트 동일 · "Unexpected text node" 예방만 ✅
- CI all green (lint · assertions · unit-tests · playwright) ✅
- `m3-1128-k-text-node-cd-preview.test.ts` 3건: 수정 전 패턴 미존재 + 수정 후 패턴 존재 + grep 가드 ✅
