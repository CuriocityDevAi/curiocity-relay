---
round: M0-0917-A
pr: storeport#114
outcome: feature-map-l1
kyu_checks: 0
---

# M0-0917-A · 기능 지도 3단계 스키마 v2 · L1 보강 (R030)

**일자**: 2026-09-17 · **허브**: M0 · **성격**: docs + scripts + CLAUDE.md · 코드 zero

---

## 0. 배경 · 원장 대사

- **R030 (기능 지도 L1 보강)** 회수. 규약 v2 (curiocity-relay/docs/feature-map-convention.md · 3단계 확장 2026-09-17) 정합.
- **선행 착지**: storeport PR #113 (M0-0916-A v1) merged (`853540f`) → 본 라운드는 delta.
- **비회수**: R026 (코어 중심 ADR) 유지.

---

## 1. [REQ] 회수 매트릭스

| # | 요구 | 착지 |
|---|------|------|
| 1 | `docs/feature-map.yaml` v2 · L1 children · files L1 로 하강 · L2 합집합 (중복 금지) | ✓ 3 process 에 L1 신설 (checkout-3way / register-close / pos-complete) · L1 있는 L2 files 미기입 |
| 2 | `scripts/feature-map-check.mjs` v2 · L1/L2/L3 개수 · L1 패턴 실측 · 상위 중복 검출 · 미분류 % | ✓ 카운트·구조 규약 3종·중복 4건·미분류 0.0% |
| 3 | CI 통과 · CLAUDE.md [DOC] L1 문구 갱신 | ✓ CLAUDE.md §10.4 갱신 (processes id L1/L2 자격 형식) · CI 통과 (PR #114) |

---

## 2. 상태 실측 (M0-0917-A tip)

### 2.1 리포 · 브랜치

| 리포 | 브랜치 | tip | 상태 |
|------|--------|-----|------|
| storeport main | main | `853540f` (M0-0916-A merged) | - |
| storeport 작업 | `docs/m0-feature-map-l1` | `9f2225b` | **PR #114 OPEN** (docs+scripts+CLAUDE.md) |
| agilo-medusa-pos-fork | master | `43e1bab` | - |
| agilo-medusa-pos-fork 작업 | `feat/m0-0915-a-sdk57` | `ae56445` | PR #6 OPEN (전 라운드 · 별건) |
| curiocity-relay main | main | 본 리포트 push 대상 | - |

### 2.2 스토어포트 open PR (별건 · 판정 유예)

| PR | 브랜치 | 라운드 | 상태 |
|----|--------|--------|------|
| #114 | `docs/m0-feature-map-l1` | **M0-0917-A** | **OPEN** (본 라운드) |
| #111 | `docs/m0-0915-a-sdk57` | M0-0915-A | OPEN |
| #104 | `docs/m0-0909-a-reactivation` | M0-0909-A | OPEN |

---

## 3. L3 / L2 / L1 개수

| 레벨 | 정의 | 수 |
|------|------|----|
| **L3** | area (하이레벨) | **7** (anchor-pos · commerce-core · wing · care-agent · pocket · dashboard · infra) |
| **L2** | process | **44** |
| **L2_with_children** | L1 children 있는 L2 | **3** |
| **L1** | process.children (하위 동작) | **9** |

**Leaf 매칭 단위 상태 분포**:

| status | 수 |
|--------|----|
| live | 27 |
| planned | 22 |
| deprecated | 1 |

---

## 4. 미분류 % · 검사기 실측

```
Feature-map v2 · round=M0-0917-A · project=storeport
  L3 areas=7  L2 processes=44 (children=3)  L1 total=9
  leaf status: live=27 planned=22 deprecated=1
  scanned: 655 files → matched=655 unmatched=0 (0.0%)
```

**미분류 %**: **0.0%** (655 파일 전량 매칭 · 구조 규약 위반 0 · status 어휘 위반 0).

**상위 중복 패턴 (cross-process · 경보만)**: 4 건
- `fork:app/setup-wizard.tsx` ← anchor-pos.login, anchor-pos.store-setup
- `fork:api/hooks/draft-orders.tsx` ← anchor-pos.cart, anchor-pos.checkout-3way.card-approval-number
- `fork:api/hooks/register-session.ts` ← anchor-pos.register-close.expected-calc, anchor-pos.wa-copy
- `fork:app/register/z-result.tsx` ← anchor-pos.register-close.z-generate, anchor-pos.z-report

**planned → live 승격 후보**: 9 건 (별건 판정 · 실기 승인 근거 확보 후).

---

## 5. L1 children 3건 (Kyu 지시)

### 5.1 `anchor-pos.checkout-3way` (결제 3택)

| L1 id | 이름 | summary | files |
|-------|------|---------|-------|
| cash | 현금 | 손님이 현금으로 내면 승인 번호 없이 완료 버튼만 눌러 주문을 닫는다. | fork:app/checkout/[draftOrderId].tsx |
| card-approval-number | 카드 승인번호 | 손님이 카드로 내면 단말기에서 뽑아 준 승인 번호를 입력해야 완료할 수 있다. | fork:app/checkout/[draftOrderId].tsx · fork:api/hooks/draft-orders.tsx |
| qris | QRIS | 손님이 QRIS 로 내면 단말기에서 뽑아 준 승인 번호를 입력해야 완료할 수 있다. | fork:app/checkout/[draftOrderId].tsx |

### 5.2 `anchor-pos.register-close` (마감)

| L1 id | 이름 | summary | files |
|-------|------|---------|-------|
| expected-calc | 예상 금액 산출 | 개점 시재에 현금 판매·수금을 반영해 서랍에 남아 있어야 할 예상 금액을 계산한다. | fork:api/hooks/register-session.ts |
| diff-note | 차액 비고 | 실사 현금이 예상 금액과 다르면 사유 비고 없이는 마감 버튼이 눌리지 않는다. | fork:app/register/close.tsx |
| z-generate | Z 리포트 생성 | 마감이 확정되는 순간 하루 매출을 결제 수단별로 정리한 Z 리포트가 만들어진다. | fork:app/register/z-result.tsx |

### 5.3 `commerce-core.pos-complete` (매장 결제 완료 처리 · planned)

| L1 id | 이름 | summary | files |
|-------|------|---------|-------|
| payment-record | 결제 기록 | 방금 낸 결제 수단과 승인 번호를 주문에 붙여 정식 결제 완료로 표시한다. | apps/commerce-core/src/workflows/pos-complete/payment-record/** |
| fulfilled | 배송 완료 처리 | 매장 픽업이므로 결제 즉시 자동으로 배송 완료 상태로 넘긴다. | apps/commerce-core/src/workflows/pos-complete/fulfilled/** |
| cash-drawer | 서랍 기록 | 현금 결제였다면 서랍의 현금 이동 원장에 판매 금액을 즉시 편입한다. | apps/commerce-core/src/workflows/pos-complete/cash-drawer/** |

---

## 6. 포털 시트 히스토리 (v2 · leaf 단위)

각 leaf (L1 있으면 L1, 없으면 L2) 마다 `{ storeport: [3건], fork: [3건] }` JSON.

**예시** (`anchor-pos.checkout-3way.cash`):

```json
{
  "storeport": [],
  "fork": [
    {"sha": "c3b4e7a", "subject": "feat(checkout): 결제수단 3택 + 승인번호 + POS 정본 결제 편입 (M0-0729-AO) (#4)"},
    {"sha": "166cf9d", "subject": "chore: update dependencies in package.json"},
    {"sha": "2ddc5f1", "subject": "Merge branch 'master' into feat/POS-52"}
  ]
}
```

---

## 7. 검사기 v2 새 규약

1. **구조 규약** (실패 시 종료 2):
   - `L2_FILES_WITH_L1`: children 있는 L2 에 files 두면 실패 (상위 = 하위 합집합 원칙)
   - `L1_NEED_2_PLUS`: L1 이 1개면 실패 (2개 이상 원칙)
   - `L1_MISSING_FILES` / `L2_MISSING_FILES`: files 부재 실패
2. **상위 중복 패턴 검출**: 같은 파일 패턴이 다른 process 걸치면 경보 (같은 process 내 L1 형제 중복은 정상 · 같은 파일이 여러 sub-action 을 구현).
3. **미분류 %** 산출.
4. **L1 fork-only 카운트**: 로컬 실측 불가 표기 (FORK_PATH 지정 시 히스토리만).

---

## 8. CLAUDE.md §10.4 갱신 (요지)

- `processes: [<id>, ...]` id 는 **L1 또는 L2 자격 형식** (`<area>.<process>` or `<area>.<process>.<child>`).
- src 변경 시 `feature-map.yaml` 갱신 필수 — 기존 프로세스 files 확장 or 신규 프로세스 신설 or 하위 동작 2개 이상이면 L1 children 신설.

---

## 9. 규약 정합 점검

| 규약 | 정합 |
|------|------|
| status `live\|planned\|deprecated` 만 (building 금지) | ✓ |
| L1 있는 L2 files 미기입 (합집합 원칙) | ✓ (L2_FILES_WITH_L1 검증 통과) |
| L1 2개 이상 원칙 | ✓ (L1_NEED_2_PLUS 검증 통과) |
| summary 한 문장 · 처음 보는 사람 기준 · 약어 0 | ✓ |
| 커밋·PR 본문 `processes:` 필드 (L1/L2 자격) | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |
| relay push (main) | ✓ |
| kyu_checks: 0 | ✓ |

---

## 10. 이연 순증감

| 카테고리 | 수 | 근거 |
|---------|----|------|
| **해소** | **+1** | R030 L1 보강 착지 |
| **신설** | 0 | 새 REQ 없음 |
| **유지 별건** | R026 (코어 중심 ADR) · promotion 9건 · duplicate 4건 · L1 fork-only 6건 | 판정 유예 |
| **총 순증감** | **-1** | R030 v2 회수 |

---

## 11. 다음 게이트

1. **storeport PR #114 병합** — feature-map v2 검사기·CI 활성화.
2. **promotion 9건 재판정** — 별건 라운드 (실기 근거 확보 후 planned → live 승격).
3. **duplicate 4건 리팩터 검토** — cross-process 공유 파일 (setup-wizard, draft-orders, register-session, z-result) 정합 판정 · 별건.
4. **`building` 계산 배관** — 포털이 열린 PR diff ↔ files 매칭으로 계산 (포털 별건).
5. **R026 판정 라운드** — 코어 중심 ADR 별건 발부 판정.

---

*M0-0917-A · 2026-09-17 · 기능 지도 3단계 v2 · L1 9건 신설 · storeport PR #114 · kyu_checks 0 · 이연 순증감 -1*
