M2-1124-M 완료 (2026-11-24 15:22 WIB)

## 판정: COMPLETE

---

## REQ 1 — storeport #416 리뷰 대화 resolve

**결과: 5개 스레드 전부 resolve → `mergeStateStatus: CLEAN`**

| 스레드 | 경로 | 판정 | 반영 커밋 |
|--------|------|------|-----------|
| PRRT…M4b5 | route.ts | [제안] pos_order_num 서버 직접 채우기 | cbf0fb7 (admin PATCH 대안 구현) |
| PRRT…M4ly | display-machine.ts | [OK] keypad 잠금 확인 | 426d883 / 40b1cc0 |
| PRRT…NVOJ | route.ts | [계약 불일치] pos_order_num 쓰기 경로 없음 | cbf0fb7 (`/admin/pos/customer-display/snapshots/:id` PATCH 추가) |
| PRRT…NVXo | Migration…001.ts | [CI 미실행] 마이그레이션 미검증 | 40b1cc0 CI all green (06:41 UTC) / 90832c8 dirty 해소 |
| PRRT…NVe0 | snapshot-api.ts | [양호] fire-and-forget | 필수 수정 아님 — 허용 범위 확인 후 resolve |

PR #416: `mergeable: MERGEABLE`, `mergeStateStatus: CLEAN` 확인.

미반영 항목: 없음. 전부 반영 또는 허용 범위 확인.

---

## REQ 2 — 감시 화면 PR 통합

**새 PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/22**
브랜치: `feat/M2-1124-M-ci-watch-hik`

포함 커밋:
- `761985b` M2-1124-H — r키 즉시갱신 · 카운트다운 · 경과 색상 · 리포트 미착지 분리
- `5959187` M2-1124-I — 버전 표시 · 최신 아님 경고 · 파일 갱신 경고
- `c7d42cf` M2-1124-K — CI 정보 로컬 우선 (v1.3→1.4)
- `fbc3bae` M2-1124-M — 화면 라벨 정리

#17 / #19 / #20 → "#22 로 통합" 댓글 후 닫힘.

검증:
- `node --check` 전체 ✅
- `node --test` 15/15 pass, fail 0 ✅
- `mergeable: clean` ✅

### 실기 기동 화면 캡처

```
Runner/CI Monitoring v1.4 (20261124)  ⚠ 최신 내용 다름 — Ctrl+C 후 재시작
● 경보 1  11/24/2026 15:20:04 WIB
───────────────────────────────────────────────────────────────────────────────
  m0  M0-1124-C  9분
  m1  idle
  m2  M2-1124-M  8분
  m3  M3-1124-G  9분
  r0  idle
  heartbeat 4분전  v7.8 pid=37338  git: ahead=0 behind=0
───────────────────────────────────────────────────────────────────────────────
  storeport-heavy  Youngkyus-MacBook-Pro-M1  BUSY  main · heavy-mac · 4분째
  storeport-light  curiocity-mac-light       OK  —
  fork-heavy       curiocity-mac-fork        OK  —
  fork-light       curiocity-mac-fork-light  OK  —
───────────────────────────────────────────────────────────────────────────────
  cloud 잡 오늘  3건(간단 판정 포함)  총 0.7분  잔여: 2
    cancel-on-close  0.1분  ✓
    linux-check (ubuntu · case-sensitive)  0.5분  ✓
    cancel-on-close  0.1분  ✓
───────────────────────────────────────────────────────────────────────────────
  오늘 누적 (WIB)
  mac-heavy        64잡  대기0.7분  실행1.7분  성공85.9%
  mac-light        22잡  대기0.5분  실행0.3분  성공100.0%
  cloud(경로포함)      37잡  실행0.6분  성공67.6%
  클라우드 넘기기 한도  1/5  $0.34  잔여 4
───────────────────────────────────────────────────────────────────────────────
```

- 윗줄 `Runner/CI Monitoring v1.4 (20261124)` ✅
- r키 즉시 갱신 ✅
- q키 종료 후 터미널 복원 ✅ (cleanupTerminal → cursor/raw mode 복원)
- 로컬 CI 러너 정보 GitHub 호출 없이 표시 ✅

---

## REQ 3 — 화면 라벨 정리

`scripts/watch/ci-watch-render.mjs` 변경:

| 이전 | 이후 |
|------|------|
| `cloud 오늘  N/5건` | `cloud 잡 오늘  N건(간단 판정 포함)` |
| `cloud 한도  N/5건` | `클라우드 넘기기 한도  N/5` |

테스트(`ci-watch-k.test.mjs`) 어서션도 동기화.
