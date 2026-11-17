#354 APPROVE · 문제 2건 · 신규→코어 대체 가능 0

리뷰어: R0-1117-AS · 2026-11-18
뿌리 원장: `ledger/decision-wing-careagent-20261117.md`

---

## 1. 원장 결정 ↔ 설계서 대사표

| 원장 결정 | 시각 | 설계서 반영 | 판정 |
|---|---|---|---|
| W2 주 유입 = WhatsApp → CareAgent → Wing 링크 | - | §0 한 문장 요약·§1 여정 step 1-2 ✓ | ✅ |
| W3 복잡한 회원가입 금지·구매 단계 최소 | - | F9 phone-id 재사용·6-tap 목표 ✓ | ✅ |
| W4 QRIS = POS payment_xendit 재사용·중복 개발 금지 | - | F8 §8 체크 ✓ | ✅ |
| SA1 공용 정리 먼저 · W5 webhook 분기 직전 R4 | 17:47 | §7 R4 "W5 공용 정리 후속" ✓ | ✅ |
| KD-2 LLM = Claude Haiku 급 (의도 파악 전용) | 17:39 | §6 기술 권장안 ✓ | ✅ |
| KD-3 주문 후 WA 영수증·픽업 안내 자동 발송 | 17:39 | F14 CareAgent attribution ✓ | ✅ |
| CA2 가용성 = 규칙(AI 금지) | 22:59 | §6 "가용성 계산 = 규칙(AI 금지)" ✓ | ✅ |
| CA3 위험한 답 = 사람 중계 | 22:39 | F12/F13 awaiting_human + 매니저 WhatsApp ✓ | ✅ |
| 완제품 = 고정 수량 자동 예약 · 커스텀/레터링만 사람 | 23:33 | F3 auto cap · F12 커스텀 ✓ | ✅ |
| 예약 창 최대 14일 | 23:44 | F4 §8 체크 ✓ | ✅ |
| 대량 기준 = 금액 Rp 1,000,000 이상 (갯수 아님) | 23:44 | F13 §8 체크 ✓ | ✅ |
| 초기값 = MEROS 재고조사 1회 | 23:44 | F3 source enum `initial` + §5.2 caps/bulk API ✓ | ✅ |
| 배송 없음 · 픽업만 | 23:44 | F17 차단 §8 체크 ✓ | ✅ |
| 픽업 시간대 = 3구간 설정값으로 변경 가능 | 22:59 | F5 pickup_window_config §4.2 ✓ | ✅ |
| 취소 마감 = 2일 전 17:00 | 22:59 | F10 §8 체크 ✓ | ✅ |
| 미수령 = 하루 보관 후 폐기 · CareAgent 안내 | 22:59 | F11 no_show_held→disposed + §3.1 ✓ | ✅ |
| 자동 답 승격 = 80% + Kyu 검토 | 22:59 | §6 기술 권장안 ✓ | ✅ |
| 상담 언어 = 손님이 쓴 언어 그대로 | 22:59 | §6 기술 권장안 ✓ | ✅ |
| **브랜드 색 = 아이보리 보라·파랑 (노티드풍 파스텔 2색)** | **23:44** | **설계서 미수록** | **⚠️ 빠짐** |

---

## 2. 불일치 (문제 2건)

### P1 — §3.2 상태 전이도 오류 (§3.2 ASCII)
**현상**: ASCII 다이어그램에서 `cancelled`가 `expired` 아래에 그려져 있어 "`expired → cancelled`" 로 오독됨.  
**실제 의도**: §3.2 주석("cancelled 는 paid 이후에도 마감 전이면 진입 가능")에 따르면 `cancelled`는 `auto_reserved`·`pending_payment`·`paid` 모두에서 진입 가능한 독립 상태. `expired`는 terminal.  
**수정 범위**: ASCII 다이어그램만. `cancelled`를 별도 분기로 그릴 것 (예: `paid ──▶ cancelled (마감 전)`).  
**심각도**: 낮음(구현 의도는 §3.1 표·주석이 명확) — 그러나 구현자 혼동 방지.

### P2 — 브랜드 색 미수록 (§8 또는 별도 §)
**현상**: Kyu 23:44 "브랜드 색 = 아이보리 보라·아이보리 파랑(노티드풍 파스텔 2색, 글꼴 미정)" 결정이 설계서 어디에도 없음.  
**수정 범위**: §8 준수 체크 또는 §0 한 줄 추가 — 색상·글꼴 미정 기재.  
**심각도**: 낮음(본 문서는 아키텍처 설계서, UI 비주얼 명세 아님) — 그러나 원장 결정이므로 추적 가능하게 한 줄 필요.

---

## 3. "코어 1 · 우회 7 · 신규 10" 판단 검증

### 신규 10건 중 Medusa v2.17 모듈로 대체 가능한 것: **0건**

| 신규 feature | 대체 검토 결과 |
|---|---|
| F3 pickup_reservation_cap (일별 상한) | Medusa `InventoryModule.createReservationItems`(F16에서 이미 우회 사용)는 개별 주문 hold · 일별 공급 상한 개념 없음 → 신규 적절 |
| F4 예약 창 계산 / F5 시간대 config / F6 불가일 | Medusa에 달력·시간대 스케줄링 모듈 없음 → 신규 적절 |
| F11 no_show_held → disposed 상태·cron | Medusa order status는 `pending/completed/cancelled` 세 가지 · no_show 개념 없음 → metadata overlay 신규 적절 |
| F12 awaiting_human (커스텀) / F13 대량 Rp 1M 규칙 | 주문 workflow step 로직 신규 · Medusa 기본 checkout에 없음 → 신규 적절 |
| F14 WA 영수증 attribution | CareAgent consumer + outbox → 신규 적절 |
| F15 Todoboss 이벤트 발사기 | 계약 #349 머지 완료지만 실제 이벤트 발사기(outbox producer)는 신규 → 신규 적절 |
| F18 Wing 홈 UI | hello-world 스캐폴드만 → 신규 적절 |

**pickup_reservation_cap vs Medusa inventory**: F16이 이미 `createReservationItems`(우회)로 개별 주문 hold를 담당하고, F3는 그 위의 "일별 총 공급 상한" 레이어 → 역할이 다르므로 중복 아님. 판단 옳음.

---

## 4. POS 재사용 — 중복 개발 없음 확인

| POS 자산 | Wing 재사용 경로 | 중복 개발 |
|---|---|---|
| `payment_xendit` provider + Xendit webhook | F8: Wing storefront payment session → 동일 provider · webhook 한 벌 | ✅ 없음 |
| `phone-id.ts` + `find-customers-by-phone.ts` | F9: Wing checkout 전 `customer_identify` step 공용 | ✅ 없음 |
| `pos-void` / `pos-refund` workflow | F10: 취소·환불 workflow 직접 재사용 · 창 검증 step만 추가 | ✅ 없음 |
| Inventory reservation API | F16: `InventoryModule.createReservationItems` · Wing이 동일 모듈 호출 | ✅ 없음 |

Kyu W4("QRIS 등 결제는 POS에서 만든 것 재사용 · 중복 개발 금지") 충족 확인.

---

## 5. 열린 질문(Q1-Q8) 적절성

Q1~Q8 모두 Kyu 결정이 필요한 운영 규칙(시간·물량·UX 선택)이고, 기술 권장안은 §6 하단에 별도 확정 처리됨. 분류 적절.

---

## 6. 결론

- **APPROVE** — 원장 결정 18건 중 17건 담겼고, 아키텍처 판단(우회/신규 분류, POS 재사용 설계) 모두 옳음.
- **P1 §3.2 ASCII 다이어그램 수정** (한 줄 — `cancelled` 위치 교정) 권장.
- **P2 브랜드 색 한 줄 추가** (§8 또는 §0) 권장.
- 두 건 모두 낮음. 머지 차단 사유 아님. 구현 신호 전 Kyu가 편한 시점에 수정.
