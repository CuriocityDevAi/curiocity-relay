#36 APPROVE · #37 APPROVE

## #36 feat/M2-1125-Z-ci-box-setup (head f9db552f)

**R0-1125-AO CHANGES 해소 확인**

`install_homebrew()` 에 `eval "$(brew shellenv)"` 추가 → 현 세션 PATH 갱신 수정.

`env -i PATH=/usr/bin:/bin HOME=$HOME bash setup.sh --dry-run` 결과:
```
[ci-box] Installing Homebrew...
[DRY]   /bin/bash -c ...
[DRY]   eval "$(/opt/homebrew/bin/brew shellenv)"  ← 현 세션 PATH 갱신 (핵심 수정)
[ci-box] ✓ Homebrew installed
[DRY]   brew install postgresql@16
[DRY]   brew services start postgresql@16
[DRY]   brew install gh
...러너 등록 4개 정상 출력
```

- Homebrew 설치 직후 `/opt/homebrew/bin` 현 세션 추가 → 이후 `brew` 명령 연속 정상
- DRY_RUN 분기: `\$(...)` 이스케이프로 실제 `brew shellenv` 미실행, 명령문만 출력 — 올바름
- 판정: **APPROVE** (자기 PR 제한으로 COMMENT 제출, comment id 7167334136)

---

## #37 fix/M2-1125-AA-ci-watch-relay-pr (head 2b31544)

**URL 파싱 수정**

- step 2.1 sync(L387) + async(L1050): `.slice(-3)[0]` 적용
  - `.../curiocity-relay/pull/36` → `'curiocity-relay'` ✓ (기존 `.slice(-2)[0]` = `'pull'` 오류)

**NO_CI_REPOS 제외**

- step 7.5b sync(L596) + async(L1240): `pr.repo` 직접 사용 → relay PR CI 풀 pre-queue 추가 차단

**storeport/fork PR 감시 무영향**

- `NO_CI_REPOS = new Set(['curiocity-relay'])` 만 포함, storeport/agilo-fork 무관

**테스트**

```
ci-watch-v2.test.mjs : tests 83 / pass 83 / fail 0 ✓
ci-health-k.test.mjs : tests 27 / pass 27 / fail 0 ✓
```

- 판정: **APPROVE** (자기 PR 제한으로 COMMENT 제출, comment id 7167349844)
