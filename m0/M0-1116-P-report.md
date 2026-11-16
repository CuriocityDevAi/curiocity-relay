# M0-1116-P 리포트 — 운영 버전 한 점 긴급 진단

운영 = **최신 커밋 `ffc2c14`** · 마지막 성공 배포 2026-11-16T11:34:38Z · **실패 원인 없음 (가설 기각)** · PR 없음

## 결론 (한 줄)

운영이 옛 버전에 멈춰 있지 않음. 모든 최근 Railway 배포 SUCCESS. 번들 안에 오늘 머지된 코드 흔적 (`/pair` · `cd-boot` · `pickApiBase` · `EXPO_PUBLIC_API_URL` · `STATUS_COLORS` · `earn_preview` · `admin.meros.id`) 모두 포함. Kyu 가 20:14 에 본 증상은 **다른 원인** (M3-1116-R 소관).

## [REQ-1] 운영 번들 흔적 검증

`curl -s https://admin.meros.id/customer-display-web/` → HTTP 200 · 25,116 bytes.

HTML 안 번들 URL:
- `_layout-995c662c0d853e77390e982762f41dee.js` (4,780 bytes)
- `entry-8d4cfd820ffec0eea83401382e4fedcd.js` (1,119,214 bytes)
- `index-621765b3260db18e04e8b144be7e4efe.js` (16,542 bytes)

번들 안 **오늘 코드 흔적** (grep 결과 · 파일:매치수):

| 키워드 | layout.js | index.js | entry.js | 관련 PR |
|---|---|---|---|---|
| `/pair` 라우트 | 1 | 0 | 1 | #301 (M3-1116-H 페어링 키패드) |
| `cd-boot` | 1 | 0 | 0 | 손님 화면 부팅 로직 |
| `pickApiBase` | 2 | 0 | 0 | #310 (M0-1116-L · 설치형 API base) |
| `EXPO_PUBLIC_API_URL` | 1 | 0 | 0 | Expo env (오늘) |
| `STATUS_COLORS` | 0 | 1 | 0 | M3-1116-O 색 토큰 |
| `admin.meros.id` (API base) | 0 | 0 | 1 | #310 |
| `earn_preview` | 0 | 1 | 0 | #313 (M0-1116-M · 서버 계산) |

→ **운영 번들 = `ffc2c14` 최신 main HEAD 확정**. 옛 #295 이전 mock 번들 아님.

## [REQ-2] GitHub 배포 상태

`gh api repos/CuriocityDevAi/storeport/deployments` — 최근 20건 production 배포 전부 **success**. 실패 흔적 없음.

최근 8건 (전부 success):

| deployment | sha | created | success |
|---|---|---|---|
| 7822709536 | ffc2c14 (#314 M3-1116-N) | 11:28:39Z | **11:34:38Z ← ACTIVE** |
| 7822555015 | fd3f3d0 (#313 M0-1116-M) | 11:21:39Z | 11:24:29Z (inactive) |
| 7821995268 | 8af5728 (#315 M1-1116-T) | 10:56:08Z | 10:58:46Z (inactive) |
| 7821749335 | 86fe1b9 (#308 M2-1116-Q) | 10:43:42Z | 10:47:02Z (inactive) |
| 7821342362 | c40bc85 (#312 M1-1116-R) | 10:24:15Z | 10:25:44Z (inactive) |
| 7820818474 | 686c457 (#311 M1-1116-P) | 09:59:11Z | 10:02:04Z (inactive) |
| 7820395620 | 58c48a7 (#307 M3-1116-K) | 09:38:45Z | 09:41:30Z (inactive) |
| 7819339944 | 90da5e3 (#310 M0-1116-L) | 08:44:32Z | 08:47:58Z (inactive) |

**ACTIVE = 최신 `ffc2c14`** (2026-11-16T11:34:38Z success). 운영 즉시 서빙 중.

## [REQ-3] Dockerfile 재현 — 불필요

실패 배포 없음 → 로컬 `docker build` 재현 생략.

## [REQ-4] 수정 PR — 없음

원인 "운영 옛 버전" 가설 기각이므로 이 티켓으로 수정 PR 없음.

## 결과 — Kyu 증상의 진짜 원인은 **다른 곳**

- 손님 화면이 토큰 없이 대기 화면 → M3-1116-R 소관 (손님 화면 snapshot 넓은 진단).
- 적립이 세금 포함 → #315 머지 후에도 증상 지속 → **운영 버전 문제 아님** (최신 코드가 떠 있음). 별도 진단 필요.
- Store Credits 메뉴 노출 → #306 (M2-1116-O) 머지되었고 번들에 반영되어야 함. 사이드바 캐시/CDN 가능성 — 별도 진단.
- Checkout 후 손님 화면 무반응 → M3-1116-O/P 가 이미 최신 `ffc2c14` 에 포함. 운영 코드엔 수정이 들어가 있으나 실 증상 지속. 런타임/데이터/ngrok 원인 추정 (M3-1116-R).

### 경계

이 프롬프트의 범위 = "운영 버전 한 점". 그 한 점은 **정상 (최신)**. 이상 증상의 원인 분석은 M3-1116-R 소관.
