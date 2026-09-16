---
round: K1-0916-B
pr: https://github.com/CuriocityDevAi/test-portal/pull/106
outcome: 자기 검증 통과 (192 이벤트 실 감지 · relay events 배관 · build-index schema v3 · 밀림 push cron · 5분 배치 · trace5 · rollup 정본)
ledger_events:
  - '{"id":"R002","action":"consume","note":"이벤트 소스 · 이 라운드 착지"}'
  - '{"id":"R013","action":"consume","note":"큐 통합 · relay prompts 규약 재정의 + K0-0911-AQ-test 삭제"}'
  - '{"id":"R006","action":"defer","note":"알림 실기 = 마일스톤 대기"}'
kyu_checks:
  - 데몬 재기동 후 5분 이내 relay events/<hub>/<date>.ndjson 파일 자동 생성 · line 증가
  - relay index.json.rollup 정본 (filed_count · max_age_days · red_count)
  - 다음 월요일 09:00 WIB (UTC 02:00) 자동 backlog push · 문구 "미발부 N · 최장 N일 · 🔴 N"
  - reports[].ledger_events frontmatter 편입 · build-index reports 안 캡처
  - prompts/k0/K0-0911-AQ-test.md 삭제 확증 · 새 프롬프트 파일은 req_ids 필수
---

## 요지

R002 이벤트 소스 (Kyu 정본 · `note: 이벤트 소스 = K1-0916-B`) 완결. 5항 (A1 세션 관측 · A2 report ledger_events · A3 requirements 집계 · A4 prompts 통합 · A5 월요일 push) + Kyu K1-0916-C 회신 5 answer + 3 역제안 전량 채택.

## 1. Kyu K1-0916-C 회신 반영 요약

| 항목 | Kyu 정본 | 착지 |
| --- | --- | --- |
| Q1 · event type | 8종 (read/reconcile/dispatch/report-push/inquiry-push/mismatch/**priority**/**consume**) · session=jsonl UUID · target=abs path/URL · req_ids 추정 | `session-events-watcher.mjs:classifyTarget` 정본 |
| Q2 · trace5 | K0-0916-E 정본 = read/reconcile/priority/issued/landed 각 `{seen, last_ts}` | `build-index.mjs:collectRequirements` 정본 · status 필드 별도 |
| Q3 · mismatch | (a) session 매칭 부재 + (b) R-id 원장 부재 병행 · window=session 전체 | `detectMismatches` 정본 |
| Q4 · cron | `0 2 * * 1` UTC · "미발부 N · 최장 N일 · 🔴 N" | `build-index.yml` schedule + backlog notify step |
| Q5 · prompts | (a) K0-0911-AQ-test.md 삭제 + (b) README prompts 규약 | 관련 파일 삭제 + [prompts 규약] 절 신설 |
| D1/D2/D3 | 전량 채택 | events-cursor · 5분 배치 · 자정 회전 |

## 2. A1 · 세션 로그 관측 (session-events-watcher.mjs)

**신설 파일**: `tools/kyu-bridge/src/session-events-watcher.mjs`

**흐름**:
1. `~/.claude/projects/<slug>/*.jsonl` tail (60초 간격)
2. `type=assistant` line 안 `tool_use` 파싱 · Read/Edit/Write 안 `file_path` 캡처
3. `classifyTarget()` 로 event type 판정 (8종)
4. PROJECT_HUB_MAP: 7 프로젝트 slug → 6 hub id (k0/k1/k2/n0/t0/m0)
5. cursor `~/.kyu-bridge/events-cursor.json` (D1 · 세션별 lastLine)
6. in-memory buffer (D2 · 5분 배치)
7. flush → relay `events/<hub>/<YYYY-MM-DD>.ndjson` append (D3 · 자정 회전)

**실측**:
```
[events-watcher] tick · +192 events · buffer=192
```

**10 이벤트 sample**: `docs/audits/K1-0916-B-events-sample.ndjson` (최근순)

## 3. A2/A3/A4/A5 · relay `scripts/build-index.mjs` schema v3

**신 필드** (index.json):
- `schema_version: 3` (v1/v2 호환)
- `requirements[]` (28 items · trace5 + age_days + status/priority/repeat_count)
- `events[]` (최근 30일 · 시간 순)
- `mismatches[]` (report ledger_events vs 세션 관측)
- `warnings[]` (prompts req_ids 부재)
- `rollup: {filed_count, max_age_days, red_count}`

**로컬 실행 실측**:
```
$ node scripts/build-index.mjs
✓ index.json · prompts=1 · reports=25 · checks=7 · requirements=28 · events=0 · mismatches=0 · warnings=1 · rollup=(filed=13, max_age=27d, 🔴=2)
```

**warnings 실측 (A4 정합)**:
```json
[{"type":"prompt_missing_req_ids","path":"prompts/k0/K0-0911-AQ-test.md","id":"K0-0911-AQ-test"}]
```
→ K0-0911-AQ-test.md 삭제 완료 (A4 Q5 (a))

## 4. A5 · 월요일 09:00 WIB backlog push

`.github/workflows/build-index.yml`:
- schedule cron `'0 2 * * 1'` UTC 편입
- 신 step `Backlog push (월요일 09:00 WIB)` · schedule/workflow_dispatch 트리거
- POST `/api/push/notify` payload `{event:"backlog.weekly", title:"요구 밀림", body:"미발부 N · 최장 N일 · 🔴 N"}`
- CF Access Service Token 헤더 편입 (기존 Notify step 정합)

## 5. relay events 규약 (README 신설)

**폴더**: `events/<hub>/<YYYY-MM-DD>.ndjson`
**line 스키마** (Kyu K1-0916-C Q1):
```json
{"ts":"2026-09-16T07:02:51Z","hub":"k1","type":"read","target":"/abs/path or URL","session":"<jsonl-basename-uuid>","req_ids":["R002"]}
```
type 8종 상세: README `[events 규약]` 절.

## 6. relay prompts 규약 (README 신설)

`req_ids` 필수 · 부재 = build-index warnings. R-id 원장 참조 규약. README `[prompts 규약]` 절.

## 7. DOC + BUILD

- SPEC § 11 v1.K1-0916-B · § K1-events-source · § K1-events-schema · § K1-build-index-v3 · § K1-prompts-req_ids · § K1-monday-backlog-push · § K1-report-ledger_events
- docs/state/k1.md Active K1-0916-B 편입 · SPEC 절 1 신설
- docs/tracking/k1.md K75 등재
- docs/audits/K1-0916-B-events-sample.ndjson (10 line)

```
$ pnpm test  →  74 files · 987 pass
$ pnpm check →  0 err · 57 warn (legacy)
```

## 8. 관련 리포트 · relay push

- test-portal PR#106 (feat/k1-0916-b-events)
- curiocity-relay commit e5e85f4 = schema v3 · README/workflow/build-index/prompts 정리
- k1/K1-0916-B-inquiry.md 삭제 (K1-0916-C 소비)

## 9. 다음 라운드 인수

- **첫 flush 5분 후** = relay events/<hub>/<date>.ndjson 실 파일 생성 확증 (Kyu 실기)
- **월요일 09:00 WIB push** = cron 자연 트리거 (Kyu 실기)
- **iOS PWA subscribe** = 알림 배너 실 수신 (Kyu 실기 · R006 마일스톤 대기)
- **K0-0916-E** = R002 UI 소비 (흐름판 · 별건 K0 라운드)
- **K2-0916-B** = 지표 파생 (R002 · 별건 K2 라운드)

*K1-0916-B · 2026-09-16 · R002 이벤트 소스 정본 착지 · 배관 허브 6번째 라운드*
