---
round: M0-0916-A
pr: storeport#113
outcome: feature-map
kyu_checks: 0
---

# M0-0916-A · 기능 지도 원장 + 검사기 + CI 게이트 (R030 회수)

**일자**: 2026-09-16 · **허브**: M0 · **성격**: docs + scripts + CI · 코드 zero

---

## 0. 배경 · 원장 대사

- **R030 (기능 지도)** 회수 — 리포 전 파일이 어느 기능(=프로세스)에 속하는지 단일 원장으로 추적.
- **R026 (코어 중심 ADR)** = 별건 유지.
- 포털이 시트 소스로 소비할 JSON 히스토리 산출 · PR diff 게이트 편입.

---

## 1. [REQ] 회수 매트릭스

| # | 요구 | 착지 |
|---|------|------|
| 1 | `docs/feature-map.yaml` · 7 영역 · status 정확 (planned 다수) | ✓ 43 프로세스 · live=23 planned=19 deprecated=1 |
| 2 | `scripts/feature-map-check.mjs` · 미분류 표 | ✓ scanned 652 · matched 652 · unmatched 0 |
| 3 | CLAUDE.md `[DOC]` 규약 1줄 | ✓ §10.5 신설 |
| 4 | status = live\|planned\|deprecated 만 · building 금지 | ✓ 스크립트에서 어휘 위반 시 종료 2 |
| 5 | 커밋·PR 본문 `processes: [<id>, ...]` 필수 · CLAUDE.md 편입 | ✓ CLAUDE.md §10.4 · 본 PR 커밋 2건에도 반영 |
| 6 | CI `feature-map-check.yml` · 미분류 → fail + 코멘트 · planned→live 안내 | ✓ `.github/workflows/feature-map-check.yml` 신설 |
| 7 | summary = 한 문장 · 처음 보는 사람 기준 · 약어 0 | ✓ 43 processes 전량 정합 (예: "매장 직원이 자기 매장 주소와 계정으로 점포 결제 단말에 로그인한다.") |
| 8 | 프로세스별 최근 커밋 3건 JSON | ✓ `--json` 출력 `history.<id>.{storeport,fork}` · 포털 시트 히스토리 원본 |

---

## 2. 상태 실측 (M0-0916-A tip)

### 2.1 리포 · 브랜치

| 리포 | 브랜치 | tip | 상태 |
|------|--------|-----|------|
| storeport main | main | (unchanged) | - |
| storeport 작업 | `docs/m0-feature-map` | `6375bd7` | **PR #113 OPEN** (docs+scripts+CI) |
| agilo-medusa-pos-fork | master | `43e1bab` | - |
| agilo-medusa-pos-fork 작업 | `feat/m0-0915-a-sdk57` | `ae56445` | PR #6 OPEN (전 라운드 · 별건) |
| curiocity-relay main | main | 본 리포트 push 대상 | - |

### 2.2 기존 open PR (별건 · 판정 유예)

| 리포 | PR | 브랜치 | 라운드 | 상태 |
|------|----|--------|--------|------|
| storeport | #111 | `docs/m0-0915-a-sdk57` | M0-0915-A | OPEN |
| storeport | #104 | `docs/m0-0909-a-reactivation` | M0-0909-A | OPEN |
| storeport | #113 | `docs/m0-feature-map` | **M0-0916-A** | **OPEN** (본 라운드) |
| agilo-medusa-pos-fork | #6 | `feat/m0-0915-a-sdk57` | M0-0915-A | OPEN |

---

## 3. 스크립트 실측

```
$ node scripts/feature-map-check.mjs
Feature-map · round=M0-0916-A · 43 processes / 7 areas
  status: live=23 planned=19 deprecated=1
  scanned: 652 files → matched=652 unmatched=0
```

- 미분류 = 0 · status 어휘 위반 = 0
- planned → live 승격 후보 9건 (별건 판정)

### 3.1 승격 후보 (판정 유예)

| 프로세스 | 감지 파일 수 | 판정 |
|---------|-------------|------|
| commerce-core.payment-providers | 4 | scaffold 실체 · 미완결 (ADR-0012 §4.3 C4) · planned 유지 |
| commerce-core.pickup-slot | 2 | 스텁 · planned 유지 |
| commerce-core.tenant-rbac | 4 | 스켈레톤 · planned 유지 |
| commerce-core.todoboss-bridge | 9 | 스텁 + event-contracts scaffold · planned 유지 |
| commerce-core.wa-webhook | 2 | 스텁 · planned 유지 |
| wing.storefront | 6 | Next 스켈레톤 · planned 유지 |
| care-agent.dialog | 1 | index.ts 뿐 · planned 유지 |
| infra.wing-envelope | 7 | Wing 스켈레톤 envelope · planned 유지 (Wing 자체 planned) |
| infra.care-agent-envelope | 3 | care-agent 스켈레톤 envelope · planned 유지 |

**판정 근거**: 파일 존재 ≠ live. Kyu 실기 승인 or prod 서빙 확정 시 live 승격 (`docs/requirements-tracking.md §0 정합`).

### 3.2 포털 시트 히스토리 산출 (JSON)

```
$ node scripts/feature-map-check.mjs --json --fork-path=/path/to/agilo-medusa-pos-fork
```

- 43 프로세스 전량 `history.<id>.{storeport: [3건], fork: [3건]}` 산출
- fork 커밋 감지 프로세스 = 11 (전량 Anchor POS · SDK 정합 포함)
- storeport 커밋 감지 프로세스 = 22

**예시** (`anchor-pos.login`):

```json
{
  "storeport": [],
  "fork": [
    {"sha": "b70281a", "subject": "feat(register): POS-10/11 UI 착지 (M0-0729-AL · β 2/3) (#2)"},
    {"sha": "d015bb5", "subject": "fix: improve layout structure for login screen on tablet and larger screen sizes"},
    {"sha": "182a6cb", "subject": "fix: disable debug mode for Medusa SDK in auth and settings contexts"}
  ]
}
```

---

## 4. CI 게이트 · 상세 절차

`.github/workflows/feature-map-check.yml` 신설.

1. PR base ↔ head `git diff --name-only` 로 변경 파일 목록 산출
2. `node scripts/feature-map-check.mjs --json --diff <files>` 실행
3. `report.json` 파싱:
   - `unmatched.length > 0` → PR 코멘트 (미분류 목록) + fail
   - `promotionHints.length > 0` → PR 코멘트 (승격 안내 · fail 아님)
4. 종료 코드 = unmatched 유무

**해소 경로** (PR 저자 관점):
- 미분류 파일 = 새 기능이면 프로세스 신설, 기존 기능 확장이면 files 패턴 확장
- planned→live 안내 = 상태 판정 (실제로 live 인지 아직 planned 인지) 후 필요 시 `status:` 편집

---

## 5. CLAUDE.md 편입 요지

- **§10.4 신설**: `processes: [<id>, ...]` 필드 필수. 모든 커밋·PR 본문에 한 줄. 파일이 어느 프로세스에도 안 걸리면 `docs/feature-map.yaml` 갱신 동반.
- **§10.5 신설**: `[DOC]` 지시 시 T0 자가 착지 · docs-only 스코프 이탈 감지 시 정지·회부 (스크립트·워크플로 편입 요구 = docs+scripts 로 확장 승인 필요).

---

## 6. 규약 정합 점검

| 규약 | 정합 |
|------|------|
| status 어휘 `live\|planned\|deprecated` 만 | ✓ |
| `building` 미기입 (포털 소관) | ✓ |
| `summary` 한 문장 · 처음 보는 사람 기준 · 약어 0 | ✓ |
| `fork:` 접두 = agilo-medusa-pos-fork | ✓ |
| 커밋·PR 본문 `processes:` 필드 | ✓ (본 PR 커밋 2건 모두) |
| 커밋 메시지 `!` 미사용 | ✓ |
| relay push (main) | ✓ |
| kyu_checks: 0 (사용자 실기 없음) | ✓ |

---

## 7. 이연 순증감

| 카테고리 | 수 | 근거 |
|---------|----|------|
| **해소** | **+1** | R030 (기능 지도) 착지 |
| **신설** | 0 | 새 REQ 없음 |
| **유지 별건** | R026 (코어 중심 ADR) | 판정 유예 |
| **총 순증감** | **-1** | R030 회수 |

---

## 8. 다음 게이트

1. **storeport PR #113 병합** — feature-map 검사기 · CI 게이트 활성화.
2. **planned→live 승격 후보 9건 재판정** — 별건 라운드 (실기 근거 확보 후).
3. **포털 시트 편입** — `feature-map-check.mjs --json` 소비 배관 (별건 · 포털 소관).
4. **`building` 상태 정의** — 포털이 open PR diff ↔ files 매칭으로 계산 (본 리포에서 정의 안 함 · 포털 별건).
5. **R026 판정 라운드** — 코어 중심 ADR 별건 발부 판정 (오케).

---

*M0-0916-A · 2026-09-16 · 기능 지도 R030 회수 · storeport PR #113 · kyu_checks 0 · 이연 순증감 -1*
