#423 APPROVE · #28 CHANGES

## #423 — fix(multi-store): M1-1124-R · selectPimTarget 순수 함수 · --pim-id

### 체크리스트
- ✅ pimName 우선 → PS 제외 후보 1개면 그것 → 그 외 abort (변경 0)
- ✅ psName 매장 절대 rename 안 됨 (`--pim-id` 경로: `loc.name === psName` → abort; 일반 경로: `filter(l => l.name !== psName)`)
- ✅ `--pim-id` 플래그 (`parseArgs` switch + `selectPimTarget` 4번째 인자)
- ✅ dry-run 맨 위 매장 목록 (`existing stock locations: N` + id·name 행, `selectPimTarget` 호출 전 출력)
- ✅ 단위 테스트 11/11 통과 (`pnpm --filter commerce-core test --testPathPattern=setup-multi-store`)
- ⚠️ CI: check-runs API 403 (로컬 CI 러너 운영, GitHub Actions 체크 미연동)

### 세부 확인
`selectPimTarget` 순수 함수 분리 명확. 6케이스 커버 (1개 rename / PIM+PS 멱등 / 2개 abort / --pim-id 직접 / --pim-id=PS abort / 0개 abort). `--pim-id` not-found 케이스는 코드에 있으나 테스트 없음 — minor, blocker 아님.

**→ APPROVE**

---

## #28 — feat(ci-watch): M1-1124-P · v2.0 9칸 파이프라인 칸반

### 체크리스트
- ✅ v1.4·러너 install 영향 없음: `install.sh` 변경은 ci-watch-v2 심링크 추가만, v1.4 심링크 코드 미수정. `ci-watch.sh` 내 `--v2` 분기는 순수 추가 — `--v2` 없을 때 `CI_WATCH` 그대로 유지.
- ✅ `--v2` 실행·`q`/Ctrl+C: `stdin.on('data')` q/Q 처리, SIGINT 핸들러로 Ctrl+C 처리
- ❌ **가짜 경보 (CHANGES)**: review 칸 `predicted=true` 누락 → 로컬 판단 불가 원칙 위반
- ❌ **제목 "## 요약" 버그 (CHANGES)**: `extractReportTitle` fallback이 마크다운 h2 헤딩을 카드 제목으로 반환 — 실제 렌더 확인됨
- ✅ 단위 테스트 25/25 통과 (`node --test scripts/test/ci-watch-v2.test.mjs`)

### CHANGES 1 — review 칸 `predicted=true` 누락

`pipeline-view.mjs` step 6:

```js
// 현재:
card.column = 'review';
// card.predicted = true; ← 없음
```

r0 APPROVE 리포트 mtime 기준으로 review 칸에 배치하지만, 머지 여부는 `status/pipeline/<id>.jsonl` (R8 이후) 없이는 로컬 확인 불가. 결과: 이미 머지된 작업(M0-1124-J/K · M3-1124-L/M 등)이 mtime 2시간 이내이면 "리뷰 대기 N분 ■"으로 표시됨 (40분 초과 → RED).

`ci_pending` 칸은 `card.predicted = true` 처리 있음; review 칸에도 동일하게 추가 필요.

**수정:** `card.predicted = true;` 한 줄 추가 (step 6 review 배치부).

### CHANGES 2 — `extractReportTitle` ## 헤딩 필터 누락

`sources-local.mjs`:

```js
// 2번째 fallback 루프 — 현재:
if (s && !/^(PASS|FAIL|APPROVE|CHANGES|SPEC|PLAN)\b/.test(s) && s.length < 120) return s;
// "## 요약" → 위 조건 통과 → 카드 제목으로 반환
```

실제 렌더에서 M1-1124-N 카드 제목이 `## 요약`으로 출력됨(확인).

**수정:** `!s.startsWith('#')` 조건 추가:
```js
if (s && !s.startsWith('#') && !/^(PASS|FAIL|APPROVE|CHANGES|SPEC|PLAN)\b/.test(s) && s.length < 120) return s;
```

또는 1번째 루프에서 `##` / `###` 헤딩도 처리:
```js
if (s.startsWith('## ')) return s.slice(3).trim();
```

**→ CHANGES (2건)**
