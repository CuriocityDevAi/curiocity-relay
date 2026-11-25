PLAN READY — plans/integrated-rehearsal-plan-20261125.md

# M0-1125-M — 통합 리허설 하네스 설계서

- **브랜치**: `docs/M0-1125-M-integrated-rehearsal-plan` (relay)
- **커밋**: 6ffb01e2c · docs(plan): M0-1125-M — 통합 리허설 하네스 설계서 (plan-only · 구현 보류)
- **파일**: `plans/integrated-rehearsal-plan-20261125.md` (374 lines, 1 file)
- **원장 대사**: `ledger/decision-internal-testing-20261125.md` 1번(통합 리허설) + 4번(완료 기준)
- **범위**: plan-only. 코드·PR 금지. Kyu 15:11 "설계서만 작성 · 구현 보류".

## 요약 — 기존 자산 대사표

| 재사용 코어 (강) | 재사용 참고 (중) | 신규 필요 |
|------------------|------------------|-----------|
| A1 commerce-core integration-tests (45 spec · heavy CI) | A5 Manager PIN 감사 (M2-1125-F) | N1 `scripts/rehearsal/run.sh` 오케 |
| A2 store-day-rehearsal.spec.ts (26KB · POS+CD 체인) | A8 fork `__tests__` 62 vitest | N2 리허설 playwright.config.ts (2 baseURL) |
| A3 setup-multi-store.ts (M0-1125-H 멱등 · PIM/PS/PB1) | A10 commerce-core admin PW (mocked) | N3 `rehearsal/*.spec.ts` (S1~S9) |
| A6 fork playwright (34 flow · `expo export` + `serve dist :4321`) | A11 Vitest/Jest 설정 | N4 Midtrans fake helper (서명 포함) |
| A7 CD e2e (11 spec · `playwright.config.ts` · :4173) | A13 pre-commit 체인 | N5 `packages/pos-api-contracts` (zod · already_paid) |
| A9 docker-compose.smoke.yml (postgres:16-alpine) | | N6 `.github/workflows/integrated-rehearsal.yml` |
| A12 compose healthcheck 패턴 | | N7 storeport↔fork PR 페어링 트레일러 규약 |

## 요약 — 시나리오 ↔ 오늘 버그 매핑 (10/13 web 커버)

| # | 시나리오 | 잡았을 버그 | 근거 |
|---|---------|-------------|------|
| S1 | 주문번호 PIM-26B… | nickname onSaved(C3) · 하이픈 규칙(M0-1125-F) | fork tender-cash + CD 영수증 |
| S2 | Cart PB1 합계 | 매장별 PB1 분기(M0-1125-H) · 주소 override(C4) | PIM(PB1 on) vs PS(off) cart |
| S3 | 현금 나눠 결제 CD 남은액 | 실기 버그 (cash split CD 미반영) | POS tender + CD remaining |
| S4a | QR 탭만 (CD 안 바뀜) | **Q1** payment_qris 조기 emit (fork:121) | R0-1125-U |
| S4b | QR 생성 → CD 표시 | **Q2** SecureStore 조기 drop + **Q4** Rp NaN (`line_total` vs `total`) | R0-1125-U · #438 |
| S4c | 재진입 → 재생성 | **Q3a** 409 복구 UI 없음 + **Q3b** payment_collection_id 미전달 | R0-1125-U |
| S4d | Rp NaN 금지 (fake webhook) | **Q4** 응답 필드 미스매치 | #438 M0-1125-K |
| S5 | 영수증 POS vs CD 비교 | M0-1125-C (이미 fix · 회귀 가드) | receipt-same-as-pos |
| S6 | Admin CD 이미지 Apply | 실기 CD 이미지 미반영 | customer-display-settings-draft-apply |
| S7 | 이슬람 공휴일 Events | 2026 KEMENAG 테이블 (추정) | — |
| S8 | Discontinue (already_paid) | **#438↔#263** 서버 200 vs POS 409 기대 | R0-1125-Z |
| S9 | 대기 주문 복원 | 실기 복원 실패 (추정) | — |

Native-only(Maestro 2번 몫 · 3건): Reanimated worklets · SecureStore 실 I/O · iOS/Android 뒤로가기 네비.

## 요약 — 자원 추정 (Mac 16GB, 여유 46~54%)

| 항목 | 추정 |
|------|------|
| 피크 메모리 (dev-server.mjs 정적) | **1.4~2.0 GB** |
| 피크 메모리 (expo start 모드) | 1.8~2.6 GB |
| 1-pass (캐시 적중) | **5~9 분** |
| 1-pass (콜드 · 첫 export) | 10~14 분 |
| 포트 블록 (예약 필요) | postgres 5433 · medusa 9000 · POS 4321 · CD 4173 |

메모리 사전 체크: `vm_stat` 로 여유 < 4GB 면 exit 42 (대기).
직렬 실행 (fullyParallel: false · retries: 0). storeport-heavy 워크트리 1곳 전용.

## 요약 — 라운드 순서표 (22 라운드 · 평균 35분 · 총 ~13h)

| # | ID 안 | 파일 (주인) | 선행 |
|---|-------|-------------|------|
| R1 | rehearsal-dirs | 디렉토리 + 포트-트리 예약 | — |
| R2 | orchestrator | `scripts/rehearsal/run.sh` | R1 |
| R3 | compose (옵션) | `scripts/rehearsal/docker-compose.yml` | R2 |
| R4 | seed wrapper | `scripts/rehearsal/seed.ts` (멱등) | R2 |
| R5 | POS export env | fork `scripts/export-rehearsal.sh` | R2 |
| R6 | CD export env | CD `scripts/serve-rehearsal.sh` | R2 |
| R7 | PW config | `rehearsal/playwright.config.ts` | R5+R6 |
| R8 | midtrans-fake | `rehearsal/helpers/midtrans-fake.ts` | R4 |
| R9 | contract types | `packages/pos-api-contracts/**` + 양쪽 전환 | — (병행) |
| R10~R18 | S1~S9 spec 각 1 파일 | `rehearsal/S{1..9}-*.spec.ts` | R7+R8(+R9) |
| R19 | CI workflow | `.github/workflows/integrated-rehearsal.yml` (soft gate) | R10~R18 |
| R20 | PR 페어링 | workflow 트레일러 파서 + fork mirror | R19 |
| R21 | R030 v3 swap | `CLAUDE-CODE-WORKFLOW.md` | R19 |
| R22 | required 승격 | 2주 안정 후 Kyu 판정 | 2주 soft |

주인-파일 원칙: 각 라운드 = 딱 1 파일 · 병행 금지(명시된 경우 제외).

## 완료 기준 §6 (허브 REPORT 상시 삽입 초안)

1. 통합 리허설 실행 로그(trace.zip + 스크린샷 + stdout) 첨부 — 없이 통과 선언 금지
2. 소스 문자열 검사로 동작 대체 금지 (grep/fixture pass ≠ 작동)
3. 실데이터 크기 (긴 매장명·긴 주소·상품 20+)
4. 새 기능 = 시나리오 선작성 → 구현 → 리허설 통과 → 머지
5. R0 직접 실행 (최소 S1 + 영향 시나리오 1개 재현)
6. 서버↔POS 응답 추가 시 `packages/pos-api-contracts` zod PR 동반 (#438↔#263 재발 방지)
7. R030 v2 processes 필드 유지
8. 플레이크 재돌림 금지 (의심 시 조사 + 격리 PR)

## 위험 · Kyu 판정 필요 (13건 요약)

- Q1 POS 소스: fork 선택 (추천) · Q2 CD 모드: 정적 dev-server.mjs (추천) · Q3 DB: 공유+리셋 (추천) · Q4 CI: ubuntu-latest 먼저 (추천) · Q5 required 승격 2주 후 (추천)
- Q6 Maestro 2번 선후 (ledger 보류) · Q7 contracts 범위 단계적 · Q8 retries 0
- Q9 포트 블록 예약 · Q10 fork workflow 권한 · Q11 Playwright 버전 통일
- Q12 native-only 3건 정식 목록(R0 요청 필요) · Q13 KEMENAG 2026 fixture 위치

## 다음 단계

Kyu 승인 시 → R1 큐 생성(M0-NEXT-A) → 순차 착수. R18 완료 시점에 R030 v3 교체 안을 Kyu 에 회부(R21). 2주 soft gate 후 required 승격(R22) Kyu 판정.

---

**상태**: plan-only · 커밋 완료 · push 는 러너 소관 · 구현 보류 (Kyu 15:11).
