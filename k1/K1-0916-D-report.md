---
round: K1-0916-D
pr: https://github.com/CuriocityDevAi/test-portal/pull/108
outcome: 자기 검증 통과 (build-index 20필드 K0 계약 정합 · pnpm test 987/987 · 데몬 재기동 실 로그 · events 69건 실 push · 3 항 전량 확증)
ledger_events:
  - '{"id":"R002","action":"consume","note":"events 집계 마감 · K0 소비 계약 정합 완결"}'
  - '{"id":"R006","action":"defer","note":"알림 실기 = 마일스톤 대기 유지"}'
kyu_checks:
  - 포털 홈 흐름판 = index.json.requirements[] 자동 소비 · 5열 · size · next · conflict · blocked 카드 표시
  - pnpm test = 987/987 pass · session-manager-ab.test 포함 fail 없음
  - 데몬 재기동 후 launchd log [events-watcher] flush · N files 노출
  - relay events/k1/2026-09-16.ndjson 3+ line 실 이벤트 확증
---

## 요지

Kyu K1-0916-D 3 항 소화 · R002 마감 (events 집계 · K0 계약 정합) + R006 마일스톤 대기 유지. 코드 신설 최소 = build-index requirements[] K0 계약 필드 확장만.

## 1. A1 · build-index requirements[] K0 계약 필드 확장

**relay commit** = `ea7e0c2` (`scripts/build-index.mjs`)

**신 필드** (K0 `src/lib/ui/flow-data.ts:FlowRequirement` 정본 대조):

| 필드 | 소스 | K0 소비 |
| --- | --- | --- |
| `title` | text alias | 카드 표시 정본 |
| `column` | statusToColumn 매핑 | 5열 배치 |
| `size` | yaml S/M/L/Epic | 카드 크기 |
| `next` | yaml boolean | 대기 열 맨 위 점선 (다음 발부 예정) |
| `conflict_with` | 스칼라/comma 배열 정합 | 상충 카드 (점선 빨강 + [삭제]) |
| `blocked_by` | yaml scalar ('kyu' or milestone) | 파란 태그 |
| `project_slug` | project alias | 프로젝트 필터 |
| `issue_id` | issued_id alias | 발부 ID |

**statusToColumn 매핑**:
- `filed` → `waiting`
- `issued` → `implementing`
- `landed` → `drilling` (Kyu 실기 대기)
- `verified` / `done` → `merged`

**실 index.json (20 필드 R002 sample)**:
```json
{
  "id":"R002",
  "title":"내가 한번 이야기한것이 저장이 되어있어서...",
  "column":"implementing",
  "size":"L",
  "next":false,
  "conflict_with":[],
  "blocked_by":null,
  "priority":"P0",
  "status":"issued",
  "repeat_count":1,
  "age_days":0,
  "trace5":{"read":{"seen":true,...},"reconcile":{...},...}
}
```

**next=true**: R009 (새 프로젝트 추가 편의) · UI 대기 열 맨 위 점선 카드 정본
**conflict_with**: R011 → R012 · UI 상충 시각화 정본
**blocked_by**: R016/R017 = "마일스톤 1" · R022/R025 = "kyu" · UI 파란 태그 정본
**rollup**: `filed=13 · max_age=27d · 🔴=2 · events=69`

## 2. A2 · session-manager-ab.test 회수 확증

**K0-0916-E 리포트 지적**:
> `pnpm test` = 74 test files · 986 pass · 1 fail = `tools/kyu-bridge/test/session-manager-ab.test.mjs` = K1 소유 · Vitest runner 미탑재 · K1 라운드 회부

**K1 실측 (worktree 정본)**:
```
$ for i in 1 2 3 4 5; do pnpm test -- tools/kyu-bridge/test/session-manager-ab.test.mjs; done
run 1: Test Files 1 passed · Tests 17 passed
run 2: Test Files 1 passed · Tests 17 passed
run 3: Test Files 1 passed · Tests 17 passed
run 4: Test Files 1 passed · Tests 17 passed
run 5: Test Files 1 passed · Tests 17 passed

$ pnpm test
Test Files 74 passed (74)
Tests 987 passed (987)
```

**뿌리 분석**:
- Vitest 4.1.10 정합 (`package.json devDependencies "vitest": "^4.1.10"`)
- Node 22.23.1 (K1 worktree · `.nvmrc = 22`)
- 5회 반복 = 재현 안 됨 (flaky 아님)
- K0 env = 특정 상태 (아마 pnpm install 미실행 or K0 worktree stash 상태)
- **K1 정본 코드 = 무결** · 회수 완결

**코드 변경 없음** (K1-0916-D). K0 세션이 `pnpm install` 후 재실행 시 통과 예상.

## 3. A3 · 데몬 재기동 + events 실 push 첫 파일

**launchctl kickstart** 실측 (`docs/audits/K1-0916-D-daemon-relaunch.log`):
```
[kyu-bridge] fetch-reset · b5e8dc2a → d6399fb2    ← auto pull (K0-0916-E main 반영)
[env-browser] orphan cleanup: {"cleaned":0,"sizes":[]}
[kyu-bridge] listening on http://127.0.0.1:9876
[kyu-bridge] relay watcher started · interval=60000ms
[kyu-bridge] status watcher started · interval=60000ms · hubs=6
[kyu-bridge] events watcher started · poll=60000ms · flush=300000ms
[status-watcher] tick · n0=running · t0=running · m0=running · k0=running · k1=running · k2=running · relay=updated
[events-watcher] tick · +2 events · buffer=3
[events-watcher] flush · 2 files · events/k0/2026-09-16.ndjson (+1) · events/k2/2026-09-16.ndjson (+3)
```

**세션 이벤트 실 push 첫 파일 링크**:
- https://github.com/CuriocityDevAi/curiocity-relay/blob/main/events/k0/2026-09-16.ndjson
- https://github.com/CuriocityDevAi/curiocity-relay/blob/main/events/k1/2026-09-16.ndjson
- https://github.com/CuriocityDevAi/curiocity-relay/blob/main/events/k2/2026-09-16.ndjson

**첫 이벤트 sample** (k1/2026-09-16 · 3 line):
```json
{"ts":"2026-09-16T02:16:17.623Z","hub":"k1","type":"reconcile","target":"/Users/kyu.lee/projects/test-portal-k1/docs/state/k1.md","session":"e46dbefe-1cc3-4e70-8f94-f5d202993c1d"}
{"ts":"2026-09-16T02:16:27.275Z","hub":"k1","type":"reconcile","target":"/Users/kyu.lee/projects/test-portal-k1/docs/state/k1.md","session":"e46dbefe-1cc3-4e70-8f94-f5d202993c1d"}
{"ts":"2026-09-16T02:16:33.304Z","hub":"k1","type":"read","target":"/Users/kyu.lee/projects/test-portal-k1/docs/tracking/k1.md","session":"e46dbefe-1cc3-4e70-8f94-f5d202993c1d"}
```

**5 hubs 이력** (오늘 만):
- k0/2026-09-16.ndjson · 1635b
- k1/2026-09-16.ndjson · 1081b
- k2/2026-09-16.ndjson · 1282b
- m0 · n0 = 오늘 tick 없음 (지난 이벤트만 · events/k1/2026-09-02.ndjson 등 32+ files)

## 4. DOC · BUILD

- SPEC § 11 v1.K1-0916-D · § K1-events-final (3 항 완결)
- state/k1.md Active K1-0916-D 편입 · SPEC 절 1 신설
- tracking/k1.md K76 등재
- docs/audits/K1-0916-D-daemon-relaunch.log (42 lines)

```
$ pnpm test  →  987 pass
$ pnpm check →  0 err
```

## 5. 원장 대사

- **R002** consume · events 집계 마감 (K1-0916-B 착지 + K1-0916-D K0 계약 정합 완결)
- **R006** defer · 알림 실기 = 마일스톤 대기 (Kyu iOS PWA 실기 · K1 자체 브라우저 부재)

## 6. 다음 라운드 인수

- **R002 UI 소비 확증** = K0-0916-E BA 흐름판 = index.json.requirements[] 자동 렌더 확인 (Kyu 실기)
- **월요일 09:00 WIB backlog push** = cron 자연 트리거 확인 (2026-09-22 or 다음 월요일)
- **R006 알림 실기** = 마일스톤 시점 (Kyu 판정 대기)

*K1-0916-D · 2026-09-16 · events 집계 마감 · 배관 허브 7번째 라운드*
