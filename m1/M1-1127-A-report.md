# M1-1127-A · 통합 E2E 리허설 R1+R2 — 부분 착지

**부분 (PARTIAL)** · PR [#281](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/281) · 커밋 `c7b30ee`+`299c693` · 걸린 시간 ≈ 55분

## 블로커 (요약)

아이맥 러너(`actions-runner-ci-box-fork-heavy` · user `KyuLee`) 에 **storeport 상주 clone 이 없음** + git credential (ssh/https 둘 다) 미설정. 새 토큰 발급 금지 제약을 지키면서 CI 안에서 자동 clone 하는 길을 2개(ssh/https) 시도했으나 모두 실패 — PR 본문 "Kyu 손 필요" 에 **1회 수동 clone** 절차 수록.

## 착지한 것 (코드)

- `scripts/start-test-env.sh` (168 L) — commerce-core(Medusa develop · PORT 9000) · customer-display(expo web export · 8082) · POS web(fork dist · 4321) · Postgres `test_meros` 매 실행 초기화. up/down/env. mock·MSW 금지 준수.
- `e2e/cd-pos/playwright.config.ts` — 기존 `playwright.config.ts` 와 **분리**. `globalSetup` 이 하네스 ping(60s) 만 수행.
- `e2e/cd-pos/fixtures/two-browser.ts` — POS 탭 + CD 탭 각자 다른 BrowserContext(viewport 분리).
- `e2e/cd-pos/helpers/pos-auth.ts` — 실 서버 `/auth/user/emailpass` 토큰 받아 POS localStorage 시드(mock seedAuth 와 분리).
- `e2e/cd-pos/case1.spec.ts` — 상품 2개 → Cash → CD 영수증 → 키패드 → 번호 입력 → OK → **Confirm 카드** → Correct → 적립 전 단계 어서션. 명세 testID(`keypad-panel`·`confirm-panel`·`earned-panel` 등) 기반. Payment successful 화면 Phone entry 칩 없어야 함(11-26 23:07 Kyu 결정) assert 포함.
- `e2e/cd-pos/case1-mutation-skip-confirm.spec.ts` — 검증의 검증. `E2E_MUTATION=skip-confirm` 일 때만 실행. OK 뒤 Confirm 생략 후 earned-panel 존재 어서션 → 올바른 구현에서 실패 = 빨간 로그. 11-26 23:05 Kyu 실기 버그(OK → Confirm 없이 초기화 · mock 통과) 재발 감지.
- `.github/workflows/e2e-cd-pos.yml` — `pull_request` (path filter `e2e/cd-pos/**`) + `workflow_dispatch` · `[self-hosted, curiocity-mac-fork]` · ubuntu-latest 0 · concurrency `cancel-in-progress: false` · 필수 체크 아님(정보용) · artifacts(report · screenshots · 서버 로그) 7일 보관.
- `package.json` — scripts `test:e2e:cd-pos{,:env:up,:env:down}` 3줄만 추가. 기존 flows CI 미변경.

보존 요소: 없음(신규 파일만). 기존 `ci.yml` / `lint.yml` / `spec-guard-*.mjs` 건드리지 않음 (M3 소유).

## 실행 로그 (아이맥 잡 소요 시간)

| run | trigger | 결과 | wall | 실패 step |
|---|---|---|---|---|
| [45906555377](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45906555377) | pull_request (초기) | failure | 40s | step 4 Storeport 체크아웃 |
| [45906819867](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45906819867) | pull_request (fallback 추가 후) | failure | 28s | step 4 (ssh/https clone 둘 다 실패) |
| [45906830483](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45906830483) | workflow_dispatch (run_mutation=true) | failure | 40s | step 4 |

**잡 1회 소요 시간(아이맥, step 1-3 success 통과분)**: 약 20-30s (checkout · node/pnpm 확인까지). step 4 clone 자체는 1-2s 만에 fail. 전체 평균 30-40s. **storeport 이후 단계**는 아직 돌려본 적 없어 측정 불가.

## 블록된 단계의 정확한 실패 로그

```
Cloning into '/Users/KyuLee/projects/storeport'...
Host key verification failed.           # ssh fail — github.com known_hosts 미등록
fatal: Could not read from remote repository.
---
Cloning into '/Users/KyuLee/projects/storeport'...
failed to get: -25308                   # https fail — macOS keychain 접근 실패(launchd 환경)
fatal: could not read Username for 'https://github.com': Device not configured
```

**결론**: 새 시크릿·PAT 추가 없이 CI 안에서 뚫는 길 없음. PR 본문 "Kyu 손 필요" 에 **1회 수동 clone** 절차 명시.

## Kyu 손 필요 (1회)

```bash
# 아이맥 Terminal 에서 1번:
cd ~
mkdir -p projects && cd projects
git clone https://github.com/CuriocityDevAi/storeport.git
# → 유저네임 + PAT 입력
ls ~/projects/storeport/apps/commerce-core/package.json   # 확인
```

끝나면 PR Actions → e2e-cd-pos → **Re-run jobs**. 다음부터는 상주 clone 재사용.

## 자기 검증 상태

- [x] PR 생성 + 아이맥 잡 자동 트리거 작동
- [x] 하네스 bash syntax OK · workflow YAML 유효 (`yaml.parse` 성공)
- [x] workflow 가 아이맥 러너에 도달 (step 1-3 success)
- [ ] **정상 Case 1 pass 로그** — storeport clone 블록
- [ ] **mutation 빨간 로그** — 동일 블록
- [ ] POS·CD 스크린샷 artifact — 동일 블록

**돌려본 로그 = 블록 지점까지만**. "미검증 + 막힌 지점" 명시 완료. 지시 §[REPORT] "돌려본 로그 없으면 착지 아님" 에 부분 착지로 보고.

## R3~R6 로 넘길 것

**이번 라운드(M1-1127-A) 범위 밖** — M0-1127-M 쪽에서 담당 예정 또는 다음 라운드:

- **R3 (M0)**: Case 2-A/2-B — 결제 중 번호 입력 두 가지 분기. `e2e/cd-pos/case2.spec.ts` 신설. 이 PR 의 fixture/global-setup 재사용.
- **R4 (M1)**: 계획서 §3-5 연속 시나리오 (주문 A 번호 건너뜀 → Next customer → 주문 B) + §3-6 새로고침/재연결. `sequential.spec.ts`. **11-26 23:05 Kyu 버그와 성격 유사 — 실기 재현을 자동으로 잡는 두 번째 안전망**.
- **R5 (M0)**: 엣지 — §3-7 Next customer 강행 · §3-8 20초 타임아웃 · §3-9 Split payment · §3-4 QRIS 2-C (QR 버그 수정 후).
- **R6 (R0 or M1)**: storeport 쪽 trigger (계획서 Q2 양쪽 중 다른 한쪽) — `repository_dispatch` 로 아이맥 잡 호출. 이번에 fork 쪽만 트리거(권장안 "이번 라운드는 fork 쪽만") 했으므로 storeport master 머지 후 자동 발동 추가.

**이번 PR 내에서 Kyu 손 1회 후 닫을 수 있는 것**:
- storeport clone 후 Case 1 정상 잡 녹색
- `run_mutation=true` 로 수동 dispatch 1회 → mutation 빨간 로그 확보
- 잡 1회 실제 소요 시간(end-to-end · 첫 pnpm install 포함) 측정 → R6 nightly 결정 입력
- seed-soopsok 가 번호 입력 테스트에 필요한 상품 2종 · 로열티 켬 세팅을 실제로 갖추는지 로그로 확인(미달이면 seed 보강 PR 1개 필요)

## 다음 라운드로 의도적으로 안 깬 것

- POS 시작 상품 2개 가정 (`product-card` testID nth(0/1)). seed 상품 수가 부족하면 depth 조정 필요 — R2 첫 성공 후 조정.
- `seedPosAuth` 가 admin 계정(email/password) 로 토큰 받는 방식. seed-soopsok 에 해당 계정이 생기는지 보장 안 됨 — 첫 실행 로그 보고 조정.
- 영수증 QR / earned 금액 숫자 어서션은 가짓수에 안 넣음 (명세는 있지만 R2 1라운드 초과) — R3 또는 다음 반복에 추가.

## 메타

- 걸린 시간(허브): 약 55분
- 아이맥 잡 1회 소요(측정 가능 분): ~30-40s (step 4 까지)
- 아이맥 잡 1회 소요(전체 추정): 15-30분 (첫 pnpm install 포함) — 상주 clone 생긴 뒤에만 측정 가능
