# M2-1116-S 착지 보고

PR #155 · 숫자패드 적용 7곳 · 시스템 키보드 비활성 확인(showSoftInputOnFocus/TextInput 제거).

## 적용 목록

| 위치 | 입력 | 방식 |
|---|---|---|
| `components/loyalty/LinkCustomerSheet.tsx` | 전화번호 (최대 13자리) | TextInput 제거 → 포맷표시(0813-xxxx-xxxx) + NumericKeypad |
| `components/payment/CashTenderPanel.tsx` | 현금 금액 | TextInput 제거 → NumericKeypad (00 단축키) |
| `components/payment/CardTenderPanel.tsx` | 승인번호(6) + 끝4자리(4) | TextInput 제거 → 활성필드 공유 NumericKeypad, 6자리→last4 자동전환 |
| `components/orders/VoidRefundSheet.tsx` | 승인번호(6) | TextInput 제거 → NumericKeypad |
| `app/(tabs)/orders.tsx` | 재시도 승인번호(6) | TextInput 제거 → NumericKeypad |
| `app/checkout/split-tender/[draftOrderId].tsx` | 1차 금액 | TextInput 제거 → NumericKeypad (00 단축키) |
| `components/ui/QuantityPicker.tsx` | 수량 | showSoftInputOnFocus=false (+/- 버튼 주 입력) |

## 신규 파일

- `components/ui/NumericKeypad.tsx` — 3열 1-2-3/4-5-6/7-8-9/[X]-0-⌫, 길게⌫=전체삭제
- `__tests__/numeric-keypad.test.ts` — 16개 단위 테스트 (전화번호 포맷, 입력/삭제/초기화, 승인번호 흐름)

## 검증

- 기존 테스트 351개 통과
- 신규 테스트 16개 통과
- TS 에러: 수정 파일 내 신규 에러 없음 (기존 route type 에러와 무관)
- 웹/시뮬레이터 직접 확인: 미검증 (dev client 필요)

## #154 회귀 여부

LinkCustomerSheet 의 TextInput(시스템 키보드) 완전 제거 → useKeyboard(BottomSheet 내부) 가 발화하지 않음 → 동의 체크박스 탭 시 시트 크기 변화 구조적 불가. #154 회귀 없음.
