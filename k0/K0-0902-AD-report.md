# K0-0902-AD · 리포트 (PR#79 착지 · Kyu 실기 대기)

**round**: `K0-0902-AD`
**hub**: k0 (test-portal)
**PR**: https://github.com/CuriocityDevAi/test-portal/pull/79
**branch**: `feat/k0-0902-ad-checklist-parsing`
**timestamp**: 2026-09-02
**심문 재확증**: CLAUDE.md § 8 ③-relay 정본 **5회차** 정식 적용 (U · W · X · AC · **AD 다섯 번째**)

---

## 요약

Kyu 원문 요구 (2026-09-02):
> "PR 카드가 test-checklist 를 파싱해서 카드에 케이스 개수 · 진행도 · 상세 화면에서
> 탭 판정 · 새로고침 후 유지 · 폰↔맥 동기 되게 해라. 매번 오케한테 뭐 테스트해야
> 하냐고 물어보고 있다."

**뿌리**: `src/lib/parser/test-checklist.ts:60-62` = `test-checklist:` **키 하위** 만 파싱.
실 PR body 관행 = `pr-test-checklist-guide.md` (relay 루트 정본) 형식 = **bare 리스트**
(`- id:` 시작 · `## test-checklist` heading + fence). 두 형식 중 후자를 파서가 못 잡음.

**착지 5건 + 이연 1건 + Q2 wrapper skeleton** (Kyu 답변 그대로):
- AD-1 파서 재작성 (bare + heading/fence 관대 · state 3종)
- AD-2 카드 진행도 (`확인 N항 중 M 완료`)
- AD-3 D1 case_state (신 테이블 + API + 상세 탭 UI + 즉시 저장)
- AD-5 summary fallback (checklist_state 3-way 문안)
- AD-7 todoboss 포트 4173 → 4321 (T0-0824-A 이관 · vite.config.ts 실측)
- AD-4 이연 = kyu-gate 완결 반자동 도장 UI (다음 라운드)
- Q2 kyu-gate 도장 트리거 **단일 지점** wrapper (skeleton) · SPEC § 5 정합 · 미래 자동 승격 소폭 변경 준비

---

## 심문 결과 (Kyu 회신 5문 · 5회차)

| Q | 회신 | 정합 |
|---|------|------|
| Q1 저장 계층 | **(a1) D1 신 테이블 · approvals-db 재사용 · decided_at·decided_by 필수** | migrations/0002_case_state.sql |
| Q2 kyu-gate 도장 | **(b2) 반자동 · Kyu 클릭 + 단일 지점 wrapper (소폭 변경으로 자동 승격 가능하도록)** | src/lib/kyu-gate-stamp.ts |
| Q3 파싱 미준수 감지 | **(c3) heading OR fence 관대 · 실 PR 이 이미 정본 형식** | detectChecklistIntent |
| Q4 저장 시점 | **(d1) 즉시 저장 · undo = 반대 탭** | setCaseState 낙관적 반영 + 즉시 PUT |
| Q5 AD-6 | **PR 확인 항목 편입 · Kyu 재확증** | test-checklist self · launcher-button-ac1f 항목 |
| Q6 착지 범위 | **AD-1+2+3+5+7 이번 · AD-4 다음** + Q2 skeleton | 정합 |

**부수 조건 승인**:
- (a) semi-auto stamp = Kyu 명시적 클릭 필수
- (b) **stamp trigger 단일 지점** = 이 라운드 정본 (Kyu 원문 인용):
  > "체크리스트 품질이 라운드를 거쳐 검증되면 자동 도장으로 전환할 수 있으므로,
  > 전환이 코드 소폭 변경으로 가능하도록 도장 트리거 지점을 한 곳으로 모아라.
  > 그 지점을 리포트에 명기해라."
- (c) Marker 조건 ② (docs-only PR 자동 도장) = 이 wrapper 소비 밖 · 별건 관리 유지

---

## Q2 kyu-gate 도장 트리거 지점 (Kyu 명기 요구 · 정본)

**정본 파일** = `src/lib/kyu-gate-stamp.ts`
**정본 함수** = `stampKyuGate(env, input, fetchImpl?, installationTokenOverride?)`

### 현행 호출자 2 종

1. **`src/lib/submit.ts::tryCreateCheckRun`**
   - Kyu 판정 제출 (submit 경로)
   - `trigger: 'submit'`
2. **`src/routes/api/kyu-gate-stamp/+server.ts`**
   - [🖋 kyu-gate 도장] 반자동 endpoint (skeleton · Q2 b2)
   - `trigger: 'manual-button'`
   - 서버 재검증 = pass 도장은 D1 전 case pass 필수

### 미래 자동 승격 절차 (Kyu 명시 목표 · SPEC § 5 완화 시)

- **새 호출자 파일 1건 편입** (예: 케이스 전 pass 감지 → 자동 stampKyuGate 호출)
- **이 파일 (`kyu-gate-stamp.ts`) 로직 무변경**
- **활성화 조건만 변경**
- **소폭 변경 = 새 호출자 파일 1건 + 활성화 조건 · 그 이상 아님**

### Marker 조건 ② 정본 (docs-only PR 자동 도장)

- 이 wrapper 소비 **안** 함 (별건 관리)
- 이 wrapper = "확인 항목 있는 PR 판정" 정본
- 별건 관리 근거 = docs-only PR = 확인 항목 없음 · Q2 활성화 조건 (전 case pass) 판정 자체 대상 아님

---

## 착지 파일 (정본)

### 신설
- `migrations/0002_case_state.sql` — Kyu 감사 이력 정본 = decided_at·decided_by 필수
- `src/lib/case-state-store.ts` — D1 CRUD (`upsert · list · summarize`)
- `src/lib/kyu-gate-stamp.ts` — **Q2 정본 단일 지점 wrapper**
- `src/routes/api/case-state/+server.ts` — GET (PR 단위 · repo 요약) + PUT
- `src/routes/api/pr-cases/+server.ts` — 실 PR body 파싱 endpoint (mock 폴백)
- `src/routes/api/kyu-gate-stamp/+server.ts` — 반자동 도장 skeleton

### 재작성/편입
- `src/lib/parser/test-checklist.ts` — 재작성 (state 3종 · bare 리스트 · 관대 감지)
- `src/lib/github.ts:40-52` — `checklist_state · case_count` 필드 편입
- `src/lib/data-source.ts:82-86` — mock 정합
- `src/lib/PrList.svelte:26-29,71-98,197-224,362-395` — progressMap · progress 렌더 · checklist_state 3-way fallback
- `src/routes/pr/[owner]/[repo]/[id]/+page.svelte:87-95,145-176,201-296,1175-1247` — 실 PR body 로드 · D1 case_state 로드 · 즉시 저장 · D1 감사 caption · malformed vs missing UI
- `src/lib/submit.ts:224-267` — stampKyuGate 위임 (단일 지점)

### AD-7 부수 (todoboss 4173 → 4321 · T0-0824-A 이관)
- `config/projects.json` — previewPort 4321 + `_portComment` 정정
- `tools/kyu-devenv/src/registry.mjs:73` — 포트 매트릭스
- `tools/kyu-bridge/src/hubs.mjs:86` — 하드코딩 fallback
- `tools/kyu-bridge/src/server.mjs:51` — FALLBACK_PORT_MATRIX
- `src/lib/bridge-commands.ts:104` — defaultBaseUrl
- 각 test fixture (registry.test.mjs · bridge-commands.test.ts · preview-flow.test.mjs · hubs-onboarding.test.mjs)

### 문서
- `docs/SPEC.md` v1.46 (§ 11 변경 이력)
- `docs/design/kyu-orchestrator-v0.3.md` § 9.23
- `docs/requirements-tracking.md` K46 + AD 이연 순증감

---

## QC

- **pnpm check** = 979/0/0 (신설 파일 반영 후 무결)
- **pnpm test** = 60 files · 787 pass (기존 783 + 신설 4)
  - `src/lib/parser/test-checklist.test.ts` = bare 리스트 · malformed 감지 · self-parsing 신설
- **pnpm build** = ✔ 5.51s · adapter-cloudflare
- **git** = clean · commit `00aa814`

---

## Kyu 실기 절 (self-contained · CLAUDE.md § 9.5 정합)

### 배포 완료 후 (auto-deploy)

1. Cloudflare Workers Builds 대시보드 → Deployments 새 버전 확증 (SHA `<merge SHA>`)
2. **D1 migration 적용** (Kyu 로컬 CF 로그인):
   ```bash
   npx wrangler d1 migrations apply approvals-db --remote
   ```
   확증: `npx wrangler d1 migrations list approvals-db --remote` → `0002_case_state` = Applied
3. `curl -s https://test.curiocity.company/api/case-state?repo=test-portal&summary=1 -H 'CF-Access-Client-Id: ...'` = 200 · `{ summary: [] }` (초기)

### 홈 카드 · 파서 self-parsing

4. `https://test.curiocity.company/prs` (또는 `/hub/k0`) 접속
5. K0-0902-AD PR 카드 검색 · `test-portal_PR#79`
6. 카드 = "확인 5항 중 0 완료" 진행도 뱃지 노출 확증 (self-parsing OK)
   - 파싱 실패 시 = "이 PR 은 확인 항목 형식을 따르지 않음" 노출 → 회귀 별건

### 상세 화면 · D1 판정

7. 이 PR 카드 클릭 · 상세 진입 · 5개 확인 항목 렌더 확증
8. `self-parse` 항목 [✓ 통과] 탭 → 홈 재조회 → "확인 5항 중 1 완료" 즉시 반영
9. `fail-reason` 항목 [✕ 실패] 탭 · 사유 textarea `테스트 사유` · blur → `.d1-audit` caption `사유: 테스트 사유` 노출 확증
10. 새로고침 → 판정 상태 유지 확인

### 폰↔맥 동기 (Kyu 요구 정본)

11. 폰 사파리 로그인 · 이 PR 상세 접속 · 다른 항목 판정
12. 맥 브라우저 · 같은 PR 상세 조회 · 판정 상태 반영 확인 (Access JWT · D1 정본)

### AD-6 재확증

13. 홈 카드 자체에 [🚀 테스트 환경] 버튼 노출 (상세 진입 없이) 확증 (AC-1f 착지 확증)
14. 노출 안 되면 별건 회귀 라운드 착수

### AD-7 확증

15. `curl -s http://localhost:4321/` 실측 (todoboss dev 서버 실행 후) = TODOBOSS admin 페이지 응답 · 4173 아님

---

## 이연 순증감

**AD 신규 이연**:
- **AD-4** = kyu-gate 완결 반자동 도장 UI ([🖋 kyu-gate 도장] 버튼 활성화 · UI 노출 · Kyu 클릭 배선) · 다음 라운드
- **AD-6 재확증** = Kyu 실기 확인 (LauncherButton 카드 노출) · 실기 답변 회수 대기
- **자동 승격 조건 판정** = AD-4 착지 후 여러 라운드 검증 후 SPEC § 5 재해석 · 별건

**AD 이연 회수** = 없음

**원장 총** = K44 오케 확장 (기존) + K45 프리뷰 원버튼 실기 (기존) + **AD-4 · AD-6 재확증 (신규)**

---

## 다음 라운드 대비

- **AD-4** = [🖋 kyu-gate 도장] 완결 UI (활성화 조건 = 전 case pass · 카드/상세 노출 · Kyu 클릭 → `/api/kyu-gate-stamp` POST)
- **AD-6 재확증 결과 반영** = LauncherButton 노출 확증 or 회귀 별건
- **자동 승격 조건** = 별건 라운드 · SPEC § 5 재해석 대기

Kyu 실기 회신 후 다음 라운드 착수.
