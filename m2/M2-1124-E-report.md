COMPLETE · PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/14

## M2-1124-E — 허브 대기 큐 변경 알림

**브랜치**: feat/M2-1124-E-ci-watch-queue-notif (stacked on feat/M2-1124-D-ci-watch-queue)
**커밋**: 7269abf3a
**변경 파일**: scripts/ci-watch.mjs 1개

### 구현 내용

`scripts/ci-watch.mjs` 에 대기 큐 변경 감지 + 30초 TTL 알림 추가.

**추가 함수**:
- `fileContentHash(filePath)` — MD5 앞 8자리로 파일 내용 변경 감지
- `readClaimState(id)` — claims 디렉터리에서 claim state 읽기
- `listHubPendingState(hub)` — `{ ids, hashes }` 반환 (기존 `listHubPendingIds`의 베이스)
- `diffHubQueue(hub, prev, curr)` — 4종 변경 감지 → 알림 레이블 반환
- `tickQueueDiff()` — TTL 만료 처리 + 각 hub 별 diff 실행 → hubNotifs 반환

**감지 규칙**:
- `+ ID 추가` — 새로 등장한 pending ID
- `✕ ID 삭제` — 사라진 ID (claim state ≠ started/done)
- `▶ ID 시작` — 사라진 ID (claim state = started/done) — 정상 진행
- `✎ ID 내용 수정` — 같은 ID인데 파일 해시 변경
- `↕ 순서 변경: A,B → B,A` — 공통 항목의 상대 순서 변경

**30초 TTL**: `activeQueueNotifs` 배열에 `detectedAt` 타임스탬프 저장. 매 tick 만료분 제거 → 갱신 주기(30s)와 무관하게 발생 시각 기준.

**초회 로드**: `prevHubQueue`에 해당 hub 없으면 diff 없음.

**표시**: `appendHubPending` 에 `hubNotifs` 파라미터 추가. 허브 줄 아래 `       (dim) <알림>` 형식으로 삽입.

### 자기 검증 (8/8 통과)

가짜 큐 디렉터리(`/tmp/test-m2-1124-e-*`)로 5+2 시나리오 검증:

```
=== M2-1124-E 자기 검증 ===

1) 초기 로드 (prev=undefined → diff 없음)
  ✓ ids

2) 추가: [ '+ M2-1124-C 추가' ]
  ✓ 추가 알림

3) 내용 수정: [ '✎ M2-1124-B 내용 수정' ]
  ✓ 수정 알림

4) 순서 변경: [ '↕ 순서 변경: M2-1124-C,M2-1124-A → M2-1124-A,M2-1124-C' ]
  ✓ 순서 변경 알림

5) 러너 시작: [ '▶ M2-1124-A 시작' ]
  ✓ 시작 알림 (삭제 아님)

6) 삭제: [ '✕ M2-1124-C 삭제' ]
  ✓ 삭제 알림

7) 30초 만료 시뮬레이션:
  만료 후 남은 알림: [ '+ M2-1124-X 추가' ]
  ✓ 만료 후 1개 남음
  ✓ 유효 알림 ID

=== 결과: 8/8 통과 ✓ 전체 통과 ===
```

### node --check

```
node --check scripts/ci-watch.mjs
(오류 없음)
```
