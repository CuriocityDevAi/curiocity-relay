# M0-0824-A · AgentsPay 4 제약 → ADR 3건 Proposed

**일자**: 2026-08-24 · **허브**: M0 storeport · **성격**: 정본화 (docs-only · src 변경 zero)

---

## 배경

Kyu·오케 논의 (2026-08-24 · AgentsPay 구상) 에서 도출된 설계 제약 4 건을 ADR 로 정본화. Accepted 전환은 다음 라운드 판정 사항 · 이번 라운드는 감사 3 건 + Proposed 초안까지.

**제약 요지**:

- **A1** · StorePort 자금 미취급 · merchant of record = 가맹점 · PJP (Bank Indonesia 결제서비스) 라이선스 선 절연
- **A2** · 주문 확정 순간 = 불변 스냅샷 (품목·수량·금액·수령시간·주소 + **고객 원문**) · AP2 스키마 구조 차용 (코드/의존성 도입 금지 · 암호 서명/VC 미도입)
- **A3** · 상담 중 의향 (Intent) 과 확정 주문 (Cart) 을 별개 레코드로 분리
- **A4** · commerce-core API 형태 규약 = 함수 1개 = 동작 1개 · JSON 스키마 표현 가능 · 대화 문맥 비의존 · 목적 = 후일 MCP wrap 시 로직 재작성 zero

**ADR 분할** (오케 전결): A1 단독 / A2+A3 결합 / A4 단독 = 3 건.

---

## 감사 3 결과

### 감사 1 · A4 · commerce-core API 표면 전수

**main 브랜치 (병합 완료)** = 3 endpoints (모두 스텁 수준):

- `GET/OPTIONS /health` · 응답 shape 인라인 · zod 없음
- `GET /admin/custom` · `sendStatus(200)` 만
- `GET /store/custom` · 스텁

**미병합 feature 브랜치 (`feat/m0-0729-ao-pos-payment` · AK/AN/AO 라운드)** = 9 endpoints:

- `POST /admin/register-sessions` · `GET /admin/register-sessions` · `GET /admin/register-sessions/:id`
- `POST /admin/register-sessions/:id/close` — **compound** (close + z_report snapshot)
- `POST /admin/register-sessions/:id/cash-movements`
- `GET .../x-report` · `GET .../z-report` · `GET .../z-report/text` (text/plain)
- `POST /admin/register-sessions/:id/pos-complete` — **5-step compound** (metadata + payment_collection + mark-paid + auto-fulfill + cash_movement)

**공통 관측**:

- 함수 단위성 대체로 양호. compound 2 건 (close, pos-complete) 은 원자성 요구.
- JSON 스키마화 미착 (모든 신규 endpoint 가 수동 typeof 검증)
- 대화 문맥 의존 = **zero** (A4 §대화 문맥 비의존 위반 없음)
- 서비스/route 분리 부분 위반 (특히 pos-complete 는 route 안에서 workflow 다수 직접 호출)

### 감사 2 · A2·A3 · event-contracts 전수

- `commerceOrderCreatedV1` = 단일 "created" 이벤트 · Intent/Cart 구분 없음 · customer_utterance 필드 없음 · 스냅샷 불변식 필드 (hash/signature) 없음
- `commerceOrderModifiedV1` = `changes: [{field, before, after}]` 편집 delta 표현 · **A2 불변식과 개념 충돌**
- `lineItem`, `money`, `pickup_at`, `dialog_id?` = A2 스냅샷 방향과 부분 정합 (재활용 가능)
- `dialog_id` sentinel 패턴 · attribution 목적 · **payer 신원과 명시적 분리 없음**
- `orderAttributedToDialogV1` = 사후 결합 · **Intent → Cart 승격 개념 아님**
- 노출 이벤트 = link.\* · commerce.\* 만 · **intent.\* 이벤트 부재**

### 감사 3 · A1 · 자금 취급 전제 지점

- `payment_midtrans/service.ts`, `payment_xendit/service.ts` = 빈 스캐폴드 (`class ... extends MedusaService({}) {}`) · 자금 이동 로직 zero
- `payment_midtrans/service.ts` 주석 = Soopsok KTP+NPWP 로 신청 방향 (A1 정합)
- `payment_xendit/service.ts` 주석 = "Payouts API (staff/supplier 정산)" 표현이 **StorePort payout 수행처럼 읽힘** (오독 여지 · A1 재정본화 필요)
- 문서 (`PHASE-1A-KYU-ACTIONS.md`, `K10-SOOPSOK-STORE-CHECKLIST.md`, `anchor-mvp.md`) = Soopsok 명의 신청 · 정산 = 사장 직접 → A1 정합 방향 (그러나 명시적 정본 선언 없음)
- payment 이벤트 (`commerce.payment.captured.v1`, `refunded.v1`) = 자금 수취인 필드 없음 · A1 중립

**결론**: 코드 레벨 A1 위반 zero · 표현·주석 상 오독 여지 1 건 (payment_xendit payouts).

---

## ADR 3건 · Proposed

- **ADR-0010** · A1 · StorePort 자금 미취급 불변식
- **ADR-0011** · A2+A3 · 주문 확정 스냅샷 불변 + Intent/Cart 2단계 분리
- **ADR-0012** · A4 · commerce-core API 형태 규약 (MCP-ready)

각 ADR 구성 = Context / Decision / Consequences / 현 코드 충돌 (실측 근거 · 파일:줄) 4 섹션.

**커밋**: `8aea781` · **브랜치**: `docs/m0-0824-a-agentspay-adr` · **PR**: [storeport]_PR#86

번호는 기존 최대 (0009) + 1 부터 연번 · 재사용 없음.

---

## 발견 충돌 · 예상 수정 규모 (총 18 건)

| ADR | # | 지점 요약 | S/M/L |
| --- | --- | --- | --- |
| 10 | C1 | payment_xendit payouts 표현 오독 여지 | S |
| 10 | C2 | payment 모듈 상단 ADR-0010 참조 없음 | S |
| 10 | C3 | payment 이벤트 merchant_of_record 필드 부재 (판정 유예) | S~M |
| 11 | C1 | `intent.*` 이벤트 부재 | M |
| 11 | C2 | `cart.confirmed.v1` 부재 | M |
| 11 | C3 | commerceOrderCreatedV1 에 customer_utterance_raw 부재 | S |
| 11 | C4 | commerceOrderCreatedV1 에 intent_ref 부재 | S |
| 11 | C5 | commerceOrderModifiedV1 스냅샷 불변식과 충돌 | S~L |
| 11 | C6 | AP2 스키마 매핑표 부재 | S |
| 11 | C7 | dialog_id ≠ payer 명시 없음 | S |
| 12 | C1 | 신규 endpoint 전수 zod 부재 | M |
| 12 | C2 | close compound 판정 | S |
| 12 | C3 | pos-complete 5-step compound MCP 노출 정책 | M |
| 12 | C4 | payment provider 실전 구현 시 규약 준수 | S~L |
| 12 | C5 | pos-complete route → thin adapter refactor | M |
| 12 | C6 | packages/api-contracts 신설 | M |
| 12 | C7 | health 응답 zod export | S |
| 12 | C8 | text/plain 응답 MCP 노출 정책 | S |

---

## A3 마이그레이션 경로 후보 (2+ 개 · 선택은 오케 판정)

- **P1 · 점진적 상승 (backward-compatible)** — 기존 `commerce.order.created.v1` 유지 (optional 필드 추가) + `intent.*` + `cart.confirmed.v1` 신설. **Todoboss webhook receiver 리팩터 불요**. 단점: 개념 이중화 · 사용 지침 문서 필요.
- **P2 · 버전 병립** — `commerce.order.created.v2` 신설 (customer_utterance_raw · intent_ref · snapshot_hash? 필수) + v1 deprecation 유예. **정본 표현 명확**. 단점: Todoboss 등 소비자 동시 대응 필요 · 전환 기간 이중 처리.
- **P3 · event-contracts major 재작성** — `@storeport/event-contracts v2.x` bump · Intent/Cart/스냅샷 정본 처음부터. **클린**. 단점: workspace 내 소비자 + Todoboss 동시 재배치 · 협의 기간 리스크.

---

## 이연 순증감

- **해소**: 0 (라운드 성격상 코드 변경 zero)
- **정본화 편입**: +3 (ADR-0010/0011/0012 박제)
- **신설 (별건 판정 대기)**: **+16** (충돌 목록 15 건 + A3 경로 선택 1 건)
- **유지 (직전 이월)**: 5 (subscriber 재조사 · Z closed_at · Anchor CI · Maestro · e2e 상품명)
- **총 이연 순증감**: **+16 (Proposed 라운드 필연적 증가 · Accepted 전환 후 착수 시 재감소)**

---

## 회부

- **PR**: [storeport]_PR#86 · branch `docs/m0-0824-a-agentspay-adr` · commit `8aea781`
- **파일**:
  - `docs/decisions/ADR-0010-agentspay-a1-no-fund-custody.md`
  - `docs/decisions/ADR-0011-agentspay-a2-a3-immutable-snapshot-intent-cart-split.md`
  - `docs/decisions/ADR-0012-agentspay-a4-commerce-core-api-shape.md`
- **다음 게이트**: 오케 판정 (Accepted 전환 여부) → 각 ADR 별 착수 심문 (특히 ADR-0011 A3 마이그레이션 경로 P1/P2/P3 선택)

---

*M0-0824-A · 2026-08-24 · Proposed*
