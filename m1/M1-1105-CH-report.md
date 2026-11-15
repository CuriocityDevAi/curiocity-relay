# M1-1105-CH 리포트

## 결과
PR #140 머지 대기: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/140

## 확인(실기) 항목
아이패드에서:
1. 결제 완료 → 성공 화면 → **"Link customer"** 버튼(outline) 표시 → 탭
2. 하단 시트: "Link customer" 타이틀 · "08xx-xxxx-xxxx" placeholder 입력창 · 동의 체크박스
3. 전화번호 10자리 이상 + 동의 체크 → "Link" 버튼(검정) 활성화 → 탭
4. 성공: `0812-****-7890` 마스킹 번호 + `Rp X,XXX` 잔액 표시 + "Done" 버튼
5. 409 창 밖 → "This order's linking window has closed. A newer order already exists on this register."
6. 400 → 서버 message 그대로(예: "phone must start with 0, 62, or +62")

## 기계 판정 항목
- vitest 23 files · 252 passed | 6 expected fail | 2 todo — 전부 통과 (loyalty-link.test.ts 13건 포함)

## 건드린 파일
| 파일 | 변경 |
|---|---|
| `lib/loyalty-link.ts` | NEW — buildLinkCustomerBody · mapLinkCustomerError · formatIDRBalance |
| `api/hooks/pos-loyalty.ts` | NEW — useLinkCustomer mutation |
| `components/loyalty/LinkCustomerSheet.tsx` | NEW — 번호입력 시트 |
| `components/payment/SuccessReceiptAnim.tsx` | MOD — onLinkCustomer prop + 버튼 1줄 |
| `app/checkout/success/[orderId].tsx` | MOD — linkSheetVisible state + LinkCustomerSheet 렌더링 |
| `__tests__/loyalty-link.test.ts` | NEW — vitest 13건 |

## 미검증
- 아이패드 실기 (서버 미연결 환경)
- 409 link_window_closed 실제 발생 케이스

## 이연 항목
없음.
