# M2-1105-AO 리포트 — hub-runner-v7.1

## #6 재시작 복구 — done/cancelled claim 보존 강화

### 원인 분석
- 발생 버전: v6.3
- v7.0에 이미 `readClaim` done/cancelled/blocked 체크(line 1868–1874) 존재 → 1차 보호 ✓
- 그러나 pane 체크 로직이 **반전** 돼 있음:  
  - v7.0 (v6.5~): pane=claude → interrupt+blocked, pane=shell → `markRecovered` skip  
  - 결과: 재시작 후 빈 pane + started claim → **복구 안 됨** (영구 started 유지)
  - REQ: "restarted 복구는 started+빈 pane 만" = pane=shell → recover, pane=claude → skip

### 수정 내용
**`scripts/hub-runner-v7.1.mjs`** (`recoverStuckStartedClaims`, 이전 v7.0 lines 1891–1919):

| 항목 | v7.0 | v7.1 |
|------|------|------|
| pane=claude | ctrl-c 전송 + blocked 처리 | **skip** (다음 사이클 재판단) |
| pane=shell/unknown | `markRecovered` + skip | **blocked 처리** |
| 근거 함수 | inline | `shouldRecoverStartedClaim` from `lib/recovery.mjs` |

v7.0 done/cancelled/blocked 체크(`scripts/hub-runner-v7.1.mjs:1868–1874`) 그대로 유지.

### 단위 테스트
`scripts/test/hub-runner-recovery.test.mjs` — 8개 테스트 모두 통과:
```
ok 1 - done claim + shell pane → skip-state (덮어쓰기 금지)
ok 2 - done claim + claude pane → skip-state (pane 무관하게 보존)
ok 3 - cancelled claim → skip-state
ok 4 - blocked claim → skip-state
ok 5 - null(claim 없음) → skip-state
ok 6 - started + shell pane → recover (빈 pane · 복구 대상)
ok 7 - started + unknown pane → recover (cmux 불가 · 복구 대상)
ok 8 - started + claude pane → skip-claude (작업 중 · 미개입)
```

셀프테스트:
```
[selftest-recovery-empty-pane] OK · done+shell=skip-state · started+shell=recover · started+claude=skip-claude
[selftest-recovery-done] OK · done claim 보존 · blocked 덮어쓰기 금지 경로 검증
[selftest-recovery-timeout] OK · 60m+ 초과 · pane unknown → blocked 처리 경로 검증
```

---

## #8 허브 착지 감지 로컬 5초 주기

### v7.0 대조 근거 (이미 구현됨)
`scripts/hub-runner-v7.0.mjs` (→ v7.1 계승):
- `const pollMs = 5000` ← 5초 주기 (`waitForLanding` 내부, v6.5 REQ1 도입)
- Check L1: 로컬 claim done (line 1634) · 토큰·네트워크 0
- Check L2: 로컬 report 파일 (line 1642) · 토큰·네트워크 0
- Check L3: 로컬 HEAD 이동 (line 1649) · 토큰·네트워크 0
- Check R: origin fetch (pollCount % 4 == 0, 20초 주기) · 네트워크 보조
- 새 큐 받아오기: `POLL_MS = 30 * 1000` (line 48) ✓

### v7.1 변경: lib 분리로 단위 테스트 가능화
`waitForLanding` → `lib/land-detect.mjs:waitForLandingWith` 래퍼로 교체.  
의존성 주입(reportExists, readClaim, getHead, fetchOriginReport)으로 테스트 환경에서 파일시스템·git 없이 동작.

### 단위 테스트
`scripts/test/hub-runner-landing.test.mjs` — 3개 테스트 모두 통과:
```
ok 1 - 리포트 파일 생성 → 5초 주기 안 감지 (≤7s)   ← 5005ms (5초 주기 1회)
ok 2 - claim done → 1회 poll 안 감지               ← 1001ms
ok 3 - report/claim 없음 → timeout
```

테스트 1이 "5초 안 감지" 요건 충족: report 2초 후 작성 → 첫 5s poll에서 감지 → 5005ms ≤ 7000ms ✓

---

## 테스트 로그 요약

```
# node --test scripts/test/hub-runner-recovery.test.mjs
# tests 8  pass 8  fail 0

# node --test scripts/test/hub-runner-landing.test.mjs
# tests 3  pass 3  fail 0

# node --test (기존 72개)
# tests 72  pass 72  fail 0

# node --check scripts/hub-runner-v7.1.mjs
syntax OK
```

---

## 이연 순증감

- 이연 없음 (v7.0 대비 add-only: lib 2개, test 2개, 셀프테스트 1개)

---

## Kyu 설치 명령 (3줄)

> **허브가 전부 놀 때만 설치**

```bash
# 1. 최신 pull
cd ~/projects/curiocity-relay && git pull

# 2. v7.1 설치 (TARGET 기본값 = v7.1)
bash scripts/hub-runner-install.sh

# 3. 성공 확인
launchctl list | grep com.curiocity.hub-runner
```

성공 확인: PID 열에 숫자 (-)이 아닌 값이 표시되면 정상.  
로그 확인: `tail -20 ~/.hub-runner/launchd.err.log | grep "시작 · v7.1"`

---

## 착지 명령

```bash
cp /tmp/M2-1105-AO-report.md ~/projects/curiocity-relay/m2/ && cd ~/projects/curiocity-relay && git add m2/M2-1105-AO-report.md && git commit -m "m2: M2-1105-AO" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M2-1105-AO done "v7.1: #6 pane 역전(empty→recover) · #8 lib 분리+단위테스트 · install TARGET v7.1"
```
