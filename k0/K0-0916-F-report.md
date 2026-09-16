---
round: K0-0916-F
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/109
base: 316b27c
spec_bump: v1.K0-0916-F
req: [K0-BB-1, K0-BB-2, K0-BB-3, K0-BB-4, K0-BB-5, K0-BB-6]
ledger: [R002, R013]
finished_at: 2026-09-16
---

# K0-0916-F · yaml PATCH API + 실 데이터 소비 + 큐 이관 실행 (착지 리포트)

**Kyu 원문 (2026-09-16)**: "yaml PATCH API + 실데이터 소비 + 큐 이관 실행 + 시트 3종 실기 초안" · 6 항목 지시.

**base** = main@316b27c (K1-0916-D 오케 머지 후 · build-index requirements[] 20 필드 확장 완결).
**PR** = #109.
**착지 직전 origin/main 재병합** = K1-0916-D 편입 (build-index 확장 · session-manager-ab 회수 · 데몬 재기동) · SPEC.md 충돌 없음 · AGENTS.md 잠시 이동 후 merge.

## 원장 대사 (ledger_events)

| R-id | 상태 | 이 라운드 처리 | 다음 단계 |
|---|---|---|---|
| **R002** | issued → verified (진행) | 실 데이터 배선 = fetchRelayLedger · 트레이스 점 5 · 출처 칩 3종 · PATCH 왕복 정본. **마감 근접** (실 확증만 남음) | Kyu 프로덕션 실기 → done |
| **R013** | issued → done (완결) | ops/dispatch 폴더 4 삭제 · relay yaml R101~R107 등재 · CLAUDE.md § 7 갱신 | 완결 |
| R101~R107 | (신설·filed) | inbox 7건 이관 · R101 next=true · R105 conflict_with R104 | 우선순위 발부 대기 |

## 파일 경계

Kyu K0-0916-F 원문 명시 승인 = K0 + **api/ledger/patch 신설 예외** (평소 K0 = api 제외 규약 이번은 예외).

K1/K2 소유 파일 침범 없음 (base 재병합으로 K1 build-index 편입만 수용).

## 6 항목 소화

### BB-1 · `/api/ledger/patch` 신설

- 3 액션: `priority-change` · `conflict-resolve` · `blocked-clear`.
- 흐름: GET contents/ledger/requirements.yaml (sha) → js-yaml parse → 패치 → dump → PUT (오케 봇 커밋).
- 응답: `{ok, id, action, before, after, commit_sha, commit_url}`.
- 인증: Access JWT + Workers secret `GITHUB_TOKEN`.

### BB-2 · 실 데이터 소비

- `fetchRelayLedger()` = raw index.json (K1-0916-D build-index 정본 · 20 필드).
- **status → column** 매핑 정본: `filed→waiting` · `issued→implementing` · `landed→landing` · `verified→drilling` · `done→merged` · `deleted→null`.
- 폴백 = 시드 · 데이터 소스 배너 `data-source="live"|"seed"` (수집 전 회색 명시).

### BB-3 · 트레이스 점 5 + 출처 칩

- **트레이스 점 5** = `TRACE5_KINDS = ['read','reconcile','priority','issued','landed']` · seen=true 는 accent 파랑.
- **출처 칩 3종** (Kyu 원문): 데몬 감지 (read/reconcile/consume) · 리포트 (report-push/inquiry-push) · 오케 (dispatch/priority/mismatch).

### BB-4 · 로컬 draft 폐지

- BA-6 로컬 draft (`conflictLog` · `hiddenIds`) 전량 폐지.
- 재편 = [삭제]/[유지]/[우선순위 바꾸기]/[blocked_by 해제] 전부 PATCH 왕복 → refetchLedger → 즉시 반영.
- `patchPending: Record<id, boolean>` UI 잠금 · `patchError` 노출.

### BB-5 · 큐 통합 이관 실행

- **relay `ledger/requirements.yaml`** 안 R101~R107 등재 (오케 승인 = Kyu 원문).
- **`ops/dispatch/{inbox,active,await-kyu,done}/`** 폴더 4종 git rm -rf.
- **`ops/dispatch/README.md`** = 폐지 아카이브 편입.
- **`CLAUDE.md § 7`** = "relay 원장 = 유일 큐" 갱신 (raw fetch 정본).

### BB-6 · 폰 시트 3종 실기 ok/ng 초안

**태스크 시트** (`/pr/...` 상세 아니고 흐름판 카드 클릭)
- **절차**: 흐름 탭 → 카드 하나 (예: R101) 제목 눌러 태스크 시트 아래에서 열림.
- **ok**: 시트 상단에 R101 제목 · ID · 발부 · 크기·우선순위 · 경과 · 트레이스 점 5 (5개 점 가로) · "히스토리 (events 합류)" 아래 최대 10건 (각 항목에 출처 칩 = 데몬 감지/리포트/오케 3색 중 하나) · 하단 액션 4개 = [우선순위 바꾸기] [관련 PR] [원문 전체] (blocked_by 있으면 [blocked_by 해제] 추가).
- **ng**: 시트가 안 열림 · 트레이스 점이 5개 미만 · 히스토리가 안 뜨거나 "수집 전" 만 계속 표시 · [우선순위 바꾸기] 눌렀는데 아무 반응 없음 or 빨강 경고.

**허브 시트** (허브 셀 클릭)
- **절차**: 흐름 탭 → 왼쪽 허브 셀 (예: K0) 눌러 시트 열림.
- **ok**: 시트 상단 "K0 (화면)" 이름 · 파일 N 수정 · 테스트 N 통과 요약 라인 · "세션 로그 (시간순)" 아래 이벤트 목록 · 하단 [심문 열기] [터미널 로그] 2 버튼.
- **ng**: 시트 안 뜸 · 파일/테스트 숫자가 안 뜨거나 "수집 전" 만 · 세션 로그 비어 있음 (실 events 소비 실패).

**실기 시트** (실기 열 카드 클릭)
- **절차**: 흐름 탭 → "실기" 열 카드 (drilling) 제목 눌러 실기 시트 열림.
- **ok**: 시트 안 "남은 항목: N" 표시 · 기기 칩 [폰] [맥] · 하단 큰 파랑 [실기하기 → PR 상세] 버튼 · 누르면 상세 페이지로 이동.
- **ng**: 시트 안 열림 · "PR 정보 부재 (landed_pr 편입 대기)" 메시지만 (mock 데이터 부족) · [실기하기] 눌렀는데 상세 페이지로 이동 안 함.

## 자기 검증 결과

- `pnpm check` = 1049 files · **0 err** · 81 warnings (v2 legacy CSS unused)
- `pnpm test` = 74 test files · **987 pass** (K1-0916-D 에서 session-manager-ab 회수 완결)
- `pnpm build` = adapter-cloudflare done (js-yaml `import * as yaml` ESM 정정)
- Playwright chromium-phone = **30 pass · 12 skip · 0 fail** (신 spec `portal-ledger-bb` 3 pass 포함 · BA a4/a6 = F 이관 skip)

## 성능 예산 · 커밋 규약

- 커밋 메시지 = `!` 미포함.
- PR body frontmatter + test-checklist `req:` 필드 포함.
- ledger_events 표 편입 (이 리포트 상단).

## 다음 라운드 인수

- **K0** = 프로덕션 실 확증 (Cloudflare Workers secret `GITHUB_TOKEN` 편입 후 3 액션 왕복 각각 · commit 이력 확인).
- **K2** = R001 스크린샷 원시 이슈 회수 실 진행.
- **K1** = events 안 `req_ids` 필드 정밀 매핑 (지금 target 만 · req 별 히스토리 필터링 향상).

## 파일 변경 요약

- **A** `src/routes/api/ledger/patch/+server.ts` (신설 · api 경계 예외)
- **A** `e2e/portal-ledger-bb.spec.ts` (3 pass)
- **A** `docs/spec/k0.md § K0-BB-1~6`
- **M** `src/lib/ui/flow-data.ts` (fetchRelayLedger · statusToColumn · TRACE5_KINDS · eventSourceChip)
- **M** `src/lib/ui/FlowBoard.svelte` (실 데이터 소비 · PATCH 왕복 · 트레이스 점 5 · 출처 칩 · patchPending)
- **M** `CLAUDE.md § 7` (relay 원장 = 유일 큐)
- **M** `ops/dispatch/README.md` (폐지 아카이브)
- **D** `ops/dispatch/{inbox,active,await-kyu,done}/` 폴더 4종 (내용 전량 · .gitkeep 포함)
- **M** `curiocity-relay/ledger/requirements.yaml` (R101~R107 등재 · 별건 상대 리포)
- **M** `docs/state/k0.md · docs/tracking/k0.md § K103`
- **M** `e2e/portal-flow-ba.spec.ts` (a4/a6 F 이관 skip)
