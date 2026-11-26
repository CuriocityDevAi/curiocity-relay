R0-1126-AH
storeport#460 CHANGES — edited 트리거 보안 구멍(skipped=통과) 확인·대안 제시
relay#51 APPROVE — cancel-on-close 마커·isCountableJob·OFF 표시 모두 맞음 · 숫자 대조 OK
relay#53 APPROVE — 2분화 지연 단축 맞음 · 하루 커밋 ~1300→~3250 허용 범위 · 409 위험 낮음

---

## 1. storeport #460 — CHANGES

### 보안 구멍 실측

**구조:** `edited` 이벤트 추가 + 세 gate 잡(`markers-and-forbidden`, `changes-filter`, `route`)에
`if: github.event.action != 'edited' || github.event.changes.base != null` 삽입.
본문/제목 수정 시 → gate 잡 모두 SKIPPED → `needs:` 연쇄로 `heavy-mac`/`heavy-cloud` 도 SKIPPED.

**GitHub 동작(공식):** branch protection 의 required status check 에서 `skipped` 는 **통과로 취급**.
("If a required status check is skipped because of path filtering…, it will appear as passing.")

**시나리오:**
1. 커밋 push → CI 실행 → gate 잡 failure (빨간 CI)
2. PR 본문 수정 → 새 CI 실행 → 모든 gate 잡 `skipped`
3. 같은 HEAD SHA 에서 최신 check 결과 = `skipped` = 통과
4. 머지 버튼 초록 ← 빨간 CI 뒤에도 머지 가능

**JSONL 실측 (PR #460, 오늘 2026-11-26):**

```
run①(opened) : route=success  changes-filter=success  markers-and-forbidden=success  heavy-mac=success
run②(edited) : route=skipped  changes-filter=skipped  markers-and-forbidden=skipped  heavy-mac=skipped  heavy-cloud=skipped
run③(edited) : route=skipped  changes-filter=skipped  markers-and-forbidden=skipped  heavy-mac=skipped  heavy-cloud=skipped
```

PR #460 총 16 jobs 중 11건 skipped. 오늘 storeport ci 전체에서 `edited` 트리거 발생 2회 확인.
(PR #460 은 run① 성공으로 mergeable_state=clean — 현재는 구멍이 미발현, 그러나 run① 실패 상태에서
본문 수정 시 즉시 머지 가능해짐.)

### 대안

**A (권장) — 별도 retarget 워크플로:**
`ci-on-retarget.yml` 을 신규 생성, `on: pull_request: types: [edited]` 로만 트리거.
잡 1개:
```yaml
if: github.event.changes.base != null
steps:
  - run: gh workflow run ci.yml --ref ${{ github.head_ref }}
    env: { GH_TOKEN: ... }
```
→ main ci 는 `workflow_dispatch` 로 재실행되므로 모든 잡이 `success`/`failure` 로 정상 완료.
`edited` 이벤트 자체는 ci.yml `types` 에서 제거.

**B — gate 잡을 skip 대신 success 처리:**
`if` 조건 대신 `steps: - run: echo "body-only edit, no-op"` (exit 0).
체크 결과가 `success` 로 HEAD SHA 를 덮음 → 여전히 이전 failure 를 덮어쓰므로 보안 차이 없음.
❌ 추천 안 함.

**C — edited 완전 제거 + 수동 `gh workflow run`:**
storeport 쪽은 Kyu 가 stack PR retarget 시 수동 재실행. 운영 번거로움.

→ **A 방안 권장.** `edited` 를 ci.yml types 에서 제거하고 `ci-on-retarget.yml` 로 분리.

---

## 2. relay #51 (ci-watch v1.13) — APPROVE

### JSONL 손계산 (2026-11-26, 13:18 UTC 기준, isCountableJob 필터)

| 기계 | 잡 | 고유 PR |
|------|----|---------|
| MBP M1 오늘  | 7  | 4  |
| iMAC M1 오늘 | 112 | 15 |
| 클라우드 오늘 | 15 | 9  |
| 전체(중복제거) | 134 | 20 |

PR 렌더 스냅샷(MBP 31·iMAC 57·클라우드 24)은 테스트 픽스처값 — 실제 오늘 숫자와 다름(허용).
오케가 체크한 10:49 UTC(338줄) 시점 클라우드 24건은 현재(398줄, 13:18 UTC) 15건으로 차이 없지 않으나,
방향은 monotone(잡은 줄지 않음). 추가로 편입된 `edited` 이벤트의 skipped run 이 total 늘리면서
countable 비율이 달라진 것 → isCountableJob 로직 자체는 올바름.

### cancel-on-close 마커 판정

오늘 13건, run_min min=0.10 max=0.10 avg=0.10 (약 6초). PR 닫힘 시 queued run 취소 목적
→ 실제 테스트·빌드 아님 → MARKER_JOBS 추가 맞음 ✓

### MBP OFF 표시

JSONL 에서 MBP runner name `Youngkyus-MacBook-Pro-M1` 의 마지막 활동은 오전.
ci_runners 에 offline 상태로 존재 → 수정 전 `partial=isPoolPartial` 이면 `?` 표시.
PR 수정: `partial: false` 고정 → `OFF` 렌더 ✓

### 테스트

PR 본문: `tests 15 / pass 15 / fail 0` ✓

### 잔여 주의사항 (blocker 아님)

storeport ci.yml 의 `heavy-cloud` 잡은 실제 24분 짜리 CI 잡이지만 MARKER_JOBS 에 포함됨.
fork 의 `heavy-cloud`(echo 1줄 마커)와 이름 충돌. 오늘 storeport cloud countable 에서
heavy-cloud 24건이 제외됨 → ci-watch 클라우드 잡 수가 과소 계산 가능성.
이 문제는 PR #51 이전부터 존재 · PR #51 범위 밖 → 별도 이슈로 추적 권장.

---

## 3. relay #53 (수집·push 2분화) — APPROVE

### 변경 내용

```
CI_MIN_FIRE_INTERVAL_MS    5×60_000 → 2×60_000
HEARTBEAT_PUSH_INTERVAL_MS 5×60_000 → 2×60_000
```

완료 run 최대 복합 지연: 수집(5분)+push(5분) ≈ 10분 → 수집(2분)+push(2분) ≈ 4분.
#457 11:14 failure 가 11:21 jsonl 에 없던 원인 직접 해소.

### 하루 커밋 수 추정

현재(5분 간격) 오늘 713 커밋 / 13시간 → 하루 환산 ~1,300건.
2분 간격(2.5×) → 하루 ~3,250건 예상.
relay repo 는 단일 브랜치 append-only 운영 · GitHub 커밋 한도 무관 → 허용 범위.

### 409 충돌 위험

heartbeat push 는 `hub-runner-v8.3.mjs` 단일 프로세스(iMac)에서 직렬 실행 → 동시 push 없음.
MBP/ci-box 가 별도 push 를 하더라도 runner 는 `git pull --rebase` + 재시도로 409 처리.
오늘 713 커밋 중 push 오류 흔적 없음 (last_error 는 runner-folder 관련 별도 사안).

### 위험도

변경 2줄(상수값만), 로직 변경 없음. rollback = 값 복원.

---

## 요약

| PR | 판정 | 핵심 |
|----|------|------|
| storeport #460 | **CHANGES** | edited→skipped=통과 보안 구멍. `ci-on-retarget.yml` 분리 권장 |
| relay #51       | **APPROVE** | cancel-on-close 마커 · isCountableJob · OFF 표시 모두 맞음 |
| relay #53       | **APPROVE** | 지연 10→4분. 커밋 ~3250/일 허용. 409 위험 낮음 |
