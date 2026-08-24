# M0-0824-B · AgentsPay ADR 3 Accepted 전환 · P1 정본 · 등재 16

**일자**: 2026-08-24 · **허브**: M0 storeport · **성격**: 정본 확정 (src 변경 = 주석 2 파일뿐)

---

## 배경

선행 M0-0824-A 에서 ADR-0010/0011/0012 를 **Proposed** 로 초안 게시. 본 라운드는 오케 판정에 따라 3 ADR 을 **Accepted** 로 전환하고, A3 마이그레이션 경로를 **P1 (점진적 상승)** 로 확정 정본화. 표현 오독 2건만 이번 라운드 수정하고, 나머지 충돌 16건은 원장 등재만 (착수 금지).

---

## B-1 · ADR 3건 Accepted 전환

- **ADR-0010** (A1 자금 미취급 불변식) · Status: **accepted** · 오케 · 2026-08-24
- **ADR-0011** (A2+A3 스냅샷 불변 + Intent/Cart 2단계 분리) · Status: **accepted** · 오케 · 2026-08-24
- **ADR-0012** (A4 commerce-core API 형태 규약 · MCP-ready) · Status: **accepted** · 오케 · 2026-08-24

각 ADR 파일 헤더 "상태" 필드에 판정 주체와 일자 명기.

---

## B-2 · A3 마이그레이션 경로 P1 정본화

**채택**: **P1 (점진적 상승 · backward-compatible)**.

- 기존 `commerce.order.created.v1` 유지 · 신규 필드는 optional 추가 (Todoboss 등 외부 소비자 리팩터 불요)
- 신설 이벤트 `intent.*` · `cart.confirmed.v1` 는 병립 추가 (기존 소비자 무영향)
- `commerce.order.modified.v1` 은 당분간 유지 · deprecation 예고 (별건 판정)

### P1 단서 조항 (Kyu B-2 강제 · 한 줄)

**요지**: 신규 필드 `customer_utterance_raw` · `intent_ref` 는 스키마상 optional (하위 호환) 이지만 **생산 경로에서는 필수로 강제**.

**강제 지점 (한 줄)**: commerce-core 이벤트 outbox 발사 지점에 zod `.refine` 스트릭트 스키마 (`commerceOrderCreatedV1Prod`) 를 두어 두 필드 존재를 emit 직전 검증하고 위반 시 이벤트 발사 실패 · event-contracts base 스키마는 optional 유지.

원장 게시: `ADR-0011 §4.3 판정` + `§4.4 P1 정본 단서 조항`.

---

## B-3 · 표현 오독 2건 코드 수정 (src 변경 = 2 파일뿐)

### (a) payment_xendit/service.ts · Payouts 표현 정정

기존 주석의 `Payouts API (staff/supplier 정산 · Phase Next)` = StorePort 가 payout 을 수행하는 것으로 오독 여지.

수정 후: **"Payouts (staff/supplier 지급) 는 가맹점 자기 Xendit Payouts API 를 StorePort UI 로 대리 조작할 뿐 · StorePort 는 자금을 보유·경유·정산하지 않는다 (ADR-0010 정본)"** 명시.

### (b) payment 모듈 상단 ADR-0010 참조 블록

두 payment 모듈 (`payment_midtrans/service.ts`, `payment_xendit/service.ts`) 상단 주석에 `[불변식] ADR-0010 (AgentsPay A1 · StorePort 자금 미취급) 정본` 블록 추가.

블록 내용 3 줄:

- 게이트웨이 계정 = 가맹점 자기 명의 · StorePort 는 API 키로 대리 운용만
- 자금 이동 경로: 손님 → 게이트웨이 → 가맹점 자기 명의 은행계좌 (StorePort 미경유)
- StorePort 명의 pool account · escrow · clearing 금지 (BI PJP 라이선스 선 절연)

**scope 확인**: git diff --stat = **2 파일만** src 수정 · 그 외 코드 변경 zero.

---

## B-4 · 나머지 충돌 16건 requirements-tracking §8 등재만 (착수 금지)

`docs/requirements-tracking.md §8` 신설. 5필드 (원문·출처·문서화·구현·실기) 전부 채움 · 상태 = **⏸ 별건 판정 · 착수 금지**.

| REQ ID              | 요약                                                                          | 규모  |
| ------------------- | ----------------------------------------------------------------------------- | ----- |
| REQ-AGP-A1-C3       | payment 이벤트 merchant_of_record 필드 부재                                    | S~M   |
| REQ-AGP-A3-C1       | intent.\* 이벤트 부재                                                          | M     |
| REQ-AGP-A2-C2       | cart.confirmed.v1 부재                                                         | M     |
| REQ-AGP-A2-C3       | customer_utterance_raw 필드 부재 (P1 강제 대상)                                | S     |
| REQ-AGP-A3-C4       | intent_ref 필드 부재 (P1 강제 대상)                                            | S     |
| REQ-AGP-A2-C5       | commerceOrderModifiedV1 스냅샷 불변식과 충돌 (폐기/재정의)                     | S~L   |
| REQ-AGP-A2-C6       | AP2 스키마 매핑표 부재 (별건 [PLAN-OSS])                                        | S     |
| REQ-AGP-A3-C7       | link.ts 주석 dialog_id ≠ payer 명시 부재                                        | S     |
| REQ-AGP-A4-C1       | 신규 endpoint 전수 zod 스키마 부재                                             | M     |
| REQ-AGP-A4-C2       | close endpoint compound 판정                                                   | S     |
| REQ-AGP-A4-C3       | pos-complete 5-step compound MCP 노출 정책                                     | M     |
| REQ-AGP-A4-C4       | payment provider 실전 구현 시 규약 준수 (빈 스캐폴드 → 실체)                    | S~L   |
| REQ-AGP-A4-C5       | pos-complete route → thin adapter refactor                                     | M     |
| REQ-AGP-A4-C6       | packages/api-contracts 신설                                                    | M     |
| REQ-AGP-A4-C7       | health 응답 zod export                                                         | S     |
| REQ-AGP-A4-C8       | text/plain 응답 MCP 노출 정책                                                  | S     |

**합계**: 16 건 (ADR-0010 잔여 1 · ADR-0011 잔여 7 · ADR-0012 잔여 8).

**해소 완료 (B-3 · 등재 제외 근거)**: ADR-0010 C1 (payment_xendit payouts 표현) · ADR-0010 C2 (payment 모듈 상단 ADR-0010 참조 부재) = 이번 라운드 B-3 해소.

---

## 회귀 확인

- `apps/commerce-core` tsc: **`seed-soopsok.ts:53` pre-existing 에러 1건 존재** · **main 도 동일** · 본 라운드 B-3 코드 변경과 무관
- lint / test: 스캐폴드 클래스만 · 신규 코드 zero · 회귀 여지 없음
- src 변경 scope: **payment_midtrans/service.ts + payment_xendit/service.ts 두 파일** · git diff --stat 로 확인

---

## PR · 파일 · 커밋

- **PR**: [storeport]_PR#87 · branch `docs/m0-0824-b-agentspay-accepted` · commit `6fac3a7`
- **수정 파일** (6):
  - `docs/decisions/ADR-0010-agentspay-a1-no-fund-custody.md` (상태 accepted)
  - `docs/decisions/ADR-0011-agentspay-a2-a3-immutable-snapshot-intent-cart-split.md` (상태 accepted + P1 정본 + 단서 조항)
  - `docs/decisions/ADR-0012-agentspay-a4-commerce-core-api-shape.md` (상태 accepted)
  - `docs/requirements-tracking.md` (§8 신설 · 16건 등재)
  - `apps/commerce-core/src/modules/payment_midtrans/service.ts` (ADR-0010 상단 참조)
  - `apps/commerce-core/src/modules/payment_xendit/service.ts` (ADR-0010 상단 참조 + Payouts 정정)

---

## 이연 순증감

- **해소**: **+18** (proposed → accepted 3건 정본화 · P1 결정 · 표현 오독 2건 · 등재 16건 원장 편입 완료)
- **신설**: 0 (이번 라운드 새 스코프 없음 · 등재 16건은 이전 라운드 발견분)
- **유지 (별건 판정 대기)**: 16 (§8 REQ-AGP-\*)
- **유지 (M0-0729-AO 이월)**: 5 (subscriber 재조사 · Z closed_at · Anchor CI · Maestro · e2e 상품명)
- **총 이연 순증감**: **-2** (Proposed 3건 해소 + P1 경로 선택 1건 해소 대비 · 신설 0 · 나머지 유지)

---

## 다음 게이트

- REQ-AGP-A2-C3 + REQ-AGP-A3-C4 착수 시 P1 강제 조항 병행 (강제 지점 = commerce-core outbox 발사 zod .refine)
- REQ-AGP-A2-C5 (commerceOrderModifiedV1) 폐기/재정의 판정 → 오케 별건
- REQ-AGP-A4-C6 (packages/api-contracts) 신설 판정 → 오케 별건

---

_M0-0824-B · 2026-08-24 · Accepted 확정_
