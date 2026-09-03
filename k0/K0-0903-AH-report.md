# K0-0903-AH · 리포트 (AG 실기 결함 3 fix + AG-3 이월)

**round**: `K0-0903-AH`
**hub**: k0 (test-portal)
**PR**: https://github.com/CuriocityDevAi/test-portal/pull/84
**branch**: `feat/k0-0903-ah-copy-dedup-progress-rows`
**commit**: `6166ac7`
**timestamp**: 2026-09-03

---

## 요약

**AG 실기 통과** (Kyu 09-03 데스크톱 스샷 3장):
- 하단 탭 3 · 데스크톱 중앙 컬럼 · 인박스 필터링 · 인라인 승인 UI 정합.

**내용 결함 5 회수** (AH 라운드):
- AH-1 인박스 말투 (승인 원문 · PR 라운드 ID · 프로젝트명 앞)
- AH-2 진행도 6/5 (분자 > 분모)
- AH-3 승인 중복 (같은 사유 2건)
- **AH-4 (AG-3 이월)** = 카드→구분선 행 · pill 하나 (4색) · 종합/케이스 판정 분리 · 허브 hubs.json 경고 제거

---

## 뿌리 · 정본 조치

### AH-1 인박스 사용자 언어 + 프로젝트명 접두

**뿌리**:
- `shortHeadline` 이 라운드 ID 접두 (`K1-0902-B+C+D · ...` · `[K0-0903-AG]`) 제거 안 함
- `buildApprovalInboxItems` 이 승인 큐 `question` 원문 그대로 전달
- 승인 항목 = 프로젝트명 접두 없음 (허브 코드 만 노출)

**정본 조치** (`src/lib/inbox.ts`):
- `stripRoundIdPrefix(text)` 신설 · 관대 매칭 (`[K0-0903-AG]` · `K1-0902-B+C+D ·` · `K0-0728-K:` 등)
- `shortHeadline` 접두 제거 후 첫 절
- `HUB_TO_PROJECT_SLUG` 매핑 (n0 → grownest · t0 → todoboss · m0 → storeport · k0 → test-portal)
- `projectNameFromHub(hub)` → 프로젝트 표시명
- `humanizeApprovalQuestion(question, hub)` 패턴 매칭:
  - `파일럿 정지 · invoke error 연속 3회 (Kyu 개입 필요)` → `test-portal 자동 실행이 3번 실패해 멈췄습니다`
  - `파일럿 정지` (일반) → `{프로젝트} 자동 실행이 멈췄습니다`
  - 매핑 없음 → 접두 제거 + 프로젝트명 접두 유지
- `humanizeApprovalOption(label)` 괄호 안 개발자 언어 제거 · 사람 언어 매핑:
  - `재시도 (resume-loop)` → `다시 시도`
  - `중단 (수동 조사)` → `멈춰두기`

**실 PR 제목 fixture 5종** (Kyu 실측 사례 재현):
- `K1-0902-B+C+D · 자동 승인 배선` → `자동 승인 배선`
- `K0-0903-AG · 포털 재설계` → `포털 재설계`
- `[K0-0728-K] 부트스트랩` → `부트스트랩`
- `K0-0902-AF: 결함 fix` → `결함 fix`
- `N0-0728-K · docs(handoff) 부트` → `docs(handoff) 부트`

### AH-2 진행도 6/5 clamp

**뿌리 명기** (Kyu 요구):
- 실측: PR body 확인 항목 5건 · D1 case_state 조회 6건 → 인박스 "6/5"
- **뿌리 = PR body case_id 갱신 시 이전 case_state row 잔존** (`INSERT ON CONFLICT DO UPDATE` 는 PK 매치일 때만 · case_id 변경 시 old row 삭제 안 됨)
- `/api/case-state?repo=X&summary=1` = SQL `COUNT(*)` · PR body 현재 case_id 필터 없음
- 따라서 D1 총량 (6) > PR body 실 case (5)

**이번 라운드 조치 (UI clamp)**:
- `buildPrInboxItems` 안:
  ```typescript
  const p = {
    pass: Math.min(raw.pass, pr.case_count),
    fail: Math.min(raw.fail, Math.max(0, pr.case_count - Math.min(raw.pass, pr.case_count))),
    total_decided: Math.min(raw.total_decided, pr.case_count)
  };
  ```
- 분자 > 분모 UI 표시 금지 · 신설 테스트 2 (6/5 → 5/5 · 3+1/2 → 2/0)

**정본 fix (다음 라운드 · 별건)**:
- 서버 사이드 `/api/case-state?summary=1` 에 PR body case_id join 편입
- old row 정리 = migration/재적재 규칙 · 별건 판정

### AH-3 승인 중복 dedup

**뿌리**:
- Kyu 실측: 같은 "파일럿 정지" 승인 항목 2건 pending
- 승인 큐 = id 기반 uniqueness · 데몬이 같은 이벤트를 다른 id 로 재적재 시 pending 2건
- `upsertApproval` 는 id 매치일 때만 idempotent

**정본 조치** (`src/lib/approvals-store.ts:173-186`):
```typescript
// K0-0903-AH-3 · 0) dedup 사전 조회 · hub + question + pending 매치
const dupRow = await db
  .prepare(
    `SELECT * FROM approvals
     WHERE hub = ? AND question = ? AND status = 'pending' AND id != ?
     LIMIT 1`
  )
  .bind(a.hub, a.question, a.id)
  .first<ApprovalRow>();
if (dupRow) {
  return rowToApproval(dupRow);  // 기존 pending 유지 · 새 id 삽입 skip
}
```
- Kyu 원문 정본 = 데이터 계층 dedup (인박스 클라이언트 dedup 은 원본 은폐 회피)
- 신설 테스트 2 (중복 pending 무시 · 판정 완료 후 새 pending 허용)

### AH-4 PR 목록 카드→행 + pill + 종합/케이스 분리

**정본 조치**:

**PrList.svelte 재작성**:
- 카드 폐지 · 구분선 행 (GitHub 문법)
- `.rows` `.row` `.row-body` (min-height 56px 터치)
- `.row-icon` (● · pill color) · `.row-content` (제목 1줄 · 메타 1줄 = `#N · date · N/M · 판정 라벨`)
- `.pill` 4색 고정 (Primer StateLabel 준용):
  ```typescript
  function pillState(pr) {
    if (pr.merged) return { label: '성공', color: 'var(--pass)' };
    if (pr.pr_state === 'closed') return { label: '보류', color: 'var(--hold)' };
    if (pr.kyu_gate === 'fail') return { label: '실패', color: 'var(--fail)' };
    return { label: '대기', color: 'var(--wait)' };
  }
  ```
- `stripRoundIdPrefix` 소비 → 제목 접두 제거
- 폐지: `gateMeta` · `envMeta` · `.wait-badge` · `.env-btn` chip · `.accent-bar` · `.decided-badge` · CSS 200+ 라인

**상세 화면 종합/케이스 판정 분리** (Kyu 원문 · 09-03 실측 자기 검증 PR 순환 해소):
- `onSubmitClick` gate 완화:
  - verdict 필수 (종합 판정) - 유지
  - 미판정 case + `verdict === 'pass'` = confirm 다이얼로그 (강제 아님)
  - `verdict === 'fail'` 또는 `'hold'` = case 무관 즉시 제출
- 다이얼로그 문안: `미판정 확인 항목 있음` + `[돌아가서 판정][그대로 성공으로 제출]`

**허브 탭 hubs.json 경고 제거** (Kyu 원문 = 사용자 무의미):
- `.hubs-fallback-banner` UI + CSS 폐지
- 설정 화면 이관 후보 · 별건 라운드

---

## 정본 파일

### 편입
- `src/lib/inbox.ts` — `stripRoundIdPrefix` · `HUB_TO_PROJECT_SLUG` · `projectNameFromHub` · `humanizeApprovalQuestion` · `humanizeApprovalOption` · `buildPrInboxItems` clamp
- `src/lib/approvals-store.ts:173-186` — dedup pre-check
- `src/lib/PrList.svelte` — 카드→행 재작성 · pill · gateMeta 폐기
- `src/routes/pr/[owner]/[repo]/[id]/+page.svelte:665-693,1682-1694` — gate 완화 · 다이얼로그 문안
- `src/routes/hub/+page.svelte` — hubs-fallback-banner 폐지

### 테스트
- `src/lib/inbox.test.ts` — 신설/확장 22 (stripRoundIdPrefix 6 · shortHeadline 3 · humanizeApprovalQuestion 4 · humanizeApprovalOption 4 · projectNameFromHub 5 · clamp 2)
- `src/lib/approvals-store.test.ts` — dedup 2 + `fixture(id)` question id 개별화
- `tools/kyu-bridge/test/approvals-e2e.test.mjs` — MockStmt.first dedup 쿼리 지원

### 문서
- `docs/SPEC.md` v1.50 (§ 11)
- `docs/design/kyu-orchestrator-v0.3.md` § 9.27
- `docs/requirements-tracking.md` K50 + AH 이연 순증감

---

## QC

- **pnpm check** = 986/0/0
- **pnpm test** = 63 files · 845 pass (기존 819 + 신설 26)
- **pnpm build** = ✔ (adapter-cloudflare)
- **git** = clean · commit `6166ac7`

---

## Kyu 실기 절 (사람 언어)

배포 후:
1. `/prs` 접속 · 목록 = 구분선 행 (박스 아님) · pill 하나 · 라운드 ID 접두 없는 제목
2. `/` 인박스 · 승인 항목 = "test-portal 자동 실행이 3번 실패해 멈췄습니다" 문장 · 버튼 [다시 시도] [멈춰두기]
3. 진행도 = 6/5 등 분자 > 분모 없음
4. 같은 사유 승인 항목 = 1건만
5. PR 상세 · 확인 항목 일부만 판정 · verdict=성공 · 제출 → 다이얼로그에서 [그대로 성공으로 제출] 가능
6. 허브 탭 상단 = "hubs.json" 경고 없음

---

## 이연 순증감

**AH 신규 이연**:
- **AH-2 뿌리 정본 fix** = 서버 사이드 case_id join · 현재는 UI clamp · 별건 라운드
- **AH-4 잔여** = 상세 확인 항목 목록↔상세 병행 (전 항목 목록 · 각 줄 pass/fail · 줄 누르면 확대) 다음 라운드
- **AG-5** 디자인 토큰 = 그대로 유지 · 다음 라운드

**AH 이연 회수**:
- **AG-3 이월** = **회수** (AH-4 이번 라운드 착지)

**원장 총** = K44/K45 · AD-4/AD-6 재확증 · AE (verdict 3분화 · 재판정 · 컴포넌트명) · AF (/prs ratio) · **AG-3 잔여** (상세 병행 다음 라운드) · **AG-5 토큰** · **AH-2 서버 fix**

---

## 다음 라운드 대비

Kyu AH 실기 회신 후:
- **AI (예상)** = AG-5 디자인 토큰 (Primer primitives · octicons · registry 단일)
- 또는 **AI** = AH-4 잔여 (상세 확인 항목 목록↔상세 병행)
- 또는 **AI** = AH-2 서버 사이드 case_id join
- 또는 **AI** = AH 실기 결함 회수 (또 나오면)

Kyu 판정 대기.
