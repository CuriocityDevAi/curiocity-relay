storeport #400 CHANGES · storeport #402 CHANGES · storeport #394 APPROVE · relay #10 CHANGES

# R0C-1119-AH — 클라우드 리뷰 4건 (2026-11-19)

push·머지 없음. PR 코멘트:
- storeport #400 issuecomment-7012273795
- storeport #402 issuecomment-7012278398
- storeport #394 issuecomment-7012282472
- relay #10 issuecomment-7012286321

## A. storeport #400 (5차 · HEAD db584d7) — CHANGES

| 확인 | 결과 |
|---|---|
| customer-display tsc / vitest | 0 / 219/219 |
| AF 경로: keypad-after → OK → consent → Agree/Decline → receipt → RECEIPT_DONE → done → DONE_TIMER → main · 같은 paid 5틱 | O |
| 회귀: 번호 없이 Skip · pre_entry · 다음 손님 idle · loyalty Skip 되튐 | O |
| expired 중 kav | O (false 로 지움) |
| **consent 중 "다음 손님"(idle)** | **X — kav=true 가 남아서 다음 손님이 번호 없이 결제해도 keypad-after 를 건너뜀** |

probe: `paid → RECEIPT_DONE(keypad-after) → KEYPAD_OK(consent*) → idle(main*) → cart(new) → paid(new) → RECEIPT_DONE = done` (기대 keypad-after).
고칠 것: idle→main 분기(또는 snapshot.id 가 바뀔 때)에서 kav=false · 단위 테스트 1개.

## B. storeport #402 (HEAD e3689f0) — CHANGES

| 확인 | 결과 |
|---|---|
| CI | **check run 0개** — base=#400 브랜치 · ci.yml 은 base=main 일 때만 돎. "CI 연결 O ~25분" 은 실측 아님 |
| IT cd-full-flow (로컬 Postgres) | 6/6 · 14s · 고정 fixture · flaky 낮음 |
| mutation: items total→line_total | ⑥ 빨강 O |
| mutation: display_id → null | **6/6 그대로 통과 X** (단언이 `!= null` 일 때만 돎) |
| Playwright cd-flow-overlap (build:web 후) | **4 passed / 8 failed** (15.8s) — 블록 DIV 폭 전체 rect 로 겹침을 재서 생긴 잘못된 실패 (스크린샷: 실제 글자는 칩과 안 겹침) |
| globe 없음 | 조용히 통과 (`if (rects && rects.globeVisible)`) |

Kyu 증상 7개 커버: ① 자동 번호(서버 pos_screen 전달 + 머신) O · ② Skip 버튼 라벨 X · ③ QR 문자열 전달 O · ④ QR 에서 paid→receipt △ (cart 에서만 검증) · ⑤a NaN O · ⑤b 내부 ID X · ⑤c 겹침 △ (테스트는 있지만 지금 잘못 빨강).
R0 probe 경로(keypad-after→consent · Skip 1틱 되튐)는 여러 틱 replay 가 없음.

고칠 것: 겹침 판정을 글자 rect 로 → 12/12 · display_id 무조건 단언 · base=main 으로 바꿔 CI run URL·시간 실측 · qris→paid · keypad-after→consent replay 추가.

## C. storeport #394 (HEAD f22b83b) — APPROVE

| 확인 | 결과 |
|---|---|
| Z CHANGES 4건 | 반영 O |
| force_cloud 초록 | run 44542408164 · success · 4분 · HEAD 같음 |
| route-heavy.sh --test | 14/14 |
| extra=0 → used=5 | self-hosted + 라벨 `ci-cloud-quota-exceeded` (라벨 리포에 있음) |
| relay quota 파일 | extra=0 (raw 200) |
| RELAY_REPO | URL 을 만드는 데만 씀 · 공개 raw 를 인증 없이 읽기만 함 · 이 secret 자체에는 권한 없음 |

후속 (Kyu 확인):
- extra 를 "사람만" 올리게 막는 장치가 코드에 없음 — relay 에 쓸 수 있는 세션은 모두 올릴 수 있음 (오늘 M1-1119-T 가 실제로 올림). runner-watch.yml 은 `RELAY_PUSH_TOKEN` 이 있으면 relay 에 push 함 (그 secret 이 있는지는 확인 못 함). 모든 세션이 같은 계정이라 GitHub 만으로는 완전히 막을 수 없음 → RELAY_REPO 설정 추인 · `approved_by` 필드 필수 · extra 상한 · extra>0 이면 크게 표시.
- nit: `_cloud_today` 는 status 마다 100개 한 페이지만 봄 · jobs API 를 많이 불러서 rate limit 에 닿으면 로컬 대기로 떨어짐 (안전한 쪽).

## D. relay #10 (HEAD d7b0880) — CHANGES

| 확인 | 결과 |
|---|---|
| 테스트 | 14/14 |
| 재시작 반복 | 30분/1회 · 한 번 stuck 이면 최대 2회 → alert 후 멈춤 · 회복되면 reset O |
| 허브 본업 블로킹 | fire-and-forget + try/catch + 30s timeout O |
| **실행 중 job 보호** | **X** — ci-health 는 queued 를 먼저, in_progress 를 나중에 모음 → deadline/budget 에서 `partial` 이면 in_progress 가 비고 queued 만 남음 · `repos_failed` repo 의 실행 중 job 은 빠짐 · 캐시가 최대 5분 이상 오래돼도 `latest.at` 을 안 봄 → 실행 중 job 이 있어도 svc.sh stop 실행 가능 |
| 셸 주입 | 경로 = relay runner-config.json → `sh -c "\"$abs\" ..."` (큰따옴표 안에서도 `$()` 펼쳐짐). existsSync 가 막아서 위험 낮음 · 셸 없이 execFile + 경로 형태 검사 권장 |

고칠 것: partial / repos_failed / 오래된 캐시면 건너뛰기 · stop 직전에 로컬 `Runner.Worker` 프로세스 확인 · 테스트.

## 환경 메모
- storeport IT: `ALTER USER postgres PASSWORD 'postgres'` 후 `NODE_OPTIONS=--experimental-vm-modules TEST_TYPE=integration:pos npx jest <spec>`.
- Playwright: 리포 버전은 chromium 1255 를 기대함 · 컨테이너 /opt/pw-browsers/chromium-1243 을 executablePath 로 지정해서 돌림 (임시 config, 커밋 안 함).
