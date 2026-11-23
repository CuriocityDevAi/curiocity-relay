DONE

## M3-1123-E — CI 감시 창 (ci-watch.mjs)

**판정**: 완료  
**날짜**: 2026-11-23  
**커밋**: `661b5f56f` (ci-watch: 기록 2026-11-23) · `43bb2912a` (ledger 초기화)

---

## Kyu 실행 명령

```bash
node ~/projects/curiocity-relay/scripts/ci-watch.mjs
```

---

## 신설 파일

| 파일 | 역할 |
|---|---|
| `scripts/ci-watch.mjs` | 터미널 대시보드 본체 (30초 갱신) |
| `scripts/test/ci-watch-prompt-id.test.mjs` | 프롬프트 ID 추출 단위 테스트 |
| `ledger/ci-history.jsonl` | 완료 잡 이력 (prompt_id 포함) |
| `ledger/ci-daily.md` | 일별 요약 (Mac/클라우드 건수 · 클라우드 ID) |
| `status/ci-alerts.json` | 경보 상태 (오케 감시 틱이 읽음) |

수정 파일: `README.md` (cmux 실행 방법 단락 추가)

---

## 단위 테스트 결과 (10/10 PASS)

```
PASS  feat/M3-1123-E-ci-watch                  → M3-1123-E
PASS  feat/M3-1123-A-sell-chips                → M3-1123-A
PASS  fix/M1-1120-B-bug                        → M1-1120-B
PASS  M2-1105-N-task                           → M2-1105-N
PASS  feature/T0-0906-C-todo                   → T0-0906-C
PASS  K1-0914-A                                → K1-0914-A
PASS  feat/N0-1012-XY-grownest                 → N0-1012-XY
PASS  main                                     → null
PASS  release/v1.0                             → null
PASS  chore/cleanup                            → null

10 passed · 0 failed
```

---

## 실제 실행 화면 캡처

```
CI 감시 대시보드  11/23/2026 16:13:47 WIB
─────────────────────────────────────────────────────────────────
■ 1. 러너
  curiocity-mac (heavy)  온라인  M3-1123-A fork#228 CI 21분
  curiocity-mac-light (light)  온라인  잡: -

■ 2. 대기열
  heavy (0건)
    대기 없음
  오늘 클라우드: 60/5  남은 슬롯: 0

  light (0건)
    대기 없음

■ 3. 클라우드 사용 (오늘)
  진행중:
    fork:#228  fork:#228  playwright  16분
  완료 (60/5):
    -  storeport  linux-check (ubuntu · case-sensitive)  0.5분  ✓
    M3-1123-A  fork#228  route  0.1분  ✓
    M3-1123-A  fork#228  heavy-cloud  0.0분  ✗
    M3-1123-A  fork#228  lint  1.4분  ✗
    M3-1123-A  fork#228  playwright  16.1분  ✓
    #413  storeport#413  heavy-cloud  12.5분  ✗
    #413  storeport#413  check  0.2분  ✓
    ... (오늘 총 60건)

■ 4. 로그 (heavy 러너 · Worker.log 마지막 8줄)
  [2026-11-21 12:50:35Z INFO JobServerQueue] All queue process tasks have been stopped
  [2026-11-21 12:50:35Z INFO TempDirectoryManager] Cleaning runner temp folder
  [2026-11-21 12:50:35Z INFO JobRunner] Raising job completed against run service
  [2026-11-21 12:50:36Z INFO Worker] Job completed.

  갱신 30초  |  Ctrl+C 종료
```

---

## 구현 요약

**섹션 1 (러너)**: gh api `/actions/runners` 2분마다 갱신 · online/busy/오프라인 색상 · 경과 분 (30분→노랑, 45분→빨강 ⚠멈춤의심)

**섹션 2 (대기열)**: heavy/light 분리 · 프롬프트 ID(`run.head_branch`에서 추출) · 클라우드 예정 표시 (`heavy_busy OR heavy_online==0` 조건) · 한도 슬롯 표시

**섹션 3 (클라우드 오늘)**: `ledger/ci-history.jsonl` 기반 완료 목록 + `status/runners/all.json` cloud_in_progress 보완

**섹션 4 (로그)**: `~/actions-runner/_diag/Worker_*.log` 최신 파일 마지막 8줄

**기록**: `status/ci/<날짜>.jsonl` 변경 감지 → `ledger/ci-history.jsonl` append (prompt_id 포함 · 중복 방지) → `ledger/ci-daily.md` 일별 1줄 갱신

**경보**: `status/ci-alerts.json` 갱신 (stuck_suspected · long_running · queue_wait · runner_offline)

**Push**: 10분마다 rebase-first push (ledger/ci-history.jsonl · ledger/ci-daily.md · status/ci-alerts.json)

**API 호출**: 30초 주기 리포당 2콜(queued+in_progress) · runners 2분마다 1콜 — budget 준수

**hub-runner.mjs 미수정**: ci-watch는 완전 독립 프로세스. lib/ci-history.mjs에서 `getWibDateStr`, `readJsonlFile` 재사용.
