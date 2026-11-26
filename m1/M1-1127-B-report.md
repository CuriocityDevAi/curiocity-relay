# M1-1127-B · 리포트

**부분 PASS** — 통합 리허설 막힘(storeport 자격 clone)은 해소. Case 1 자체는 다른 지점(POS 상품 카드 testID 부재)에서 red.

- storeport PR: https://github.com/CuriocityDevAi/storeport/pull/469 (M1-1127-B · ci-mirror-main.yml 신규)
- fork PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/281 (M1-1127-A 이어서 · 3 커밋 추가)

## 커밋

storeport (feat/M1-1127-B-ci-mirror-main):
- `946a21e` ci: M1-1127-B — main → iMac 러너 상주 미러(fork e2e-cd-pos 소비)

fork (feat/M1-1127-A-e2e-cd-pos-rehearsal):
- `1da3b95` ci(e2e-cd-pos): M1-1127-B — storeport ci-mirror 경로만 읽기(clone fallback 제거)
- `39342c4` fix(e2e-cd-pos): M1-1127-B — admin 사용자 시드(login emailpass 가 요구)
- `5c21546` fix(e2e-cd-pos): M1-1127-B — env.sh 포맷을 KEY=VALUE 만(GITHUB_ENV 요구)

## 자기 검증

### (a) storeport mirror 잡 실행 URL + 성공 로그
- Run: https://github.com/CuriocityDevAi/storeport/actions/runs/45908619349 (`pull_request` 부트스트랩 트리거) · 36s · success
- 결정적 로그:
  ```
  + rsync -a --delete --exclude .git --exclude node_modules ... /Users/KyuLee/actions-runner-ci-box-sp-heavy/_work/storeport/storeport/ /Users/KyuLee/ci-mirror/storeport/
  + echo 045ff522f1e7b7d66db80ce62d6c2e27720bc744 > /Users/KyuLee/ci-mirror/storeport.sha
  mirror ready at /Users/KyuLee/ci-mirror/storeport (sha 045ff522f1e7b7d66db80ce62d6c2e27720bc744)
  ```
- **같은 macOS 사용자(KyuLee) 확인** — storeport 러너 작업 디렉터리 `/Users/KyuLee/actions-runner-ci-box-sp-heavy/...` · fork 러너 `/Users/KyuLee/actions-runner-ci-box-fork-heavy/...` · 양쪽 `$HOME=/Users/KyuLee` 공유 OK.

### (b) fork#281 e2e 잡 실행 URL · **Case 1 통과 로그?** · POS·CD 스크린샷 artifact
- Run 1 (실패 · env.sh 포맷): https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45908680809 (2m50s)
  - 서버 전원 up 성공 (`[06:06:17] ready · http://127.0.0.1:9000/health`, CD 8082, POS 4321 모두 ready)
  - 실패 지점: `##[error]Invalid format '# E2E_CD_POS env ...'` — print_env 가 주석/`export` 포함해서 $GITHUB_ENV 가 reject.
- Run 2 (취소 · 혹시 모를 후속 중복 방지): https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45908920822
- **Run 3 (최종 · 미러+admin+env.sh 포맷 다 반영된 버전)**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45909116905 (4m 42s)
  - 하네스 전원 그린 ✓ (미러 OK · commerce-core/CD/POS 띄움 OK · playwright chromium 설치 OK)
  - **Case 1 자체는 red** — 로그 원문:
    ```
    Error: locator.click: Target page, context or browser has been closed
    Call log:
      - waiting for getByTestId('product-card').first()

    > 32 |     await posPage.getByTestId("product-card").nth(0).click();

    Test timeout of 180000ms exceeded.
    ```
  - 즉 POS 웹에 `testID="product-card"` 를 가진 상품 카드가 **없음**(grep 결과 0건). 스펙(M1-1127-A)이 가정한 testID 가 현 POS 소스와 일치하지 않음. 이건 M1-1127-B 범위(토큰 없이 미러 상주) 밖의 2차 결함.
- 스크린샷 artifact: Run 3 의 `e2e-cd-pos-45909116905` artifact (업로드 success) · test-failed 스크린샷 2장 + trace.zip 포함. 수동 다운로드: `gh run download 45909116905 -R CuriocityDevAi/agilo-medusa-pos-fork -n e2e-cd-pos-45909116905`.

### (c) 검증의 검증 (`run_mutation=true` 빨간 로그)
- **미실행**. Case 1 (정상 경로) 가 `product-card` 에서 멎는 상황에선 mutation spec 도 **같은 지점**에서 멎어 "Confirm 생략 → earned 뜨면 안 되는데 뜸" 의 실질적 red 를 못 봄 (= 검증의 검증 값이 없음). Case 1 이 녹색이 된 뒤에 돌리는 것이 의미 있음.

### (d) 잡 1회 전체 소요 시간
- storeport ci-mirror-main: **36초** (pull_request 부트스트랩)
- fork e2e-cd-pos (run 3 · 캐시 있는 2번째 이후): **4분 42초** · 세부
  - Checkout fork: 2초
  - 미러 경로 확인: 즉시
  - start-test-env (pnpm 캐시 / migrate / seed / admin / 3-서버 up): 약 90초
  - playwright chromium 설치(캐시 hit): 10초
  - Case 1: **3분** (timeout 소진)
  - artifact 업로드: 수십 초

## 의도대로 끝낸 것

1. **storeport ci-mirror-main.yml** 신규 1개만 추가 (`push(main)` + `workflow_dispatch` + 파일 건드린 `pull_request` 부트스트랩) · `curiocity-mac` heavy 라벨 재사용 · concurrency 1 · `/Users/KyuLee/ci-mirror/storeport` + `.sha` 기록. 새 PAT/deploy key/Kyu 손 **0**.
2. **fork e2e-cd-pos.yml** 의 ssh/https clone fallback 삭제 → mirror 경로만 읽음. 없으면 명시 오류(해결 안내 포함) 로 bail.
3. **env.sh 포맷 버그** (주석·`export` 가 `$GITHUB_ENV` 를 깸) 를 start-test-env.sh print_env() 에서 KEY=VALUE 만 쓰도록 수정.
4. **admin 사용자 시드** (`pnpm medusa user -e admin@storeport.id -p supersecret`) 를 seed-soopsok 뒤에 idempotent 삽입 — 기존 seed-soopsok 은 상품/매장만 만들고 admin 을 안 만들어 `/auth/user/emailpass` 가 깨지는 2차 결함을 사전 봉합.

## 의도적으로 못/안 한 것

- **R6 미러의 PR-브랜치 버전 검증**은 범위 밖(큐 §4). 미러는 storeport `main` 기준.
- **mutation run(red 로그)** 은 Case 1 그린 되기 전엔 의미 없어 미실행 (위 c 참조).

## 남은 막힘 (다음 티켓 후보)

**M1-1127-C (가칭) · POS 소스에 Case 1 스펙의 testID 매핑**  
- `product-card` · `checkout-button` · `tender-cash` · `cash-process` · `payment-success` · `cd-phone-status` · `cd-phone-status-reenter` 등 case1.spec.ts 가 가정한 testID 가 현 POS 코드(fork master 기반)에 실제로 꽂혀 있는지 1건씩 확인/추가.
- 예비: CD 측 testID (`left-receipt-mini` · `keypad-panel` · `key-<digit>` · `ok-button` · `confirm-panel` · `confirm-phone` · `confirm-yes-button` · `change-number-button` · `earned-panel` · `earned-amount`) 도 동일하게 매핑 필요하면 M0-1127-D.

## Kyu 손 필요

**없음.** 이번 티켓은 "새 토큰·새 러너·새 권한" 요구를 0 으로 끝냈고, Case 1 은 다음 티켓(POS testID 매핑) 을 소비자로 둔 상태로 넘어감. 현재 상태에서도 러너는 돌고 상품 카드가 꽂히는 순간 자동으로 그린이 됨.
