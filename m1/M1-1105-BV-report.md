# M1-1105-BV 완료 — 매장 투입 준비 점검표 21항목 작성, 최소 장사 가능 조건 7단계 도출

PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/133 (base master · docs-only)

## 최소 장사 가능 조건
1. EAS dev 빌드 → iPad 설치 (`eas build --profile development --platform ios`)
2. Admin UI에서 숲속 스위츠 메뉴(상품·가격) 입력
3. 직원 계정 생성 (Admin UI → Users → Invite)
4. 매니저 PIN 설정 (Admin UI → POS Settings → 4자리)
5. 레지스터 시재 열기 (opening_float 입력 → Open Register)
6. 현금 결제 + 영수증 PNG 공유 (WhatsApp/카카오 가능)
7. 종료 시 counted_cash 입력 → Close → Z-Report 보관
