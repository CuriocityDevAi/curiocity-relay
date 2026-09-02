# K0-0902-AD · 심문 게시 (설계 갈림길 6 · 진행 정지)

**round**: `K0-0902-AD`
**hub**: k0 (test-portal)
**목적**: PR 카드 체크리스트 파싱 + 진행도 + 판정 · AD-1~AD-6
**timestamp**: 2026-09-02

**진행 정지 근거**: Kyu 명시 "설계 갈림길이 있으면 relay에 inquiry로 게시하고 진행을 멈춰라." CLAUDE.md § 8 ③-relay 5회차 정식 적용.

---

## § ② 큐 · 원장 · 스펙 게시

### (1) dispatch 큐 (본 라운드 무관)
- inbox 7 · active 없음 · await-kyu 1 (STALE 37일)

### (2) 현행 실측

**AD-1 뿌리 확증** (파서 안 잡음 실측):
- `src/lib/parser/test-checklist.ts:60-62` = `test-checklist:` **키 하위** 만 파싱
- `pr-test-checklist-guide.md` (relay 루트 · 정본) 예시 = `## test-checklist` heading + `\`\`\`yaml` code fence 안 **bare 리스트** (`- id: c1` 시작)
- 실 PR body 들이 guide 형식 (bare 리스트) 사용 → 파서 못 잡음 → 케이스 0개
- **뿌리**: parser 가 두 형식 중 하나만 지원 · guide 정본 형식 미지원

**AD-6 착지 실측**:
- `src/lib/PrList.svelte:12,201-202,359` = LauncherButton 카드 안 편입 완료 (AC-1f · 2026-08-24 PR#78 merged 08-24 09:24Z)
- Kyu 실측 (2026-09-02) 시점 = AC merge 후 · **이미 착지 상태**
- 조건부 렌더: `{#if project && project.previewPort}` = registry 안 projects 만 · previewPort 있어야
- 가능성: (a) 실측이 AC merge 前 · (b) registry 미매치 프로젝트 · (c) 다른 CSS/조건 · (d) 새로고침 안 함

**기존 저장 계층 실측**:
- **D1 (`APPROVALS_DB`)** = 이미 있음 (K0-0807-U · migrations/0001_approvals.sql · 하지만 approvals 테이블만 · case_state 없음)
- **GitHub PR comment** = P2.4 submit 배선 있음 (`src/lib/submit.ts` · GitHub API 소비 · Kyu 판정 결과 comment write)
- **localStorage** = 사용 중 (`test-portal:kyu-bridge-token:v1` 등 · 폰-맥 다름)
- **kyu-gate check_run** = P3.5 배선 (`src/lib/checks.ts:83` createCheckRun)

---

## § ③ 심문 게이트

### Q1 상태 저장 계층 (AD-3 · 핵심)

Kyu 요구 = "탭 통과/실패 · 실패 사유 · 저장 · 새로고침 유지".

- **(a1) D1 새 테이블 (approvals-db 재사용 or 신설)**
  - schema: `case_state (pr_id, repo, case_id, status, reason, decided_at, decided_by)`
  - migrations/0002_case_state.sql 신설
  - **장점**: 서버 사이드 · 폰-맥 동기 · 감사 이력
  - **단점**: migration 필요 · schema 진화 관리 (kyu-clicks 갱신)
- **(a2) GitHub PR comment**
  - Kyu 판정 = comment write (structured markdown) · Kyu 명시적 감사
  - **장점**: 표준 · 이력 · P2.4 submit 배선 재사용
  - **단점**: comment API rate limit · 파싱 왕복 필요 (읽을 때 comment 파싱)
- **(a3) localStorage**
  - **장점**: 자작 최소 · 즉시
  - **단점**: 폰에서 판정한 것이 맥 조회 시 안 뜸 (Kyu 실기 = 폰 판정 → 맥 조회 정본 안 됨)
  - **⚠ Kyu 요구 "새로고침 후 유지" 문언 위반 소지** (같은 브라우저는 OK · 폰↔맥은 안 됨)

**K0 권고 = (a1) D1 새 테이블** · 근거:
- Kyu 폰 실기 → 맥 조회 정합 필수
- approvals-db 인프라 재사용 (K0-0807-U · Access + Bearer 정본 준수)
- 감사 이력 (decided_at · decided_by) = kyu-gate 도장 근거

**Kyu 판정**.

---

### Q2 kyu-gate 자동 도장 (AD-4)

Kyu 요구 = "전 항목 통과 시 kyu-gate 도장이 찍히도록 배선".

기존 P3.5 정본 (`src/lib/checks.ts`) = kyu-gate check_run POST · **Kyu 손 사인 관행**. SPEC § 5 정본 = Kyu 판정 = Kyu 만 (자동 승격 금지 · 감사 대상).

- **(b1) 자동 도장** (모든 케이스 pass = 즉시 check_run 상태 = pass)
  - **장점**: UX · 별도 액션 없음 · Kyu 요구 문언 정합
  - **단점**: **SPEC § 5 "kyu-gate 판정 = Kyu 만" 정본과 충돌** (자동 = Kyu 아님)
- **(b2) 반자동** (전 항목 pass → 카드에 [🖋 kyu-gate 도장] 버튼 노출 · Kyu 클릭 시 check_run POST)
  - **장점**: Kyu 명시적 판정 유지 · SPEC 정합
  - **단점**: 액션 1 회 더 필요

**K0 권고 = (b2) 반자동** · 이유:
- SPEC § 5 정본 준수 (Kyu 명시 액션 = 판정 감사)
- 전 항목 pass 상태 자동 감지 = Kyu 눈에 띔 (버튼 활성)
- Kyu 요구 "도장이 찍히도록 배선" = **버튼 배선 = 원클릭 · 자동 도장 아님** 해석 가능

**Kyu 판정 필수** (SPEC § 5 정본 재해석 or 예외).

---

### Q3 파싱 못 잡을 때 표시 문구 (AD-1)

Kyu 요구: "형식 미준수 = '이 PR은 확인 항목 형식을 따르지 않음'" 표시. 판정 기준 = 무엇?

- **(c1) 헤딩 감지**: PR body 안 `## test-checklist` heading 있으면 **형식 시도** · code fence YAML 없거나 파싱 실패 = "형식 미준수". heading 없으면 "확인 항목 없음" (진짜 결측).
- **(c2) YAML block 감지**: `\`\`\`yaml` code fence 있으면 형식 시도 · 파싱 실패 = "미준수". 없으면 "결측".
- **(c3) 둘 다 감지**: heading OR fence 있으면 "미준수" · 없으면 "결측".

**K0 권고 = (c3)** · Kyu 실측 = 실 PR body 관행 = heading 있고 fence 있음 · 파서만 못 잡음. **감지 = 관대**.

---

### Q4 진행도 저장 시점 (AD-3)

- **(d1) 즉시 저장** (탭 = 즉시 D1 write)
  - Kyu 요구 "새로고침 후 유지" 정합
  - 실수로 탭 = 즉시 반영 · undo 없음 (단순화)
- **(d2) 명시 [저장]** (임시 상태 · [저장] 클릭 시 반영)
  - undo 가능 · 실수 방지
  - Kyu 요구 = "탭으로 통과/실패 처리" = 즉시 시사

**K0 권고 = (d1) 즉시 저장** · 이유:
- Kyu 문언 "탭 통과/실패 처리" 정합
- undo = 반대 탭 (통과 → 실패 = 반대로 탭 · 별도 [저장] 불요)

---

### Q5 AD-6 (이미 착지 · 재요청?)

Kyu 실측 문언 = "현재는 상세로 들어가야만 보인다 (2026-08-24 Kyu 실측)". 하지만 **AC-1f = 2026-08-24 09:24Z merge** = Kyu 실측이 merge 전인지 후인지 명확 안 함.

- **(e1) 이미 착지 · 실측 재요청** (본 라운드는 스킵 · Kyu 재확증 요청)
- **(e2) 회귀 fix** (실측이 실제 문제 = 어떤 조건 · CSS · project 매치 실패 등 뿌리 fix)
- **(e3) 조건부 완화** (registry 없는 프로젝트도 노출 · Kyu 명시)

**K0 권고 = (e1) 이미 착지 · Kyu 실측 재요청** · 이유:
- AC-1f 코드 확증 완료 (`PrList.svelte:201-202`)
- 실측 = merge 前 상태일 가능성
- Kyu 재확증 후 재발 시 = 별건 라운드

**Kyu 판정 필수**.

---

### Q6 AD-4~AD-6 착지 or 분리

Kyu 명시: "규모가 과대하면 AD-1~AD-3 을 우선 착지시키고 AD-4~AD-6 을 다음 라운드로 분리해 보고해라."

**K0 규모 판정**:
- AD-1 (파서 확장 · 형식 미준수 표시) = 중
- AD-2 (카드 진행도) = 소
- AD-3 (상세 저장 · D1 신설) = 대 (migration + API + UI)
- AD-4 (kyu-gate 도장 배선) = 중
- AD-5 (테스트 개요) = 소 (이미 summary 있음 · fallback 문구만)
- AD-6 = 이미 착지 (Q5)

**총 규모**: AD-1+2+3 = 대 (D1 migration + API + UI + parser + PrList/상세 · pnpm 회귀 다수)
**AD-4** 별도 = 중 (checks.ts 배선 확장)
**AD-5** = 소 (summary fallback 문구)

**K0 권고 = AD-1 + AD-2 + AD-3 + AD-5 이번 · AD-4 다음 라운드 분리 · AD-6 재확증 · 별건**. AD-5 = 소이라 이번 편입 (fallback 문구만). AD-4 = D1 저장 완결 후 배선 = 자연 순차.

**Kyu 판정**.

---

## 요약 판정 대기 (6 문 · 설계 갈림길 6)

1. **Q1** 저장 계층 = **(a1) D1 새 테이블 (approvals-db 재사용)**
2. **Q2** kyu-gate 도장 = **(b2) 반자동 [🖋 도장] 버튼** (SPEC § 5 정합)
3. **Q3** 파싱 미준수 감지 = **(c3) heading OR fence 관대**
4. **Q4** 저장 시점 = **(d1) 즉시 저장**
5. **Q5** AD-6 = **(e1) 이미 착지 · 실측 재요청**
6. **Q6** 착지 범위 = **AD-1+2+3+5 이번 · AD-4 다음 · AD-6 재확증**

**정지**: Kyu 회신 후 실행. 즉시 구현 금지.

**게시 방식**: CLAUDE.md § 8 ③-relay 정본 5회차 정식 적용 (K0-0807-U · W · X · AC · **AD 다섯 번째**).

---

## PR 예정
- 브랜치: `feat/k0-0902-ad-checklist-parsing`
- Kyu 회신 대기 · 회신 후 구현 → PR → k0/K0-0902-AD-report.md push
