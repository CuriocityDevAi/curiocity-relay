# K1-0916-B · 심문 (§ ③ 정본)

**허브**: K1 (배관)
**브랜치**: `feat/k1-0916-b-events` (worktree · origin/main SHA `b5e8dc2` 기저 · K0-0916-A 반영)
**CYCLE**: v1.2 § ② + § ③ 정본 · 즉시 구현 금지 · Kyu 답 회수 후 A1~A5 순차 착지

**원장 대사**: R002 (이벤트 소스 · 이 라운드 정본 · `note: 이벤트 소스 = K1-0916-B`) · R013 (큐 통합 · P1 issued) · R006 (알림 실기 마일스톤 · P1 landed)

---

## § ② 실측

- **relay `ledger/requirements.yaml`** = 326 라인 · R001~R014+ 정의 ✅ (오케 정본 유지)
- **relay `prompts/`** = README.md + `k0/K0-0911-AQ-test.md` (테스트 프롬프트 · 정리 대상)
- **relay `events/`** = 부재 (신설 대상)
- **Claude jsonl 세션 로그** = `~/.claude/projects/<slug>/*.jsonl` · `tool_use` 이벤트 안 `file_path` 캡처 가능 (Read/Edit/Write · 실측 확증 · 20 이벤트 sample)
- **build-index** = 현재 index.json.checks[] + reports[] + prompts[] · **requirements[]/events[] 미포함**
- **K0-0916-A** = 흐름판 뿌리 · K0-0916-E 예정 (R002 UI 소비 · K0 소유)

---

## § ③ 심문 (블로킹 5건 · 답 후 실행)

### Q1. events ndjson 스키마 정본
- **Kyu 원문**: `{ts, hub, type: read|reconcile, target, session}` + "프롬프트 투입([투입] dispatch)·리포트 push·심문 push도 이벤트로"
- **후보 완전 스키마**:
  - `type` = `read` | `reconcile` | `dispatch` | `report-push` | `inquiry-push` | `mismatch` (6종)
  - `ts` = ISO 8601 (UTC)
  - `hub` = k0/k1/k2/n0/t0/m0
  - `target` = 파일 경로 (Read/Edit/Write · file_path) 또는 URL (push 대상)
  - `session` = jsonl UUID
  - `req_ids?` = 감지된 R-id 목록 (target 이 requirements.yaml or state 이면 추정 or null)
- **K1 권고**: 위 6-type 스키마 · session 필드는 jsonl basename UUID · file_path abs path
- **Kyu 회신 필요**: (a) 승인 · (b) type 추가/삭제 · (c) 다른 필드

### Q2. "점 5개 상태" 정의 (index.json.requirements[] 각 항목)
- **Kyu 원문**: "각 항목 events 요약(점 5개 상태) + age_days"
- **해석 후보**:
  - (a) status 5단계 (filed→issued→landed→verified→done) 각 도달 여부 · 5 dot binary
  - (b) 최근 5 이벤트 종류 (read/reconcile/dispatch/push/mismatch)
  - (c) 5 축 활동 (조회 · 재정합 · 발부 · 리포트 · 심문) 각 여부/count
- **K1 권고**: (a) 정본 · 원장 정의된 5 status = 원장 스키마 정합 · UI 소비 명료
- **Kyu 회신 필요**: (a·b·c) 선택

### Q3. mismatch 이벤트 조건
- **Kyu 원문**: "데몬 감지와 리포트 주장이 불일치하면 `mismatch` 이벤트"
- **감지 후보**:
  - (a) 리포트 frontmatter `ledger_events[].action=reconcile` 인데 해당 세션 안 requirements.yaml read 이벤트 부재
  - (b) 리포트 frontmatter `ledger_events[].id=R00x` 인데 그 R-id 원장 부재
  - (c) 리포트 push 시각 이전 24h 안 (같은 session 안) 관련 파일 read 이벤트 부재
- **K1 권고**: (a)+(b) 병행 · session 매칭 + R-id 존재 확인 · window 부재 (jsonl session 전체)
- **Kyu 회신 필요**: (a·b·c) 조합 · window 크기

### Q4. 월요일 09:00 WIB 밀림 푸시 스코프
- **Kyu 원문**: "build-index 스케줄 → `/api/push/notify` '미발부 N · 최장 N일 · 🔴 N'"
- **정의**:
  - 미발부 = `status=filed` 개수
  - 최장 N일 = `filed_at` 부터 오늘까지 max age_days (filed 만)
  - 🔴 N = `repeat_count >= 2` 개수
  - schedule = cron `'0 2 * * 1'` UTC (월요일 09:00 WIB · UTC+7)
- **K1 권고**: 위 정본 · relay `.github/workflows/build-index.yml` cron 추가 + notify step 확장
- **Kyu 회신 필요**: (a) 승인 · (b) 문구/조건 조정

### Q5. relay `prompts/` 재정의 · 기존 파일 정리
- **Kyu 원문**: "req_ids 필수 · 테스트 프롬프트 파일 정리"
- **현재 파일**:
  - `prompts/k0/K0-0911-AQ-test.md` (테스트용 · 실 라운드 아님 → 삭제 대상)
- **신 규약**: frontmatter `req_ids: [R002, R013]` 필수 · 부재 파일 = index 안 warning 표시 + build-index warn 로그
- **K1 권고**: (a) K0-0911-AQ-test.md 삭제 · (b) README.md 안 `prompts/` 규약 절 신설 (req_ids 필수 · 없으면 warning)
- **Kyu 회신 필요**: (a) 삭제 승인 · (b) 다른 대체

---

## (d) 역제안 (D1~D3)

- **D1**: `~/.kyu-bridge/events-cursor.json` 로 각 jsonl 세션 마지막 처리 line offset 저장 → 재기동 시 중복 감지 방지. **K1 권고: 채택**.
- **D2**: 5분 배치 = event queue in-memory · flush 시 relay 단일 커밋 (rate limit 완화). **K1 권고: 채택**.
- **D3**: events ndjson 파일 회전 = 매일 자정 UTC 새 파일 (`events/<hub>/YYYY-MM-DD.ndjson`). **K1 권고: 채택**.

---

## 결론

Kyu 답 5건 회수 후 즉시 A1→A5 착지. 최소 답 = "Q1~Q5 K1 권고 채택 · D1~D3 채택" 한 줄이면 진행.

*K1-0916-B · 2026-09-16 · CYCLE § ③ 정본 심문 · 5 블로킹 · 3 역제안*
