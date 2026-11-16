판정: 전화번호 쓰기 경로 (Anchor POS Create · lib/link-customer-order · backfill 스크립트 · Admin 기본) 가 서로 다른 포맷(raw 081… / E.164 +6281… / raw 6281…)으로 저장하고, 유일성 인덱스는 metadata.phone_e164 보유 레코드에만 걸려 레거시·우회 경로가 걸러지지 않음 → 한 사람이 customer 3 레코드로 쪼개지고 store_credit_account 도 3개로 분산.

## Deliverable

- `docs/plans/phone-identity-plan.md` — 전수 쓰기 경로 7개 / 검색 경로 6개 · Kyu 3 레코드 재구성 · 포인트 테이블 병합 경계 · 설계안(E.164 1 값 + 공용 정규화 + 2단 유일성) · R1~R5 라운드 분할 · Kyu 결정 질문 4건.
- 브랜치: `docs/m0-1116-as-phone-identity` · 코드 변경 0 · 운영 DB 조회 0.

## 핵심 발견

1. 정규화 함수 `apps/commerce-core/src/lib/phone-id.ts` 는 정상 — 081/62/+62 모두 `+6281380442480` 으로. 그러나 Anchor POS Create 와 Admin 기본 Customers 가 **이 함수를 거치지 않는다** (W1·W5).
2. `apps/commerce-core/src/api/admin/pos/orders-list/route.ts:41-48` 에 **별도 로컬 `maskPhone`** 존재 — `+` 를 strip 해 `"6281-****-2480"` 생성. Admin Orders 스샷의 괴상한 마스킹의 뿌리.
3. `backfill-phone-customer-name.ts:50` 의 `maskE164` 는 입력이 `+62` 로 시작하지 않으면 **원문 반환** → 레거시 `phone="081380442480"` 에 대해 `first_name` 을 `"081380442480"` 그대로 심음 (마스킹 실패).
4. 유일성 인덱스 `IDX_customer_phone_e164_uniq` 는 `metadata.phone_e164 IS NOT NULL` 조건이라 **레거시 레코드 제외** → 이중 생성 가능.
5. Kyu 스샷의 "0810-****-2480" 은 정규화 테이블 상 재구성 불가 (공용 maskE164 는 "0810" 시작 결과를 만들 수 없음) → §3 에서 DB 실값 확인 요청(Q1).

## 다음 단계

- Kyu Q1-Q4 응답 → 플랜 확정 → R1~R5 티켓 분리 → R1·R2·R3 코드 변경 티켓 생성.
- R4 (병합 스크립트) 는 Kyu 승인 후 운영 적용(`--apply` 는 Kyu 터미널에서).
