PASS — M3-1125-C · 2a/2b 코어는 #247 에 이미 반영됨 (재검증 pass) · 대사의 "긴 Order 번호는 영수증·주문 상세에만" 완전 적용(2 화면 헤더 타이틀) 만 본 PR 로 추가.

# 결과
- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/255 (open · 자기 머지 금지 · 러너가 Kyu 확인 후 처리)
- 브랜치: `feat/M3-1125-C-phone-status-header` (master origin → 1 commit: `7ecb239`)
- 리포(`agilo-medusa-pos-fork`) · POS 레포 수정만 · 서버·storeport 수정 없음
- 6 상태 스샷: 이 디렉토리에 ask / waiting / typing / done / skipped / busy 복제됨

# 2a · 2b 체크리스트 (대사 decision-pos-ui-approval-20261124 + decision-pos-phone-status-20261124 원문 1·3·8·9)

| # | 대사 항목 | 상태 | 근거 |
|---|-----------|------|------|
| 2a-① | 헤더 우측 6상태 공용 칸 (ask/waiting/typing/done/skipped/busy) | ✅ 완료 (#247) | `components/customer-display/CustomerPhoneStatus.tsx` · 6 화면 headerRight 배치 |
| 2a-② | Cart·Checkout·tender-cash·tender-qris·split-tender·success 공통 | ✅ 완료 (#247) | 6 파일 grep 확인 · playwright 6 상태 pass |
| 2a-③ | 영수증 아래 "Ask phone on display" 버튼 삭제 | ✅ 완료 (#247) | `success/[orderId].tsx` `askPhoneBtn` prop 미전달 · playwright 어설션 ask-phone-on-display 0 |
| 2a-④ | 긴 Order 번호는 영수증·주문 상세에만 (헤더 타이틀 아님) | ✅ 본 PR | `tender-qris` → 'QRIS payment' · `success` → 'Payment successful' |
| 2b-① | 번호 입력 POS 화면 이동·결제 완료와 분리 (손님 OK/Skip 전까지 유지) | ✅ 완료 (#247) | `app/checkout/[draftOrderId].tsx` D5 수정 · playwright cart_review emit 0 |
| 2b-② | "번호 없음" 칩 2 분 후 Orders 로 (§8-③) | ✅ 완료 (M3-1123-B) | `components/order-chips/types.ts:45-50` `TWO_MIN_MS` 필터 |
| 2b-③ | "Customer display is busy" 오판 수정 | ✅ 완료 (#247) | `lib/ask-phone-on-display.ts` `sameOrderPaidScreen` 예외 + success 화면 `invalidateQueries(['customer-display-snapshot'])` |

본 PR 새 변경(2a-④만):
- `app/checkout/tender-qris/[draftOrderId].tsx` · title 고정 'QRIS payment'
- `app/checkout/success/[orderId].tsx` · title 고정 'Payment successful'
- `__tests__/m3-1125-c-title-chip-only.test.ts` · 소스 어설션 2 case (타이틀 패턴)
- `scripts/m1-1105-ao-playwright.mjs` · (SRC3) 기존 `` /`Order #${displayId}/ `` 검사를 'Payment successful' 긍정 + 긴 display_id 패턴 부재 검사로 교체 (어제 #254 교훈)

# 검증 로그 (직접 실행)

## vitest (`npm test`)
```
Test Files  2 failed | 76 passed (78)
Tests       3 failed | 998 passed | 6 expected fail | 3 todo (1010)
Duration    1.89s
```

- **본 PR 신규 테스트**: `__tests__/m3-1125-c-title-chip-only.test.ts` · 2 case pass
- **사전 실패 3 건**(master 와 동일 — 본 PR 과 무관):
  - `__tests__/m2-1119-s-pos-slip-fixes.test.ts` > `success screen headerRight 에 next-customer testID + Next customer 텍스트 존재` — M1-1124-B 이관으로 headerRight 가 `CustomerPhoneStatus` 로 교체되며 Next customer testID 가 더 이상 success headerRight 에 없음(기대값이 옛 상태).
  - `__tests__/m2-1119-s-pos-slip-fixes.test.ts` > `SuccessReceiptAnim 에서 Next customer 버튼 제거됨 (헤더로 이동)` — 동일 이관으로 테스트 전제가 맞지 않음.
  - `__tests__/m3-1119-o-cd-emit.test.ts` > `success/[orderId].tsx revertDisplayToPaid 도 order_id 포함` — `revertDisplayToPaid` 이관 후 단순화.
  - 수정 범위 밖 · 별도 하네스 정비 티켓 권장 (이 PR 로 묶으면 스코프 침범).

## lint (`npm run lint`)
```
✖ 67 problems (0 errors, 67 warnings)
```
0 errors(필수 통과). 경고 67 은 master 동일.

## playwright/assertions (직접 실행)
- `node scripts/m1-1124-b-phone-status-playwright.mjs` → **18 passed · 0 failed** (SRC1·SRC2 + 6상태 + D5(cart_review emit 0) + success(ask-phone-on-display 0))
- `node scripts/m1-1105-ao-playwright.mjs` → **30 passed · 0 failed** (SRC3 교체 어설션 포함)

## 6 상태 스샷
파일: `M1-1124-B-{ask,waiting,typing,done,skipped,busy}.png` — iPad 가로 1194×834.

# Kyu 실기 체크 항목 (PR 본문 동일)
- [ ] Cart·Checkout·tender-cash(Cash)·tender-cash(Card)·tender-qris·split-tender·success 전 화면 headerRight 에 `#N · <status>` 칩 하나만 보임 (다른 손님 입력 중이면 노랑 자물쇠 + `#M entering`).
- [ ] tender-qris 헤더 'QRIS payment' · 긴 Order 번호 미표시 (본문 요약 라인에만).
- [ ] success 헤더 'Payment successful' · 긴 Order 번호 미표시 (`SuccessReceiptAnim` 영수증 · 주문 상세 하단에만).
- [ ] 영수증 아래 "Ask phone on display" 버튼 미존재.
- [ ] 결제 후 손님 화면 미입력 상태에서 "Customer display is busy" 토스트 안 뜸.

# 미완료·주의
- 없음. 2a·2b 전 항목 완료(코어 #247 + 본 PR 2a-④ 폴리싱). 머지는 Kyu 확인 후 러너가 처리.
- 사전 실패 3 건은 별도 티켓(M1-1124-B 이관 수반 테스트 정리) 로 분리 권장.
