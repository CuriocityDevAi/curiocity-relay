flow-tests 원인 기존 (self-hosted 캐시 복원 지연 · 테스트 미도달) · assertions 기존 1건만 (m3-1105-aa · #218/master 동일) · 수정 커밋 없음

# M0-1121-C REPORT

## 결론

- **#220 탓 아님** · 코드 수정 없음
- `assertions` 실패 = 기존 `m3-1105-aa-assertions.mjs` 1건만 (SuccessReceiptAnim 보조 버튼 flex-row). #218 · master `005b32f` 동일 실패 → 마스터 기존 결함
- `flow-tests` CANCELLED = self-hosted macOS runner (`/Users/kyu.lee/actions-runner-fork/...`)의 캐시 복원 다운로드가 5.8 GB를 0.4~0.9 MB/s 로 받다 5 분 timeout. 테스트 코드 실행 전 cancel · #220 영향 전혀 없음

## 근거 (run id · job id · SHA)

### #220 PR (head db76660 · run 44853876391)

| 체크      | 결과      | 시간    | 실패 테스트            |
| --------- | --------- | ------- | ---------------------- |
| route     | ✓         | 45s     | —                      |
| assertions| ✗         | 11m35s  | m3-1105-aa (47중 1건)  |
| flow-tests| CANCELLED | 5m16s   | 테스트 미도달 (캐시 DL)|

- assertions 로그 `02:40:51` — "총 47 개 · 46 PASS · 1 FAIL · 27.8s · 실패: m3-1105-aa-assertions.mjs"
- assertions 11m35s 중 테스트 실행 27.8s · 나머지는 캐시 복원·셋업 (job 로그 `02:29:25` 시작 · `02:40:23` 테스트 시작 — 약 11 분이 pre-step)
- flow-tests 로그 — 캐시 파일 5,841,940,126 B 중 239 MB (4.1%)까지 받은 뒤 `02:29:04 ##[error]The operation was canceled.` (5 분 timeout). 테스트 코드 한 줄도 실행되지 않음.

### #218 PR (head 462dcb77 · run 44853866496 · 비교 기준)

| 체크      | 결과   | 시간   | 실패 테스트            |
| --------- | ------ | ------ | ---------------------- |
| flow-tests| ✓      | 2m55s  | —                      |
| assertions| ✗      | 1m15s  | m3-1105-aa (47중 1건)  |

### master (SHA 005b32f · run 44853849828 · "기존" 근거)

| 체크      | 결과   | 시간   | 실패 테스트            |
| --------- | ------ | ------ | ---------------------- |
| flow-tests| ✓      | 2m54s  | —                      |
| assertions| ✗      | 1m15s  | m3-1105-aa (기존)      |

## 분석 — 왜 #220 탓이 아닌가

### assertions 11m35s vs #218 1m15s

`m3-1105-aa` 단 1건 실패 · 테스트 실행 자체는 27.8s (#218 27.2s와 동치). 추가 깨뜨린 테스트 0개.

11m35s 중 10분 가량은 **"Failed to restore: The operation cannot be completed in timeout"** (CI 주석 `.github#125`) — 즉 Metro+Expo 캐시 복원이 timeout 걸려 다시 받으며 밀렸음. 시간 차이는 `self-hosted runner 캐시 fetch 지연` 이며 PR 코드 변경과 무관.

### flow-tests CANCELLED

실행 시작부터 5 분 내내 캐시 다운로드 (`actions/cache`) 가 0.4~0.9 MB/s 로 진행되어 5.8 GB 중 239 MB (4.1%) 수신한 뒤 5 분 timeout 으로 cancel. **테스트 setup / 실행 코드 자체에 전혀 도달 못함** → `#220` 범위 파일 (`lib/printer/**` · 로고 테스트 · `package*.json` → upng-js/pako 추가) 이 테스트 실행 시간에 기여할 여지가 없음.

같은 self-hosted runner에서 과거 동일 PR이 2m55s에 끝났고 (#218), 이번 run 에서만 밀린 것은 러너 네트워크/디스크 contention 또는 캐시 서버 응답 저하.

## 권장 조치 (사용자 결정 소관)

- 재런 (`gh run rerun 44853876391 --repo CuriocityDevAi/agilo-medusa-pos-fork --failed`) 으로 캐시 핫 상태에서 다시 돌리면 flow-tests 통과 가능성 높음
- `m3-1105-aa` 기존 실패는 별도 트랙에서 처리 (M0-1121-C 범위 밖)

## 커밋/푸시

- fork 브랜치 (`fix/M0-1121-A-ble-logo`) 손대지 않음
- relay `m0/M0-1121-C-report.md` 만 커밋+푸시
