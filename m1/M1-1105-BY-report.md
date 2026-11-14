# M1-1105-BY 리포트

storeport PR #254 (draft) — `docs/plans/loyalty-phase1-plan.md` 신설 완료.

## 열린 질문 (Kyu 결정만)

| # | 질문 | 권장안 | 상태 |
|---|------|--------|------|
| Q4 | 적립금 사용 시 PB1(서비스세) 계산 순서 — 세전 공제 vs 세후 공제? | **세후 공제** (grand_total 아래 차감 · 과세 베이스 보존 · 세무 안전) | **대기** |

## 주요 확정 사항 (기술 선택 모두 닫음)

- 실시간 전달 = **폴링 10s** (기존 QRIS `setInterval` 패턴 재사용, SSE/WS Phase 2 이후)
- 손님용 앱 = **별도 Expo 앱** (`id.meros.loyalty-display`, pos-m1 패턴 참조)
- Medusa customer 이메일 없이 생성 **가능** (`email: NullableModifier<string>` 확인, `@medusajs/customer@2.17.2`)
- Admin `GET /admin/customers?phone=` v2.17.2 미지원 → `customerModule.listCustomers({ metadata: { phone_e164 } })` 직접 조회로 대응
- 소멸 = **365일** (Kyu 확정), 적립 기준 = **subtotal (할인 후 세전)**, 반올림 = **floor**

## 다음 단계

Q4 Kyu 결정 → R1(플러그인 설치 실측) 착수.
