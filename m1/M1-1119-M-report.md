#394 · busy=true 실측 O(https://github.com/CuriocityDevAi/storeport/actions/runs/44496787309) · 클라우드로 넘어감 X(quota 초과 10/5) · ubuntu pos-int 실행 초록 X(미검증·동일 원인) · 한가할 때 맥 O · 오늘 클라우드 3건(heavy-cloud 실제)

## 실측 결과

### REQ 1 · 맥 바쁘게 만들기 ✓
- PR #394 (ci/M2-1119-J-one-heavy) 동일 브랜치에 workflow_dispatch 를 별도 실행 → workflow_dispatch concurrency group(`ci-refs/heads/ci/M2-1119-J-one-heavy`) ≠ PR concurrency group(`ci-refs/pull/394/merge`) 임을 확인
- Run 44496380929(workflow_dispatch) + Run 44495572976(PR pull_request) 두 heavy-mac 동시 큐 → 먼저 44495572976 heavy-mac `in_progress`, 직후 44496380929 heavy-mac `in_progress` 확인

### REQ 2 · busy=true 감지 · 클라우드 라우팅 ⚠️
| 항목 | 결과 |
|------|------|
| runner_busy=true 감지 | **O** |
| 클라우드로 넘어감 | **X** |

- **run**: https://github.com/CuriocityDevAi/storeport/actions/runs/44496787309
- **route job ID**: 135465970941
- **route log**:
  ```
  runner_busy=true
  cloud_today=10  quota=5 (5 + extra=0)
  → self-hosted (quota exceeded · used=10/5)
  라벨 추가: ci-cloud-quota-exceeded → PR #394
  ```
- **감지 경로**: Primary(runners API) 가 아닌 Fallback(in_progress heavy-mac job) 로 `runner_busy=true` 판정
  - GITHUB_TOKEN `actions:read` 권한으로 runners API(`/repos/.../actions/runners`) 호출 → 실제로는 HTTP 403 으로 실패(stderr 무시) → fallback 로 진행
  - Run 44496380929(workflow_dispatch)의 heavy-mac `in_progress` → 감지 성공

### REQ 2 · 클라우드 라우팅 실패 원인 (버그 발견)
`_cloud_today()` 함수가 heavy-mac 실행을 cloud 로 오산 중:

```
select(.name | test("^heavy")) |      ← "heavy-mac" 도 통과
select(
  .name == "heavy-cloud" or
  ((.runner_name // "") != "" and
   (.runner_name | test("curiocity") | not))  ← "Youngkyus-MacBook-Pro-M1" 은 curiocity 미포함 → true
)
```

- heavy-mac 의 실제 runner_name = `Youngkyus-MacBook-Pro-M1` (curiocity 미포함)
- 의도: curiocity 에 없는 runner = ubuntu(cloud) 로 판별하려 했지만
- 실제: Mac heavy runner 호스트명이 curiocity 를 포함하지 않아 mac 실행도 cloud 로 오산
- 결과: 오늘 heavy-mac 성공·실패 건이 모두 누적되어 cloud_today=10

### REQ 3 · ubuntu pos-int 실행 (미검증)
- force_cloud=true 로 workflow_dispatch 시도 시 동일한 `_cloud_today()` 함수 경유 → quota exceeded → self-hosted 로 fallback
- 버그 미수정 상태에서는 실행 불가
- **미검증 사유**: _cloud_today() 카운터 버그로 quota 초과 판정

### REQ 4 · 한가할 때 맥 ✓
| Run | runner_busy | 결과 |
|-----|-------------|------|
| 44493395490 | false | → self-hosted (runner idle) · heavy-mac queued |
| 44495572976 | false | → self-hosted (runner idle) · heavy-mac queued |

### REQ 5 · 오늘 클라우드 사용 건수
| Run | 종류 | heavy-cloud |
|-----|------|-------------|
| 44484170880 | workflow_dispatch (force_cloud=true) | success ← **1건** |
| 44483264552 | workflow_dispatch | failure ← **2건** |
| 44481392755 | workflow_dispatch | failure ← **3건** |

- **실제 cloud 사용 = 3건** (heavy-cloud 비-skipped)
- 버그 카운터 cloud_today = 10 (heavy-mac 7건 오산 포함)

## 타임라인
- 09:04 UTC: 1차 빈 커밋 push (run 44493044935 → heavy-mac queued → concurrency 취소)
- 09:06 UTC: 2차 빈 커밋 push (run 44493395490, route: runner_busy=false → heavy-mac → 취소)
- 09:28 UTC: 4차 빈 커밋 push (heavy-mac in_progress 타이밍 포착)
- 09:29 UTC: run 44496787309 route → **runner_busy=true** 감지 ✓
- 09:32 UTC: quota exceeded 10/5 → self-hosted fallback

## 결론 및 후속 조치 필요
1. **runner_busy=true 감지 로직**: ✅ 작동 확인 (fallback 경로)
2. **클라우드 라우팅**: ❌ _cloud_today() 버그로 차단됨
3. **수정 필요**: route-heavy.sh `_cloud_today()` — heavy-mac job 명칭으로 필터 추가(`select(.name == "heavy-cloud")` 만 카운트) 또는 runner_name 에 hostname 대신 label 사용
4. **runners API 권한**: GITHUB_TOKEN `actions:read` 로는 runners API 접근 불가 → workflow permissions 에 `administration: read` 추가 필요 (또는 PAT)
