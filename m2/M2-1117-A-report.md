# M2-1117-A 판정: COMPLETE — 타입체크·테스트 통과 · 스크린샷 첨부 · PR #318 업데이트 완료

## 작업 내용

| 항목 | 변경 |
|------|------|
| 앱 이름 | `"MEROS HP Point"` → `"MEROS Customer"` (app.config.ts) |
| 아이콘 | "HP POINT" → "CUSTOMER" 텍스트 재생성 (각진 M A안·색상 불변) |
| 스플래시 | 큰 M 풀사이즈 PNG (노란 배경 #FFE58A) |
| 앱 안 로고 | `BrandMark` 컴포넌트 신설 → pair 화면 상단·MainScreen 하단 |
| naming-check | BrandMark.tsx 예외 추가 (M2-1117-A) |
| bundle id/slug/scheme | 변경 없음 (재설치·짝짓기 보호) |

## 수정 파일 목록

- `apps/customer-display/app.config.ts` — name 변경
- `apps/customer-display/app/pair.tsx` — BrandMark import + 렌더
- `apps/customer-display/src/screens/MainScreen.tsx` — BrandMark import + brandFooter
- `apps/customer-display/src/components/BrandMark.tsx` — 신규 컴포넌트
- `apps/customer-display/assets/icon.png` — CUSTOMER 텍스트 재생성
- `apps/customer-display/assets/splash.png` — 큰 M 재생성
- `apps/customer-display/assets/brand/icon-hp.svg` — aria-label·주석 갱신
- `apps/customer-display/assets/brand/preview-cd-{60,76}.png` — 신규 프리뷰
- `apps/customer-display/scripts/gen-icons.mjs` — CUSTOMER 텍스트·변수명 갱신
- `scripts/naming-check.sh` — M2-1117-A 예외 등록

## 자기 검증

- `pnpm typecheck` (customer-display): ✅ 에러 0
- `pnpm test` (customer-display): ✅ 132 passed
- `pnpm test` (전체 workspace): ✅ 504 passed
- `bash scripts/naming-check.sh`: ✅ PASS
- Playwright e2e 웹 빌드: ✅ 27 passed (기존 incognito 1개 failure — pre-existing)
- PR #318 본문에 스크린샷 첨부 (pair 화면·대기 화면·아이콘·스플래시)

## 미검증

- EAS 재빌드 후 실기 iPad 화면 확인 — Kyu 소관
- 아이패드 홈 화면 표시명 "MEROS Customer" — 재빌드 후 확인 필요

## PR

https://github.com/CuriocityDevAi/storeport/pull/318
브랜치: `feat/m2-1116-ak` (main 위로 rebase 후 --force-with-lease push)
