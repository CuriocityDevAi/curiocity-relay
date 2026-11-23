#228: CHANGES

브랜치: `feat/M3-1123-A-sell-chips` @ `25c0151`  
PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/228  
검증일: 2026-11-23

---

## 실행 로그

### vitest
```
Test Files  15 failed | 120 passed (135)  — 15 fail 모두 .claude/worktrees/ pre-existing
Tests       1528 passed | 12 expected fail | 5 todo (1545)
M3 전용 (m3-1123-a-order-chips.test.ts): 16/16 passed (기존 12 + C2 신규 4)
```

### tsc --noEmit
```
28 errors — 모두 pre-existing (Expo Router 경로 타입 · FlashList · use-network-status)
M3-1123-B 변경 파일 신규 에러: 0건
```

### eslint (M3-1123-B 변경 파일)
```
api/hooks/draft-orders.tsx:321   error  prettier/prettier  (신규 C4)
components/order-chips/OrderChips.tsx:60  error  prettier/prettier  (신규 C5)
api/hooks/draft-orders.tsx:7     warning  no-unused-vars  (pre-existing)
✖ 2 errors (신규) · 1 warning (pre-existing)
```

### expo export -p web
```
Exported: dist/   ← 성공 (upng-js · pako npm install 적용됨)
```

### Playwright (3뷰포트)
```
1194×834  ✓  chips at x=795 y=64 w=399
834×1194  ✓  chips at x=435 y=64 w=399
390×844   ✓  chips at x=0   y=64 w=390
3 passed (11.7s)
```

---

## 스크린샷 경로

- `e2e/screenshots/M3-1123-B-chips-1194w.png`
- `e2e/screenshots/M3-1123-B-chips-834w.png`
- `e2e/screenshots/M3-1123-B-chips-390w.png`

---

## REQ 체크 결과

| # | 항목 | 판정 |
|---|------|------|
| C1 | 재시작 대기 카트 복원 (`restoreWaitingDraftOrders`) | ✅ `api/hooks/draft-orders.tsx:292` |
| C2 | no_phone 2분 후 제외 (`paidAt` + 필터) | ✅ `components/order-chips/types.ts:18` |
| C3 | Enter phone here instead → orderId 명시 전달 | ✅ `components/order-chips/OrderChipDetail.tsx:59` |
| 연결1 | phone_entry_open → 노란 칩 / waiting 폴백 | ✅ `components/order-chips/OrderChips.tsx:57-61` + `lib/loyalty-snapshot.ts:22,24` |
| 연결2 | link-phone order_id · 409 order_mismatch 토스트 | ✅ `app/customer-lookup.tsx:326-341` |
| 웹빌드 | expo export -p web | ✅ dist/ 성공 |
| Playwright | 3뷰포트 (1194×834 · 834×1194 · 390×844) | ✅ 3/3 |
| cd-preview 충돌 | #229 머지 후 merge-tree | ✅ 충돌 없음 (clean) |
| Mergeable | PR 상태 | ✅ MERGEABLE |

---

## CHANGES 목록

**C4** `api/hooks/draft-orders.tsx:321` — Prettier 포맷 오류 (신규 · M3-1123-B 도입)  
`as { draft_orders: ... }` 인라인 타입 캐스트 형식이 Prettier 규칙 불일치.  
수정: `npx eslint --fix api/hooks/draft-orders.tsx`

**C5** `components/order-chips/OrderChips.tsx:60` — Prettier 포맷 오류 (신규 · M3-1123-B 도입)  
`phoneEntryOrderId` 선언 개행 분리 → Prettier 는 한 줄 요구.  
수정: `npx eslint --fix components/order-chips/OrderChips.tsx`

---

## 비고

- #228 GitHub 리뷰: COMMENT 제출 (자기 PR → REQUEST_CHANGES 불가 → COMMENT 대체)
- 실기(iPad) 회귀: 미검증 (Kyu 대기)
- 연결1 storeport PR #413 미머지 시 `phone_entry_open=undefined` → waiting 폴백 하위호환 적용됨 확인
