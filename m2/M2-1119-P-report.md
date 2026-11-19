#389 멈춘 곳 pos-integration·Run POS integration tests·~10분(07:54~08:04Z) · 조치 대기(단계 시작 9분·취소 기준 미충족) · 현재 초록(08:04Z) · heavy 붙잡은 것 #389/pos-integration/~10분

## 원인 요약

**Runner 순차 starvation** — 코드 수정 불필요, CI 자체 완료.

각 job이 runner 를 하나씩 받아 순차 실행되면서 job 간 20~32분씩 대기 발생:

| job | 시작(UTC) | 완료(UTC) | 대기(이전 job 완료 → 이 job 시작) |
|-----|-----------|-----------|----------------------------------|
| markers-and-forbidden | 06:33:30 | ~06:33 | — |
| changes-filter | 06:34:22 | ~06:34 | 즉시 |
| unit-commerce-core | 06:58:53 | ~07:00 | **+24분 대기** |
| build-commerce-core | 07:20:10 | ~07:21 | **+20분 대기** |
| customer-display | 07:52:18 | ~07:53 | **+31분 대기** |
| pos-integration | 07:54:08 | 08:04:12 | +1분 대기 · 테스트 10분 소요 |

총 run 시간: 06:29:42Z → 08:04:12Z = **1h34m30s**  
`pos-integration` 의 "Run POS integration tests" 단계 자체는 ~10분 정상 완료.

## 현황 (조사 시점: 08:03Z)

- run ID: `44472559951`
- branch: `feat/M2-1119-D-cd-skip` (PR #389)
- 최종 결과: **success** (08:04:12Z)
- 조치: 취소/재실행 없음 — 단계 시작 9분 시점에 취소 기준(30분) 미달 → 대기 판정 → 자연 완료

## heavy runner 큐 현황 (08:03Z 기준)

- in_progress: #389 pos-integration (완료)
- queued: fix/M2-1118-S-fulfilled-refund (23분 대기), main push (13분 대기), ci/M2-1119-J-one-heavy PR+dispatch (1분 대기)

## 근본 원인 / 향후

현재 CI 아키텍처에서 heavy runner 1대가 job 단위로 직렬 처리 → 각 job 완료 후 다음 job 이 runner 를 재획득하는 20~30분 대기 반복.  
M1-1119-K (#394) 의 heavy-mac/heavy-cloud 분리 머지 후 해소 여부 확인 권장.
