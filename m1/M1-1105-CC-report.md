# M1-1105-CC 완료

§5-2 2027 이슬람력 3종 계산·반영 · §6-3 손님 앱 위치 확정(storeport `apps/customer-display`) · §8 POS 경로 정정 · server-contract §4·§5 2줄 보강.

## PR
- fork #139 `customer-display-plan.md`: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/139
- storeport #260 `customer-display-server-contract.md`: https://github.com/CuriocityDevAi/storeport/pull/260

## 변경 내용

### REQ 1 — §5-2 2027 이슬람력
- 표 헤더: "2026 예상(참고)" → "2027 예상(참고)"
- Ramadan 시작: 2026-02-18 → **2027-02-08** (1448 AH 9월 1일)
- Lebaran (1 Syawal): 2026-03-20 → **2027-03-09** (1448 AH 10월 1일)
- Maulid Nabi: 2026-09-10 → **2027-08-14** (1449 AH 3월 12일)
- 근거 1줄 추가: `Intl.DateTimeFormat('en-u-ca-islamic-umalqura')` 직접 계산
- 정부 발표 ±1~2일 문구 유지

### REQ 2 — 손님 앱 위치 확정
- §6-3 신설: storeport `apps/customer-display` (Expo · pnpm workspace) · 이유 3줄 · EAS 설정
- §8 POS 라운드 경로: `apps/pos/screens/checkout/` → `app/checkout/` · `components/payment/` (fork 루트 기준)

### REQ 3 — server-contract 보강
- §4: `needs_post_payment_earn` = POS UI 힌트 전용 · POS 별도 적립 호출 금지 1줄
- §5 S1b: R3(#258) 먼저 머지 → S1b 단일 가드 교체 · 과도기 공존 명시 1줄
