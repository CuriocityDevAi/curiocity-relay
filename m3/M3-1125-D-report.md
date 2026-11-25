PASS

# M3-1125-D · QRIS = CD 막혀도 POS 결제 화면 QR 로 결제 (§8-①)

- 모델: Claude Opus 4.7 · 리포: `agilo-medusa-pos-fork` · 브랜치 `feat/M3-1125-D-qris-qr-on-pos` (@ `216a7f7`)
- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/257
- 원장 대사: `decision-cd-parallel-20261123 §8-①` — "QRIS = CD 막혀도 POS 결제 화면 QR 로 결제"
- 감사 미반영 1건 (`m2/M2-1125-B-report.md #2`) 해소

## 결정 축

1. **원장 원문 확인** — ledger §8-① 원문 요지:
   > "① QRIS = CD 막혀도 POS 결제 화면 QR 로 결제"
   원문은 **"QR 은 POS 에 (항상) 있어야 한다"** 는 보장만 명시. "토글/자동" 언급 없음 → 큐카드 권장안
   ("원문 없으면 손님 화면 점유/미연결 시 자동 표시 + 수동 토글") 채택.

2. **QR 자체는 항상 POS 에 렌더** — 기존 `qris-qr-svg` 를 그대로 유지. `scanHereVisible`/`cdOccupied`/
   `cdDisconnected` 조건으로 감싸지 않음 → CD 상태가 어떻든 POS 에 QR 이 있어 §8-① 보장.

3. **스캔 안내 배너** (`qris-scan-here-banner`) — CD 상태 자동:
   - `busy`     — `classifyPhoneStatus(...).kind === 'busy'` (다른 주문이 CD 점유 · 손님 #M 이 번호 입력)
   - `offline`  — `classifyCustomerDisplay(...).kind === 'offline'` (`polled_at`과 `server_now` 차이 > 30s)
   - `hidden`   — 스냅샷 null (페어링 없음)
   - `manual`   — 캐셔가 `qris-show-here-toggle` 을 눌러 ON

4. **본문 요약 포맷** — `Order #<displayId> · <amount>` → `#N · <amount>` (대사 "칩 #N 하나 · 금액").
   `Stack.Screen.title` 은 `'QRIS payment'` 로 고정 (#255/M3-1125-C 와 동일 결정).

5. **회귀 0** — 시뮬레이트 버튼 · 10s 폴링 · `New QR` 재발행 · split 1차/2차 신호 전부 그대로 유지.
   서버 QRIS `qr_string` 재사용 (서버 수정 X).

## 변경 파일 (3)

| 파일 | 역할 |
|---|---|
| `app/checkout/tender-qris/[draftOrderId].tsx` | 배너·토글·CD 분류 로직 추가 · 요약 라인 교체 · title 고정 |
| `__tests__/m3-1125-d-qris-qr-on-pos.test.ts` | 소스 어설션 6 case + 분류기 3 CD 경우 4 case |
| `scripts/m3-1125-d-qris-qr-on-pos-playwright.mjs` | CI 하네스 (.mjs) · 4 라운드 (A/B/C/D) + 소스 가드 |

## 산출물 (스샷 4장)

- `e2e/screenshots/M3-1125-D-A-normal.png` — 정상 CD · 배너 숨김 · "#7 · IDR 87,000" · Show QR here 토글
- `e2e/screenshots/M3-1125-D-B-busy.png` — 다른 주문이 CD 점유 · 배너 자동 ON · reason "Customer display busy"
- `e2e/screenshots/M3-1125-D-C-offline.png` — polled_at 60s 이전 · 배너 자동 ON · reason "Customer display not connected"
- `e2e/screenshots/M3-1125-D-D-manual.png` — 정상 CD 에서 수동 토글 ON · 배너 ON

## 검증 (local)

- `npx vitest run __tests__/m3-1125-d-qris-qr-on-pos.test.ts` → **10 / 10 passed**
- `node scripts/m3-1125-d-qris-qr-on-pos-playwright.mjs` → **27 / 27 passed**
  (소스 가드 15 + 라운드 A 3 + B 3 + C 3 + D 3)
- `npx expo lint app/checkout/tender-qris/[draftOrderId].tsx` → **0 errors**
  (warnings 2 는 pre-existing · M3-1125-D 가 추가한 것 아님)

## 커밋

- `c275d89` — `feat(qris): M3-1125-D — POS 결제 화면 QR 유지 + 스캔 안내 배너 (§8-①)`
- `216a7f7` — `test(qris): M3-1125-D — 3 CD 경우 + 수동 토글 assertions·playwright + 스샷`

## 금지 규약 준수

- ✅ 서버·손님 화면 앱 수정 없음 (`qr_string` 서버 응답 그대로 재사용)
- ✅ PR #255 가 바꾼 헤더 타이틀 라인 유지 (`title: 'QRIS payment'`) — 충돌 없이 master 베이스
- ✅ `~/projects/curiocity-relay` 수정 없음
- ✅ /loop·예약 깨우기 없음
- ✅ PR 자기 머지 안 함 (Kyu 머지 대기)
- ✅ 시맨틱 토큰만 (`warning-soft` · `ink-muted` · `line` · `surface`) · raw hex 금지
- ✅ 리포트는 `~/.hub-runner/reports/m3/M3-1125-D/report.md` 1건 · git 리포 안에 쓰지 않음
