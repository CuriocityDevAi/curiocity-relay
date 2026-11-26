# CD↔POS 통합 E2E 시나리오 계획 — 아이맥 실행 (2026-11-26)

작성: M1-1126-M · Kyu 동의 "A 하고 C" (11-26 14:58)  
배경: Case 1 이 운영에서 두 번 막힘(#452 CI 초록 → 운영 #196 고착 · v3)  
원인: 주문 1건짜리 CI 테스트만 있고 "이전 주문이 남은 상태에서 다음 주문" 연속 흐름이 없었음

---

## 1. 목적과 기존 CI와의 차이

| 항목 | 기존 CI (PR·저장소 단위) | 이 계획 (통합 E2E) |
|---|---|---|
| 범위 | storeport 또는 fork **각각** 독립 | POS web + CD web + commerce-core 를 **동시에** |
| 서버 | mock 서버 또는 단일 저장소 MSW | **실제 commerce-core + Postgres** |
| 주문 수 | 1건·단위 테스트 | **여러 건 순서대로** (이전 주문 잔류 상태 포함) |
| 시간 흐름 | 없음 | **3초 타이머·20초 타임아웃** 실제 경과 포함 |
| 브라우저 | 1개 | **Playwright 2개** (POS 탭 + CD 탭 동시 조작) |
| 판정 | 단일 컴포넌트 렌더 | **POS 칩 문구 · CD 화면 · Hand over 활성 · 적립 칩** 모두 |
| 발동 목적 | 각 PR 회귀 방지 | **운영 직전 연속 흐름 검증** |

기존 CI가 초록이어도 운영에서 막히는 경우(#196 고착 사례)를 잡는 것이 핵심 목적이다.

---

## 2. 실행 환경 후보 비교와 권장

### 비교표

| 항목 | (a) 아이맥 로컬 | (b) Railway 스테이징/프리뷰 | (c) 운영 admin.meros.id 스모크 |
|---|---|---|---|
| **비용** | 없음 | Railway 월정액·빌드 시간 | 없음 |
| **준비 시간** | 중간 · 서버 기동 스크립트 작성 필요 · 테스트 DB 생성은 Kyu 1회 | 길다 · 스테이징 환경 구성·시드 별도 | 짧음 (접속만) |
| **운영 데이터 오염** | 없음 · 로컬 `test_meros` DB 사용 | 없음 · 별도 스테이징 DB | **위험** · 실 주문 생성 시 오염 가능 |
| **허브 금지 조항 저촉** | 없음 · 허브는 코드만 작성, 실행은 아이맥 러너 | **railway CLI 금지** · 허브 에이전트 배포 명령 불가 | **운영 DB 금지** · 주문 생성 불가 |
| **CI 러너 충돌** | 아이맥 4 러너와 같은 기계 → concurrency label 로 분리 가능 | 별도 환경이므로 충돌 없음 | 해당 없음 |
| **다중 주문 연속** | 가능 (로컬 DB 직접 시드) | 가능 | 불가 (읽기 전용 스모크 한계) |

### 권장: **(a) 아이맥 로컬**

- commerce-core + Postgres 이미 설치됨 → 추가 인프라 비용 없음
- 운영 데이터 오염 없음, 허브 금지 조항 저촉 없음
- Playwright 2브라우저 픽스처로 POS·CD 동시 제어 가능
- 아이맥 CI 러너(self-hosted) 그 자리에서 직접 실행 → SSH 불필요
- (b) 는 railway CLI 금지로 허브 자동화 불가, (c) 는 연속 주문 시나리오 불가

---

## 3. 시나리오 목록

정본: decision-cd-pos-sync-flow-20261125 · v2 · v3 · case2

### 3-1. Case 1 — 결제 후 번호 입력

흐름: 상품 담기 → Checkout → Cash 결제 → 결제 완료 → CD 영수증(전체) 3초 → 영수증 좌 1/3 고정 + 우 2/3 키패드 슬라이드인 → 번호 입력 → OK → 확인 카드 → [맞아요] → 포인트 적립

| 판정 항목 | 기대값 |
|---|---|
| CD 결제 완료 직후 | 영수증 **왼쪽** 1/3 · "Payment complete" 오른쪽 2/3 |
| CD 3초 후 | 키패드가 오른쪽에서 왼쪽으로 슬라이드, 영수증 고정 유지 |
| CD 확인 카드 | 번호 전체 · 현재 포인트 · [맞아요] 버튼 · [번호 수정] |
| CD 포인트 적립 | 왼쪽 영수증 + 오른쪽 "Points earned" |
| POS 칩 (아무것도 안 누름) | `Waiting for customer` |
| POS 칩 (입력 중) | 실시간 숫자 + `…` |
| POS 칩 (OK 전 완성) | 번호 전체 + `…` |
| POS 칩 (확인 완료) | `✓ 0813-****-2480 · +Rp 180` |
| Hand over | 결제 완료 후 **항상 활성** (로열티 무관) |
| Link customer | 확인·적립 완료 후 **숨김/비활성** |

### 3-2. Case 2-A — 결제 중 번호 입력 (결제 전 완료)

흐름: Cash 결제수단 화면에서 손님 [전화번호 입력] 버튼 누름 → 우 2/3 키패드 → 번호 입력·OK → 확인 카드 → [맞아요] → (결제 완료 후) 포인트 적립

| 판정 항목 | 기대값 |
|---|---|
| CD 결제 전 번호 완료 시 | 우: "확인됐어요 · 결제 대기" |
| CD 결제 완료 후 | 좌 영수증 + 우 포인트 적립 |
| POS 칩 | 흐름 동일 (3-1 준수) |
| Hand over | 결제 완료 후 활성 |

### 3-3. Case 2-B — 결제 중 번호 입력 (번호 입력 중 결제 완료)

흐름: 번호 입력 도중 결제 완료 → 키패드 유지 + 좌 1/3 에 영수증 출력 → 입력 완료 → 확인 → 포인트 적립

| 판정 항목 | 기대값 |
|---|---|
| CD 번호 입력 중 결제 완료 | **키패드 유지** + 좌 1/3 영수증 슬라이드인 |
| CD 확인 후 | 포인트 적립 (좌 영수증 유지) |
| POS 칩 | 실시간 숫자 → 확인 완료 칩 |

### 3-4. Case 2-C — QRIS (번호 입력 중 QR)

흐름: QRIS 결제수단 화면에서 손님 번호 입력 시작 → 좌 1/3 QR 코드 · 우 2/3 키패드 → QR Simulate 결제 완료 → 좌 1/3 영수증으로 교체 → 확인 → 포인트 적립

| 판정 항목 | 기대값 |
|---|---|
| CD 번호 입력 중 (QRIS) | 좌 1/3 QR · 우 2/3 키패드 |
| CD 결제 완료 후 | 좌 1/3 **QR → 영수증** 교체 · 우 키패드 유지 |
| 완료 조건 | 확인 후 포인트 적립 |

> ⚠ QR 버그 수정 후 활성화 (현재 ⏸ · v3 미테스트 — 열린 질문 Q4 참고)

### 3-5. 연속 — 주문 A 번호 건너뜀 → Next customer → 주문 B ⭐ 신규

흐름: 주문 A 완료 · 번호 입력 없이 20초 경과(또는 POS Next customer) → CD 대기화면 → 주문 B 담기·결제 → CD 가 **주문 B 의 새 화면** 올바르게 표시 (과거 주문 A 잔류 없음)

| 판정 항목 | 기대값 |
|---|---|
| CD (주문 A Next customer 직후) | **대기(웰컴) 화면** |
| CD (주문 B 결제 완료) | 주문 B 영수증 (주문 A 흔적 없음) |
| POS 칩 (주문 B) | 번호 없는 상태로 초기화 |
| "Phone entry skipped" 잔류 | **없음** |

### 3-6. 새로고침/재연결

흐름: CD 웹 새로고침 → 활성 주문 없으면 대기화면 · 활성 주문 있으면 현재 단계 복원

| 판정 항목 | 기대값 |
|---|---|
| CD 새로고침 (Sell 빈 카트) | 대기(웰컴) 화면 |
| CD 새로고침 (결제수단 화면 중) | 주문내역 + 입력 버튼 활성 |
| CD 새로고침 (번호 입력 중) | 키패드 화면으로 복원 |

### 3-7. Next customer 강행 (손님 흐름 중)

흐름: 손님 번호 입력 중 · POS Next customer 클릭 → 경고 모달 → [강행] → CD 즉시 대기화면

| 판정 항목 | 기대값 |
|---|---|
| POS 경고 모달 | 표시됨 |
| 강행 후 CD | **즉시 대기화면** |
| POS 칩 | 초기화 |

### 3-8. 확인 20초 타임아웃

흐름: 확인 카드 표시 후 손님 아무 조작 없음 → 20초 경과 → 포인트 없이 종료 · POS "확인 안 됨"

| 판정 항목 | 기대값 |
|---|---|
| 20초 후 CD | 대기화면 (or 번호 건너뜀 화면) |
| POS 칩 | "확인 안 됨" 표시 |
| 포인트 | 적립 없음 |

### 3-9. 나눠 결제 (Split payment)

흐름: Partial payment 1회 → 좌 1/3 에 남은 금액 표시 → 완납 → 영수증 표시

| 판정 항목 | 기대값 |
|---|---|
| CD (1차 결제) | 좌 1/3 남은 금액 |
| CD (완납 후) | 영수증 |
| POS 칩 | 각 단계별 상태 |

---

## 4. 언제 돌리나

| 발동 방식 | 내용 | 권장 여부 |
|---|---|---|
| **storeport main 머지 후 자동** | storeport GitHub Actions → `repository_dispatch` → 아이맥 self-hosted runner | ⭐ 권장 |
| **fork master 머지 후 자동** | fork GitHub Actions → `repository_dispatch` → 아이맥 self-hosted runner | ⭐ 권장 |
| **매일 1회 nightly** | cron `0 1 * * *` (WIB 08:00) · 아이맥 runner | 권장 (회귀 조기 발견) |
| **수동** | `ssh imac "cd ~/projects/pos-m1 && npx playwright test e2e/cd-pos"` 한 줄 | 필요시 |

**아이맥 4 러너 충돌 방지**

- E2E 전용 runner label: `imac-e2e` (별도 runner 프로세스 또는 기존 runner에 label 추가 · Kyu 설정 필요)
- GitHub Actions `concurrency` 그룹: `cd-pos-e2e-${{ runner.name }}` · `cancel-in-progress: false`
- 기존 PR CI 는 `imac` label, E2E 는 `imac-e2e` label로 큐 분리

---

## 5. 결과 보고

| 항목 | 위치 | 내용 |
|---|---|---|
| 실행 로그 | `relay/logs/e2e-cd-pos/YYYYMMDD-<run-id>.json` | 시나리오별 pass/fail · 실패 메시지 · 타임스탬프 |
| 실패 스크린샷 | `relay/assets/e2e/cd-pos/<run-id>/` | Playwright 자동 캡처 (POS·CD 각각) |
| 실패 영상 | 같은 경로 · `*.webm` | 실패 시나리오만 |
| HTML 리포트 | `relay/assets/e2e/cd-pos/report-<date>/` | Playwright HTML report (전체) |
| ci-watch 한 줄 | `relay/status/ci-watch.md` 에 추가 | `✅/❌ cd-pos-e2e · N/M passed · HH:MM WIB` |

ci-watch 표시 여부: **표시** · 기존 PR CI 항목 아래 별도 섹션 `## Nightly / Integration E2E`

---

## 6. 단계별 구현 라운드

| 라운드 | 내용 | 시간 | 담당 허브 | 주요 파일 | Kyu 손 필요 |
|---|---|---|---|---|---|
| **R1** | 환경 하네스: 서버 기동 스크립트 · Playwright global setup · 테스트 DB 시드 픽스처 · 브라우저 2개 픽스처 | 40분 | M1 | `e2e/cd-pos/setup/global-setup.ts` · `fixtures/two-browser.ts` · `scripts/start-test-env.sh` | 아이맥에서 테스트 DB 생성(`createdb test_meros`) · `npm install` 확인 |
| **R2** | Case 1 구현 | 35분 | M1 또는 M0 | `e2e/cd-pos/case1.spec.ts` | — |
| **R3** | Case 2-A/2-B 구현 | 35분 | M0 | `e2e/cd-pos/case2.spec.ts` | — |
| **R4** | 연속 시나리오 (3-5) + 새로고침(3-6) | 40분 | M1 | `e2e/cd-pos/sequential.spec.ts` | — |
| **R5** | 엣지: Next customer 강행(3-7) · 20초 타임아웃(3-8) · 나눠 결제(3-9) · 2-C QRIS(3-4) | 45분 | M0 | `e2e/cd-pos/edge.spec.ts` | QRIS QR 버그 수정 후 2-C 활성화 |
| **R6** | CI 연결: GitHub Actions workflow (storeport + fork) · relay 결과 보고 스크립트 | 35분 | R0 또는 M1 | `.github/workflows/e2e-cd-pos.yml` · `scripts/report-e2e.ts` | runner label `imac-e2e` 등록 · `repository_dispatch` 토큰 발급 |

**파일 주인 겹침 없음**: R1·R2·R4 = M1 담당(POS web 기반) · R3·R5 = M0 담당(CD web 기반) · R6 = R0 또는 M1 (CI/DevOps)

---

## 7. 열린 질문 (Kyu 결정 필요)

| # | 질문 | 권장안 |
|---|---|---|
| Q1 | 테스트 DB: 로컬 Postgres에 `test_meros` 별도 생성 OK? 아니면 Docker 컨테이너 격리? | **로컬 `test_meros`** — 이미 Postgres 설치됨, Docker 추가 불필요 |
| Q2 | 머지 후 자동 트리거: storeport·fork 양쪽에 workflow 추가, 아니면 한쪽만? | **양쪽 모두** — 한쪽 머지만 잡으면 다른 쪽 회귀 놓침 |
| Q3 | 나눠 결제(split payment): commerce-core 현재 지원하는지? R5 범위 포함할지? | Kyu 확인 후 R5 포함 여부 결정 |
| Q4 | QRIS 2-C: QR 버그 수정 전에 stub 으로 선행 작성? 아니면 버그 수정 후 R5에 포함? | **버그 수정 후 R5에 포함** — stub은 false 안정감 줄 위험 |
| Q5 | 아이맥 runner label 현재 이름: `imac`, `self-hosted`, 다른 이름? (R6 workflow label 에 필요) | Kyu 확인 (`gh run list --repo ... ` 또는 runner 설정 페이지) |
