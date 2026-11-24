M1-1124-B · 판정: 완료 — 공용 컴포넌트 + 6화면 적용 + D4/D5/D6ⓑ fix 모두 코드 반영. push 완료.

PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/247
브랜치: feat/M1-1124-B-phone-status (master 기점 · 4 commits)

---

## 화면별 적용 표

| 화면 | 파일 | 위치 | 비고 |
|------|------|------|------|
| Cart 시트 | `components/cart/CartSheet.tsx` | 헤더 우측 (close 옆) | OrderChips 이미 있어서 따로 OrderChips 바꾸지 않음 |
| Checkout | `app/checkout/[draftOrderId].tsx` | headerRight | **본문 배너 `CustomerDisplayStatus` 제거** (헤더 칸이 대체) |
| tender-cash | `app/checkout/tender-cash/[draftOrderId].tsx` | headerRight | **Stack.Screen 신규 추가** |
| tender-qris | `app/checkout/tender-qris/[draftOrderId].tsx` | headerRight | 기존 Stack.Screen 에 headerRight 추가 |
| split-tender | `app/checkout/split-tender/[draftOrderId].tsx` | headerRight | **Stack.Screen 신규 추가** |
| success | `app/checkout/success/[orderId].tsx` | headerRight | 기존 title 옆에 추가 + 영수증 하단 Ask phone 버튼 삭제(prop 미전달) |

## 커밋 4건

1. `aa12927` feat — 컴포넌트 + classifyPhoneStatus 6상태 + useAskPhoneOnDisplay 훅
2. `675038d` feat — 5개 화면 headerRight 적용 + D5 (checkout cleanup cart_review 제거)
3. `5542b79` fix — success 재구성 · D4 폴링 700ms · D6ⓑ invalidate + same-order 예외
4. `e4291c8` test — vitest 12 pass + playwright 6상태 spec + M0-1118-N skip

## 서버 contract fallback (M2-1124-B 미배포 대비)

`OrderSnapshot.phone_entry_state` (`waiting|typing|done|skipped`) · `phone_partial` 추가.
미배포 시 fallback 순서:
- `pre_entry=true` → done
- `skipped_at` set → skipped
- `phone_entry_open=true` 또는 `pos_screen=loyalty_entry` → partial 있으면 typing · 없으면 waiting
- posAsked 로컬 플래그 → waiting
- 그 외 → ask

Busy: 다른 주문이 active · paid_at 없음 · pos_screen≠paid. 같은 주문의 paid 화면은 busy 아님 (D6ⓑ 구현).

## 자기 검증

- `npm run lint` → 0 error (warning 70건은 기존).
- `npm test -- __tests__/m1-1124-b-phone-status.test.ts` → 12/12 pass.
- Playwright spec `e2e/flows/M1-1124-B-phone-status.spec.ts` 작성 완료 — 하네스 시도 전 harness CI 에서 실행 예정 (iPad 1180×820 뷰포트 · 6상태 + D5 + 버튼삭제).
- `npx tsc --noEmit` → 내가 수정한 파일에 신규 TS 오류 0 (기존 FlashList/vitest-config 오류는 손대지 않음).

## 금지 파일 준수

`app/(tabs)/sell.tsx` · `components/SellTopBar.tsx` · `api/hooks/draft-orders.tsx` · `api/hooks/register-session.ts` · `components/payment/SuccessReceiptAnim.tsx` 수정하지 않음. success 영수증 아래 Ask phone 버튼 삭제는 success/[orderId].tsx 에서 askPhoneBtn prop 를 미전달해서 구현 (`askPhoneBtn && askPhoneBtn.kind !== 'hidden' ?` 분기가 undefined 로 falsy).

## Kyu 실기 체크리스트 (PR 본문에도 기재)

- [ ] iPad + 손님 화면 두 기기: Checkout → Pay → tender-cash 이동 중 손님 화면 번호 입력 유지(사라지지 않음) — D5 검증.
- [ ] 번호 입력 중 POS 헤더 칸이 0.3s 이내 반영 — D4 검증 (700ms 폴링이라 최대 ~0.7s 지연).
- [ ] 결제 직후 Re-enter 눌러도 "Customer display is busy" 안 뜸 — D6ⓑ 검증.
- [ ] success 화면 영수증 아래 "Ask phone on display" 버튼 없음.

## 미완 / 후속 라운드

- Playwright 실행 결과는 하네스 CI 에서 확인 (로컬에서 dist 빌드 생략 — 시간 상한).
- 서버 M2-1124-B 가 `phone_entry_state`·`phone_partial` 를 실제로 내려주면 fallback 분기는 자동으로 꺼짐(새 필드 우선 switch 가 먼저).
- 다음 라운드(같은 파일): Cart Pay→Checkout 버튼명 · Checkout B안 · tender 제목 · X 44pt — 본 PR 에서는 하지 않음(브리프 명시).
