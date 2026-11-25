PASS

## M2-1125-Q — ci-watch 부팅 가속

### 합격 수치

| 항목 | 기준 | 실측 | 판정 |
|------|------|------|------|
| `--once` 시간 | ≤ 3초 | **0.5~0.9초** (최초 0.93s, 이후 0.4s) | ✅ |
| 대화형 첫 화면 | ≤ 2초 | **~1초** (skipFetch+skipGh) | ✅ |
| git 프로세스/갱신 | ≤ 5 | **5** (git-show×1 + ls-tree×1 + cat-file×3) | ✅ |
| 테스트 | 83 pass + 회귀 없음 | **319/319 pass** | ✅ |

---

### 전후 수치

| | 수정 전 | 수정 후 |
|--|---------|---------|
| `--once` 소요 | 63.69초 | 0.5~0.9초 |
| claims 읽기 방식 | 파일마다 `git show` (1,263 프로세스) | `git cat-file --batch` 1회 (날짜 필터 → 88파일) |
| git 프로세스/갱신 | ~1,263+ | 5 |
| 대화형 첫 화면 | 30초+ 무출력 | ~1초 즉시 |

---

### 원인 분석

`sources-git.mjs:scanClaimsDirGit`이 `status/claims/`의 모든 파일(7월부터 1,263개)을
파일마다 별도 `git show` 프로세스로 읽음. 각 `git show` ~50ms × 1,263 = ~63초.

---

### 수정 내용

**a. MMDD 날짜 필터 (`getRecentMmddSet` + `scanClaimsDirGitFast`)**
- 오늘+어제 MMDD만 허용 → 1,263개 → 88개 (93% 감소)
- `--once` 오늘 완료: 83 (origin/main today done: 81 + 어제 ID 중 오늘 `at` 2건)

**b. 배치 읽기 (`gitCatFileBatch`)**
- `git cat-file --batch` stdin 파이프 1프로세스로 N개 오브젝트 일괄 읽기
- `pipeline-view.mjs` 큐 claims (~89개) + `collect-view.mjs` 비-큐 카드 claims 각각 1회

**c. 첫 화면 즉시 (`skipFetch`, `skipGh`, `tickFast`)**
- `--once`: `skipFetch=true` + `skipGh=true` → git fetch, gh API 모두 건너뜀
- 대화형: `tickFast()` → skipFetch+skipGh로 즉시 렌더 → 비동기 fetch 완료 후 재렌더
- 이후 주기 갱신(3초): fetch 30초 캐시, gh 30초 캐시 사용

**d. 타임아웃 (`maybeGitFetchAsync`)**
- spawn 기반 비동기 fetch, 10초 타임아웃, 실패해도 화면 유지

---

### 테스트 로그

```
# tests 319
# pass 319
# fail 0
```

테스트 대상: `ci-watch-v2.test.mjs`(83) + `ci-watch-k.test.mjs` + `ci-watch-prompt-id.test.mjs` + `ci-watch-deploy.test.mjs` + hub-runner 관련 전체

---

### 커밋/PR

- 커밋: `ea158bcc2` (feat/M2-1125-Q)
- PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/35
- base: `feat/M2-1125-I-ci-watch-layout` (PR #34)
