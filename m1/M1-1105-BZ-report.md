# M1-1105-BZ 완료 — loyalty-phase1-plan.md Q4 확정 반영 · #254 HEAD 377b0b4

## 변경 내용

- **개정 이력 3줄** 문서 상단 추가
- **§1 와이어프레임** — 영수증 줄 순서: Subtotal → PB1 → Total → Store credit −X → Cash/QRIS → Credit earned +Y → Credit balance Z
- **§3 엔드포인트** — `loyalty_use` 역할: "결제수단(tender) · grand_total 에서 직접 차감 · 세금 보존" 으로 재정의
- **§4 Admin 표** — `tax_mode` 신규 키 추가 (`"payment"` 기본 · `"discount"` = Admin 경고) · `earn_base` 기본값 `"subtotal"` → `"paid_non_credit"` · 계산 공식 갱신
- **§5 R5** — "선할인" → "결제수단(tender) · 잔액 lock · 결제 실패 역상쇄" 재정의
- **§5 R6** — 환불: 적립금으로 낸 몫 → 적립금 복원(원 결제수단 원칙) 명시
- **§5 R2** — 실기 시점 "Q4 확정 — 바로 착수 가능" 으로 갱신
- **§6 Q4** — 상태 "대기" → "확정" · 세법 근거(Bapenda PBJT · PP 35/2023 Ps.19(2)) 반영

브랜치: `docs/m1-1105-by-loyalty-phase1-plan` · PR #254
