actions/cache github-hosted 한정 O · 대상 단계 3개 · 다른 워크플로 cache 잔여 없음(lint.yml/ci-summary.yml 에 actions/cache@v4 단계 없음) · #224 커밋 6fc9c0d

## 작업 내용

### 수정 파일
- `.github/workflows/ci.yml` — `actions/cache@v4` 단계 3개에 `if: runner.environment == 'github-hosted'` 추가

### 대상 단계 (3개)
1. `assertions` job — "Cache Metro + Expo (assertions)" (`.expo` · `node_modules/.cache`)
2. `playwright` job — "Cache Metro + Expo" (`.expo` · `node_modules/.cache`)
3. `playwright` job — "Cache Playwright browsers" (`~/Library/Caches/ms-playwright` or `/home/runner/.cache/ms-playwright`)

### 다른 워크플로 cache 단계 전수 확인
- `lint.yml`: `actions/cache@v4` 단계 없음 (M2-1121-B에서 `cache: 'npm'` 이미 제거됨)
- `ci-summary.yml`: `actions/cache@v4` 단계 없음 (gh CLI만 사용)

### PR #224 본문 갱신
- M2-1121-D 항목 추가 (20분+ hang 근인 · 대상 3단계 · lint/ci-summary 불필요 사유)

## 커밋 정보
- Branch: `ci/M2-1121-C-cache-fix`
- SHA: `6fc9c0d`
- Push: `CuriocityDevAi/agilo-medusa-pos-fork` 성공
- PR: #224 (https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/224)
