# R0-1127-E — 통합 리허설 R1+R2 리뷰 (fork#281 · storeport#469)

**fork#281: APPROVE · 필수 0건 · 권고 3건** · CI: case1 run 45943373950 success · mutation run 45943577437 step=success(continue-on-error) 이나 **실 Playwright 종결=FAIL** 로그 확인(의도대로 red) · heavy-cloud SKIPPED (zero-cloud 준수).
**storeport#469: APPROVE · 필수 0건 · 권고 2건** · CI: mirror run 45908619349 success · feature-map-check run 45908619071 success · 소비자측 fork#281 case1 이 실제로 이 미러를 성공적으로 읽어 통과하여 미러 계약 검증됨.

PR 코멘트:
- fork#281: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/281#issuecomment-7210749776
- storeport#469: https://github.com/CuriocityDevAi/storeport/pull/469#issuecomment-7210750203

---

## 1. 직접 돌린 명령

| # | 명령 | 결과 |
|---|---|---|
| A | `gh pr view 281 --repo CuriocityDevAi/agilo-medusa-pos-fork --json headRefOid,statusCheckRollup,...` | head `1cce6300b4db309874831f22d85e4962e96fa9e2` 확인 · 모든 check SUCCESS · heavy-cloud SKIPPED · mergeStateStatus=CLEAN |
| B | `gh pr view 469 --repo CuriocityDevAi/storeport --json headRefOid,statusCheckRollup,...` | head `946a21ecc29ff8f199fb152a6f79ad1ac6705d31` 확인 · mirror+feature-map-check 둘 다 SUCCESS |
| C | `gh run view 45943373950 --repo .../fork --json jobs` | `e2e · case 1 (실서버)` success · `Playwright · Case 1 (정상 경로)` success · mutation step SKIPPED (pull_request event 라 inputs.run_mutation=false) |
| D | `gh run view 45943577437 --repo .../fork --json jobs` | workflow_dispatch · `Playwright · mutation` step conclusion=success (`continue-on-error:true`) |
| E | `gh run view 45943577437 --repo .../fork --log \| grep mutation` | **실제 Playwright**: `✘ case1-mutation-skip-confirm.spec.ts:33 ... Error: expect(locator).toBeVisible() failed ... Locator: getByTestId('earned-panel') ... element(s) not found` — OK 뒤 Confirm 생략 시 earned-panel 안 뜸 = 설계대로 red = 버그 포집 입증 |
| F | `gh pr diff 281/469 --name-only` | 파일 범위 확인(아래 §2·§3) |
| G | `gh api .../contents/<path>?ref=<head> \| base64 -d` | 각 변경 파일 read-only 조회 (워킹 트리 미변경) |
| H | `actionlint /tmp/e2e-cd-pos.yml` · `actionlint /tmp/ci-mirror-main.yml` | 둘 다 self-hosted 커스텀 라벨(`curiocity-mac-fork`·`curiocity-mac`) unknown 경고만 — `actionlint.yaml` 미설정 탓 · 실질 오류 없음. storeport 쪽 추가로 `ls | head` 에 SC2012(info) — 로그 출력용 무해 |
| I | `gh pr comment 281/469 --body-file ...` | 두 PR 모두 코멘트 1개씩 게시 (링크 상단) |

---

## 2. fork#281 — 판정 근거 (파일:줄)

### 2-1. Case 1 spec — `e2e/cd-pos/case1.spec.ts`
- `beforeEach` (L34-54): 실제 commerce-core `/auth/user/emailpass` · `/admin/pos/loyalty/sessions` → `pair_code` → `/customer-display/pair` → `device_token` 흐름을 **mock 없이** 수행. url-proxy 는 `api.meros.id → 127.0.0.1:9000` **포트 재라우팅**(mock 응답 아님).
- testID 전부 명세 대조 OK: `cd-phone-status` · `cd-phone-status-reenter` · `phone-entry-chip` (POS-HDR-PHONE 6상태) · `keypad-panel` · `first-visit-panel`·`continue-button` · `confirm-panel`·`confirm-yes-button` · `earned-panel`·`earned-amount` · `change-number-button`.
- cd-sync reducer(storeport `apps/customer-display/app/cd-sync.tsx:82`) 의 분기 (entering→first_visit/confirming→confirmed→earned) 를 그대로 반영 (L119-145).
- 첫 방문 분기 수용 (L135-145 `if (await firstVisit.isVisible())`) — test_meros 가 매 run 초기화되어 첫 방문이 될 때도 통과.
- "paid ∧ confirmed → 적립" 명세 §1.2 를 L160-167 에서 검증 (Confirm 클릭 → earned-panel 출현).

### 2-2. 거짓 통과 여지 (판정: 모두 **권고** — 블로커 아님)
- **W1 · L167 `earnedAmount.toContainText(/\d/)`** — 단지 "숫자 1자 이상". 적립 실패하여 "0 points" 라도 통과. 기대금액 계산 비교를 권고. (queue 1b 와 정합)
- **W2 · L103 `.first()` on `cd-phone-status`** — sell+checkout 두 헤더 중 앞쪽을 집음. 보이는 쪽 보장 위해 `:visible` 필터 권고.
- **W2 · L180 `cd-phone-status-reenter.not.toHaveCount(0)`** — overlay 1개라도 있으면 통과 → 보이는 쪽이 아직 `confirming` 인 회귀 못 잡음. commit 73640275·c773d6be 에서 flaky 해결 위해 완화한 이력 확인. `:visible` 복귀 권고.
- 그 외: `PHONE.slice(-4)` 로 마스킹 형식 가정 피함 ✓ · `payment-success` 는 testID 단일 ✓ · 어떤 locator 도 비조건적 `count>0` 가 없음(저 두 군데 모두 설명 코멘트 존재).

### 2-3. Mutation spec — `e2e/cd-pos/case1-mutation-skip-confirm.spec.ts`
- 전 단계(상품 선택 → add-to-cart → cart-pay → checkout-pay-cash → cash-process → payment-success → keypad → 번호 입력 → OK) 까지 통과 뒤 `confirm-yes` **를 누르지 않고** earned-panel 가시성 기대. 올바른 구현에선 earned-panel 안 뜸 → red (의도). 버그가 스며들어 Confirm 없이 earned 가 뜨면 green = regression 경보.
- 다른 이유로 red 되는 노이즈: run 45943577437 로그상 **step 1~7 전부 success**, 실패는 `case1-mutation-skip-confirm.spec.ts:69 earned-panel` 어서션에서만 발생 — mutation 효과가 정확히 분리됨.
- PHONE "08" slice(2) 반영(L219) · first-visit 분기 수용 불필요 (proceed 안 함).

### 2-4. `scripts/start-test-env.sh` — 정리성
- `down()` (L850-868): pidfile → SIGTERM → 1s → SIGKILL → 포트 9000/8082/4321 `lsof -ti | xargs kill -9` 로 포트 clean. 찌꺼기 안전.
- `up` 쪽 `reset_db()` 가 매 실행 시작에 `DROP DATABASE IF EXISTS test_meros; CREATE DATABASE` — 매 실행 깨끗.
- 포트 충돌 가능성: 러너 라벨 `curiocity-mac-fork` 전용 + `concurrency: e2e-cd-pos-${{ github.ref }}` 로 PR 내 race 방지. 다른 PR 끼리는 라벨상 단일 러너에서 직렬화 → 실질 위험 낮음. `trap EXIT down` 추가하면 더 안전(미니 메모).
- `GITHUB_ENV` 포맷: `KEY=VALUE` 만 (L872-877) — 주석·export 없음 ✓.

### 2-5. `.github/workflows/e2e-cd-pos.yml` — 러너·트리거
- `runs-on: [self-hosted, curiocity-mac-fork]` (L39) — ubuntu-latest 금지 준수 · 클라우드 0건.
- `on.pull_request.paths` 는 `e2e/cd-pos/**` · `scripts/start-test-env.sh` · 이 워크플로 자체만 트리거 (L17-20) — 관계없는 PR 에 안 돈다.
- 필수 체크 아님(워크플로명이 Branch Protection 에서 요구 안 되는 `e2e-cd-pos` · 정보용).
- `concurrency: e2e-cd-pos-${{ github.ref }}` + `cancel-in-progress: false` — PR 내 중첩 방지.
- mutation step `continue-on-error: true` + `|| echo "..."` — red 결과를 로그로만 보존하고 잡 전체는 green. 설계 의도대로이지만 **GitHub Checks 에서 step=success 로 보이므로** run log 를 직접 읽어 red 확인하는 게 유일한 검증 경로(본 리뷰가 그걸 수행함).
- actionlint: unknown label 경고만. 실질 오류 없음.

### 2-6. KeypadScreen "08" auto-prefix (queue 1f)
- `storeport apps/customer-display/src/screens/KeypadScreen.tsx:91,106` 가 `onDigitsChange/onOk` 에서 `"08" + digits` 전송.
- `case1.spec.ts:25` 와 mutation `:219` 가 `PHONE.slice(2)` 로 이 암묵 규칙을 전제함. `specs/screens/customer-display.md` 에는 "08 자동 prefix" 명시 없음 — 코드 수정 아닌 **명세 반영 필요** (판단: 오케·Kyu).

---

## 3. storeport#469 — 판정 근거 (파일:줄)

### 3-1. rsync `--delete` 안전성 — `.github/workflows/ci-mirror-main.yml:72-80`
- 소스 = `${{ github.workspace }}/` (actions/checkout 이 매번 깨끗) · 타깃 = env `MIRROR_TARGET: /Users/KyuLee/ci-mirror/storeport` (L46, 하드코딩 상수).
- `--delete` 범위 = 타깃 디렉토리 내부 미매치 파일만. 러너의 다른 폴더(`actions-runner`, 홈 전체) 범위 밖.
- "빈 변수 → `/` 삭제" 시나리오: env 블록 하드코딩 + `set -eux` + 선행 `mkdir -p` 로 3중 보호. 이론적 공격 표면 없음.
- exclude 목록(`.git`·`node_modules`·`.turbo`·`dist`·`build`·`*.log`) — `.env*` 는 빠짐(W2 참조).

### 3-2. Secrets / `.env`
- `actions/checkout` 은 git-tracked 파일만 가져옴. `.env`·`.env.local` 은 관례상 `.gitignore` → workspace 에 없음.
- `GITHUB_TOKEN` · CI secrets 는 env 로만 주입되고 파일로 쓰지 않음 → 미러 안 들어감.
- **W2** 로 `.env*` exclude 를 방어적으로 추가 권고.

### 3-3. pull_request 트리거의 "PR 브랜치 내용 미러링" 위험
- `on.pull_request.paths: [".github/workflows/ci-mirror-main.yml"]` (L19-20) — 이 파일 수정 PR 에서만.
- **더 중요한 보호**: `actions/checkout` 이 `ref: main` **명시** (L51). PR event 라도 main 을 가져옴 → PR 브랜치 코드는 미러로 가지 않음.
- 따라서 "fork 가 non-main 코드로 도는" 시나리오는 발생하지 않음. 머지 뒤도 동일.

### 3-4. 동시성 / reader-writer race
- `concurrency: group: ci-mirror-main` (ref 접미사 없음) + `cancel-in-progress: false` (L31-33) — 전역 writer 1잡.
- **그러나 reader (fork `e2e-cd-pos`) 와 교차-리포 동시성 보호 없음** — rsync 진행 중에 fork job 이 디렉토리를 읽으면 부분 상태 가능. **W1 권고** (sentinel / 스테이징→mv / flock).

### 3-5. `actionlint`
- `curiocity-mac` 라벨 unknown 경고(설정 파일 없음) · `ls -la "$MIRROR_TARGET" | head -20` 에 SC2012 info — 로그 출력용 무해.

---

## 4. 요약 · 다음 틱

- **fork#281 merge 가능**(APPROVE). W1(earned 금액 어서션 강화) 은 다음 PR 에서 손보는 게 좋음 — mutation 이 "Confirm 없을 때 적립 없음" 을 이미 보장하지만, 반대로 "Confirm 있을 때 **올바른 금액** 적립" 은 아직 느슨.
- **storeport#469 merge 가능**(APPROVE). W1(atomic mirror) 은 소비자(fork e2e) 쪽이 `storeport.sha` 를 sentinel 로 체크하도록 1줄 추가해도 되고, writer 쪽을 staging→mv 로 바꿔도 됨. 우선순위는 fork 측에서 미러 race 로 실패 빈도 확인 후.
- 둘 다 zero-cloud decision 준수 확인. decision-storeport-ci-dead-20261127 ("미시작 ≠ 초록") 원칙에 맞춰, fork#281 의 case1·mutation 모두 **실제로 돌아 성공한 실 run** 기준으로 판정.

리포트 완료.
