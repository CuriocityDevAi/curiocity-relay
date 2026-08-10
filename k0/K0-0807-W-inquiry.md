# K0-0807-W · 심문 게시 (I+9 허브 탭 상세 + 세션 로그 라이브)

**round_id**: K0-0807-W
**hub**: k0 (test-portal)
**목적**: I+9 착지 = 미션 보드 [탭 열기] 진입 상세 + 세션 로그 라이브 스트림
**timestamp**: 2026-08-10

---

## § ② 큐 · 원장 · 스펙 게시

### (1) dispatch 큐
- inbox (7): P2/P5/딥링크 · 무관
- active: 없음
- await-kyu (1 · STALE 14일): P2.2-0

### (2) EPIC-STATE
kyu-orchestrator v0.3 시리즈 후속 · K0-0807-U 사가 종결 후 I+9.

### (3) 현행 실측

**W-1 관련**:
- `src/routes/+page.svelte:301` = 카드 [탭 열기] href = `/prs?repo=${h.slug}` (placeholder · I+9 = `/hub/<slug>` 로 변경 예정)
- `src/routes/prs/+page.svelte` = REGISTRY 소비 PR 홈 (K0-0807-Q git mv · 기존)
- `src/routes/api/prs/+server.ts` = GitHub API 소비 endpoint (P2)
- **hubs.json slug** = "test-portal" 등 · **REGISTRY slug** = "test-portal" 등 · 동일 slug 조인 가능
- **head SHA 재조회** = 무엇을 재조회? Kyu 문언 = "head SHA 재조회" · GitHub PR head SHA (checks 상태) or 데몬 fetch 재실행?

**W-2 관련**:
- `session-manager.mjs invoke()` = `spawn(claudeBin, args, {cwd})` stdout/stderr **메모리 캡처** · **파일 로그 안 함**
- `kyu-devenv start` = dev 서버 spawn = `logDir/{slug}-{ts}.log` 파일 저장 (server.mjs:337)
- **두 로그 다름**: dev 서버 로그 (long-running) vs headless claude 세션 로그 (round 단위 · 메모리)
- `/events` endpoint = relay watcher events (파일 아님 · 인메모리 store)

**wrangler.toml**: 이번 라운드 신설 binding 없음 (기존 D1 만).

---

## § ③ 심문 게이트

### (a) 확인 질문

**Q1. W-1 라우트 이름 확정 · 카드 링크 갱신**

- **(a1)** `/hub/<slug>` (단수 · design § 9.9 정본 · K0-0807-Q 카드 placeholder 문언)
- **(a2)** `/hubs/<slug>` (복수 · REST 관행)

**K0 권고 = (a1) `/hub/<slug>`** · design 정본 명시 준수. 홈 카드 href `/prs?repo=` → `/hub/<slug>` 변경.

---

**Q2. W-1 상세 화면 구성 (Kyu 요구 4 섹션 · 배치·소스)**

Kyu 문언 = "열린 PR 목록 · 최근 relay 게시물 · head SHA 재조회 · 승인 큐 pending 필터".

**(b1) 4 섹션 배치**:
1. **허브 요약 헤더** = 미션 보드 카드 확장 (state · heartbeat · halt · 마지막 verdict)
2. **열린 PR 목록** = `/api/prs?repo=<slug>` 기존 소비 · round ID 배지 (K0-0729-B `terminal_prefix` 파싱) · 상태 chip (env · kyu-gate)
3. **최근 relay 게시물** = mission-board `loop_recent` 필터 (hub 기준) + 실 GitHub relay 링크
4. **승인 큐 pending 필터** = `/api/approvals?hub=<slug>&status=pending` 기존 소비 · 각 항목 클릭 = `/approvals?id=<uid>`

**K0 권고 = (b1)** · 별 신설 API 없음 (기존 endpoint 재소비).

---

**Q3. W-1 "head SHA 재조회" 정확한 정의 (Kyu 판정 필요)**

Kyu 문언 = "head SHA 재조회". 후보:
- **(c1) PR head SHA 재조회** = `/api/prs` 응답 안 각 PR head SHA · 미션 보드 카드 안 진행 표기 (Kyu 실기 반영 · GitHub API 갱신)
- **(c2) 허브 리포 main branch head SHA 재조회** = `git ls-remote origin main` 유사 (배포 반영 확인)
- **(c3) 세션 안 checkout SHA 재조회** = orchestrator loop 마지막 커밋 SHA

**K0 권고 = (c1) PR head SHA 재조회 버튼** · 근거: 열린 PR 목록 옆 [↻] 버튼 → `/api/prs?repo=<slug>&refresh=1` (캐시 무시 · GitHub API 재호출). Kyu 실기 후 head 갱신 확증 UX.

**Kyu 판정 대상**.

---

**Q4. W-2 세션 로그 소스 (핵심 · 판정 필요)**

Kyu 문언 = "headless 세션 진행 로그". 실측 = **아직 파일 로그 없음** (session-manager invoke 메모리 캡처만).

- **(d1) session-manager 파일 로그 신설** = 세션 invoke 시 stdout/stderr → `~/.kyu-bridge/logs/session-<hub>-<sessionId>.log` append
- **(d2) 데몬 자체 stdout 로그 (launchd)** = 기존 로그 (kyu-bridge serve 콘솔) · Q4 헤더 · 파싱 필요
- **(d3) kyu-devenv dev 서버 로그** = 기존 `logDir/{slug}-{ts}.log` (다른 성격 · dev 서버 log · 헤드리스 세션 아님)

**K0 권고 = (d1) session-manager 파일 로그 신설** · 이유:
- Kyu 요구 "headless 세션 진행 로그" 정확 정합
- session-manager 확장 (invoke 시 옵션 `logDir` 주입 · fd stdio 로 파일 write)
- 파일 rotation = 별건 (초판 = round 당 1 파일)
- endpoint = `GET /events/session-log/:hub?since=N` = 파일 tail

---

**Q5. W-2 endpoint 구현 (Q-I-7 재확인)**

design § 9.6 = 3 후보 (SSE · chunked · polling). K0-0807-Q 시점 K0 권고 = (c) polling.

**Kyu 문언 = "SSE 또는 폴링"** · 재판정:
- **(e1) polling** (2s 주기 · `?since=N` param · 자작 zero)
- **(e2) SSE** (chunked · text/event-stream · Workers 지원)

**K0 권고 = (e1) polling** · 근거:
- Cloudflare Workers = **long-lived response 제한** (CPU time · 하지만 kyu-bridge 는 **로컬 데몬** = 제약 없음)
- 로컬 데몬 endpoint (127.0.0.1) = SSE OK
- 하지만 자작 최소 = polling 우선 (기존 mission-board 10s polling 패턴 정합)
- SSE 승격 = 별건 (실 로그 량 관측 후)

**Kyu 판정 대상**.

---

**Q6. W-2 endpoint 위치 · 인증**

- **위치**: `GET /events/session-log/:hub?since=N` = **kyu-bridge 데몬** (design § 9.6 · 로컬)
- **인증**: Bearer (기존 데몬 정합)
- **응답 스키마**:
  ```json
  {
    "hub": "k0",
    "log_path": "~/.kyu-bridge/logs/session-k0-<sessionId>.log",
    "next_offset": 4096,
    "chunk": "line 1\nline 2\n...",
    "eof": false
  }
  ```

**K0 권고 = 위 스키마** · since=offset → next_offset 반환.

---

**Q7. W-2 UI 위치 (허브 탭 상세 안 하단 collapse vs 전용 라우트)**

Kyu 문언 design § 9.6 = "허브 탭 안 하단 collapse 패널" + "홈 미션 보드 하단 [세션 로그 라이브] 링크".

- **(f1)** 허브 탭 상세 (`/hub/<slug>`) 안 하단 collapse 패널
- **(f2)** 별도 라우트 `/hub/<slug>/log` (딥링크)
- **(f3)** (f1) + 홈 미션 보드 하단 링크 = 활성 허브 로그 창

**K0 권고 = (f1) 우선** · 홈 링크 (f3) = 이번 라운드 스코프 밖 (별건 · 사용 관찰 후).

---

**Q8. W-2 폴링 주기 · 자동 스크롤**

- 폴링 주기 = **2s** (design § 9.6 정본 · Q-I-7 (c) 옵션)
- 최근 라인 수 = **200 lines** (design § 9.6 정본)
- 자동 스크롤 = **on/off 토글** (design § 9.6 정본)

**K0 권고 = 정본 채택**.

---

**Q9. UI 파급 · 조용한 폴백**

- 데몬 미기동 = "세션 로그 미기동 · kyu-bridge 시작 필요" 안내 (기존 홈 D4 정합)
- 세션 파일 없음 (아직 loop 안 돎) = "세션 아직 시작 안 됨" 안내
- 세션 진행 중 · 새 라인 없음 = "···" 대기 표시

**K0 권고 = 채택**.

---

**Q10. 테스트 매트릭스 (~15 케이스)**

- session-manager invoke 파일 로그 write (mock spawn · fs 검증)
- server /events/session-log/:hub · Bearer 검증 · since offset
- 파일 없음 = 200 + empty chunk (or 404?)
- BridgeClient sessionLog method
- 허브 상세 라우트 렌더 (fixture)
- 카드 [탭 열기] 링크 갱신 (`/hub/<slug>`)
- head SHA 재조회 버튼 (mock fetch)
- 승인 큐 hub 필터 fetch (mock)

**K0 권고 = 승인**.

---

### (b) 충돌 · 중복 지적

**C1.** design § 9.6 Q-I-7 = 3 후보 미확정. K0-0807-Q 시점 K0 권고 = polling · Kyu 재판정 대상 (Q5).

**C2.** design § 9.6 "홈 미션 보드 하단 [세션 로그 라이브] 링크" = 이번 라운드 스코프 밖 (별건 · Q7 판정).

**C3.** head SHA 재조회 = Kyu 문언 만 · 정확 정의 부재 (Q3 판정 필수).

---

### (c) 반론

**R1.** session-manager 파일 로그 신설 = **loop-orchestrator 실 상주 미착지** 상태에서 로그 흐를 데이터 없음. 이번 라운드 착지 = **계약만** (endpoint · UI · 파일 없음 시 안내). 실 로그 발생 = loop 상주 라운드 (별건).

**R2.** SSE 도입 = Kyu 문언에 있으나 K0 권고 = polling 초판 (자작 최소). Kyu 판정 시 SSE 채택하면 wrapper 함수 필요 (deps 없음 · text/event-stream 스킴 자작).

---

### (d) 역제안

**D1.** 카드 [탭 열기] 링크 = 이번 라운드 필수 갱신 (`/prs?repo=` → `/hub/<slug>`). 하지만 **PR 목록 UI 는 이미 `/prs` 에 있음** · `/hub/<slug>` 신설 시 PR 목록 부분 = 유사 로직 재사용? · **컴포넌트 추출** (자작 최소 정합).

**K0 권고 = PR 리스트 컴포넌트 추출 · 두 라우트 공유** = `src/lib/PrList.svelte` 신설. `/prs` · `/hub/<slug>` 모두 소비.

---

**D2.** `/hub/<slug>` 상세 = 로그 · PR · 승인 큐 · relay · 요약 = 5 섹션. 초기 로드 시 다중 fetch 필요:
- `/mission-board` (요약 · 이미 소비)
- `/api/prs?repo=<slug>` (PR)
- `/api/approvals?hub=<slug>&status=pending` (승인)
- `/events/session-log/:hub` (로그 · 폴링)

**K0 권고 = 4 fetch 병렬 · 10s 폴링 (미션 보드 정합)**. 세션 로그만 2s 폴링 (design § 9.6 정본).

---

**D3.** relay 게시물 표시 = `/mission-board` payload `loop_recent` 필드 = 이미 있음 · hub 필터만 추가. **별 fetch 불요**.

**K0 권고 = payload.loop_recent.filter(e => e.hub === hubKey)** 로컬 필터.

---

## 요약 판정 대기 (10 문 · 3 지적 · 2 반론 · 3 역제안)

1. **Q1** 라우트 이름 · **K0 권고 = /hub/<slug>**
2. **Q2** 4 섹션 배치 · **K0 권고 = 요약+PR+relay+승인**
3. **Q3** head SHA 재조회 정의 · **K0 권고 = (c1) PR head SHA 재조회 [↻] 버튼**
4. **Q4** 세션 로그 소스 · **K0 권고 = (d1) session-manager 파일 로그 신설**
5. **Q5** endpoint 구현 방식 · **K0 권고 = (e1) polling 초판**
6. **Q6** endpoint 위치·인증·스키마 · **K0 권고 = 데몬 Bearer since=offset**
7. **Q7** UI 위치 · **K0 권고 = (f1) 허브 탭 안 collapse · 홈 링크 별건**
8. **Q8** 폴링 주기 2s · 200 lines · 자동 스크롤 토글 · **K0 권고 = 정본 채택**
9. **Q9** 조용한 폴백 · **K0 권고 = 3 안내 (데몬/세션/대기)**
10. **Q10** 테스트 매트릭스 · **K0 권고 = 승인**
11. **R1** 실 로그 없음 = 계약만 착지 확인
12. **D1** PR 리스트 컴포넌트 추출 · **K0 권고 = 채택**
13. **D2** 병렬 fetch · **K0 권고 = 채택**
14. **D3** relay 게시물 = loop_recent 로컬 필터 · **K0 권고 = 채택**

**정지**: Kyu 회신 후 실행. 즉시 구현 금지.

**게시 방식**: CLAUDE.md § 8 ③-relay 정본 (K0-0807-T 신설 · K0-0807-U 첫 정식 · **K0-0807-W = 2회차 정식 적용**).

---

## PR 예정
- 브랜치: `feat/k0-0807-w-hub-detail-session-log`
- Kyu 회신 대기 · 회신 후 구현 → PR → k0/K0-0807-W-report.md push
