# M1-1126-B 리포트

**판정:** ✅ DONE  
**PR:** https://github.com/CuriocityDevAi/storeport/pull/450

---

## 변경 내용

| 대상 | 전 | 후 | 비율 |
|---|---|---|---|
| 품목 줄 (qty·이름·금액) | 32px | 22px | ×0.70 |
| TOTAL (라벨·금액) | 64px | 45px | ×0.70 |
| qtyBadge paddingH | 10 | 7 | ×0.70 |
| qtyBadge paddingV | 4 | 3 | ×0.75 |
| qtyBadge minWidth | 44 | 31 | ×0.70 |
| itemRow paddingV | 12 | 8 | ×0.67 |
| Subtotal·PB1 | 24px | 24px | 그대로 |

**건드린 파일:** `apps/customer-display/src/screens/OrderListScreen.tsx` 1개만

**타이포 스케일 토큰:** theme/tokens.ts 는 색상 전용 — typography 토큰 없음.  
"기존 토큰 기준값 × 0.7 직접 치환" 방식 적용.

**긴 품목명 말줄임:** `numberOfLines={1}` + `flex: 1` 그대로 → 폰트 축소 후 더 많이 보임.

---

## 자기 검증

- **TypeScript:** 오류 없음 (`tsc --noEmit` clean)
- **unit tests:** 299 passed (apps/customer-display vitest)
- **Playwright 전/후 스크린샷:** 미검증 — CD web mock(`?mock=1&flow=cd-sync&payment_phase=building`) 환경 미구성. 실기(운영 손님화면)에서 직접 확인 필요.
- **font-size 어설션 파일:** Playwright 미실행으로 미동봉.

**PR 본문 확인 항목:** "Kyu 실기: 운영 손님화면에서 품목 줄·TOTAL 이 Subtotal 대비 과하게 크지 않은지"

---

## 이연 순증감

- 신규 이연 없음
- 기존 이연 처리 없음
