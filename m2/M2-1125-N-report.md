# M2-1125-N 완료 리포트

**작성**: 2026-11-25  
**브랜치**: feat/M2-1125-I-ci-watch-layout  
**HEAD**: f64575fa0

---

## 가설 확인

러너 폴더(`~/projects/curiocity-relay`)는 `origin/main`을 safe-push ours-merge 방식으로 갱신한다. fetch 없이 `git merge -X ours origin/main` → push 하는 사이클 사이에 다른 허브의 커밋은 `origin/main`에만 존재하고, 로컬 워크트리에는 반영되지 않는다.  
ci-watch가 워크트리 파일시스템에서 직접 읽던 구조에서 `git show origin/main:<path>`로 전환하면 stale 현상이 해소된다.

---

## 변경 내용

### 신규: `scripts/watch/sources-git.mjs`

git origin/main 오브젝트 직접 읽기 모듈.

- `maybeGitFetch(repoRoot)` — 30s 인터벌 rate-limit, `git fetch origin main`
- `getDataOrigin()` — `{ sha, ageSec }` 반환 (UI 표시용)
- `gitShowText/Json/Jsonl/gitListPaths` — `git show origin/main:<path>` 래퍼
- `readAllJsonGit / readClaimGit / scanClaimsDirGit` — 고레벨 접근자

### 수정: `scripts/watch/collect-view.mjs`

- `buildExtendedView` — `repoRoot` 파라미터 시 `maybeGitFetch` 선행
- `readAllJson` → `readAllJsonGit` fallback (repoRoot 있으면 git 우선)
- `readClaim` → `readClaimGit` fallback (inProgress 계산 · done 판정)
- `scanClaimsDir` → `scanClaimsDirGit` fallback (doneToday 집계)
- 반환값에 `dataOrigin` 필드 추가

### 수정: `scripts/watch/render-v2.mjs`

- `renderDataOriginLine(dataOrigin)` 함수 신설
- `renderV2` — 요약 바 아래에 `data origin/main @<sha> · <N>s 전 fetch` 한 줄 추가

### 수정: `scripts/ci-watch-v2.mjs`

- 버전 2.3.0
- `--once` 모드 시 `maybeGitFetch(REPO_ROOT)` 선행
- `import { maybeGitFetch } from './watch/sources-git.mjs'` 추가

---

## 테스트

```
78/78 pass
```

신규 테스트 2건:

| 테스트 | 내용 |
|--------|------|
| T-N1 | origin/main done claim → doneToday 반영 (stale 방지) |
| T-N2 | origin/main done+no-PR → inProgress 0건 (stale 방지) |

git fixture: bare remote + local clone + second clone 구조.  
second clone에서 커밋·push → local clone이 `git fetch` 후 origin/main에서 읽도록 검증.

---

## 머지 해소

원격 브랜치(`feat/M2-1125-I-ci-watch-layout`)에 M2-1125-M (CI 큐 한 출처 통일) 커밋이 먼저 푸시되어 있었다.  
force push 금지 원칙에 따라 `git merge origin/feat/M2-1125-I-ci-watch-layout` 로 머지.  
5개 파일 충돌 → `--ours` 베이스 위에 M2-1125-M 추가 내용(fetchGhForkRuns, fetchForkRuns 파라미터, steps 7.5a/b/c, T-GH1~4, T-CWD1 테스트)을 수동 편입.

---

## 커밋

| SHA | 메시지 |
|-----|--------|
| `ebe221ebc` | feat(ci-watch): M2-1125-N — git origin/main 오브젝트 stale 방지 + data origin 표시 |
| `f64575fa0` | merge: origin/feat/M2-1125-I-ci-watch-layout → M2-1125-N 충돌 해소 |

---

## UI 출력 확인

```
ci-watch  11/25/2026 13:40:09  ●진행 5  ■주의 2  ✔오늘 65  runner v8.3.2   CI ●●●●
data origin/main @0bbf271 · 1s 전 fetch
```

`data origin/main @<sha> · <N>s 전 fetch` 라인이 요약 바 아래에 정상 출력됨.
