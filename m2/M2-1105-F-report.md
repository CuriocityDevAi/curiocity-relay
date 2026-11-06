---
round: M2-1105-F
pr:
  fork: agilo-medusa-pos-fork#32
commit: d2011d326017b4dc0c0dd1658c75db7ca688442b
outcome: web.output single 전환 + 공용 하네스 신설 + 7 Playwright #418 allowlist 전부 제거 · 머지 가능
kyu_checks: 0 (웹 전용 변경 · iPad 네이티브 영향 0)
---

# M2-1105-F · web.output single + 공용 하네스 · #418 allowlist 제거

**일자**: 2026-11-06 · **허브**: M2 · **상대 리포**: `agilo-medusa-pos-fork` · **base**: `master = 6cd6234`

## 1. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | `app.json web.output` `static` → `single` | ✓ |
| 2 | `scripts/_harness.mjs` 신설 (mock Medusa · login · wizard · pageerror/console.error · #418 allowlist 없음) | ✓ |
| 3 | 7 Playwright 치환 + #418 필터 전부 제거 | ✓ |
| 4 | 7개 전부 재실행 · pageerror 0 확인 | ✓ 40/40 PASS · pageerror 0 |

## 2. 변경 파일 (owner 100%)

| 파일 | 변경 | 라인 |
|------|------|------|
| `app.json` | `web.output: "static" → "single"` | 1 |
| `scripts/_harness.mjs` | 신설 | 196 |
| `scripts/m0-1104-a-playwright.mjs` | 치환 | -76/+58 |
| `scripts/m1-1104-b-playwright.mjs` | 치환 | -73/+77 |
| `scripts/m1-1105-b-playwright.mjs` | 치환 | -148/+100 |
| `scripts/m2-1104-a-playwright.mjs` | 치환 | -78/+69 |
| `scripts/m2-1105-b-inventory-playwright.mjs` | 치환 | -89/+78 |
| `scripts/m2-1105-c-settings-playwright.mjs` | 치환 | -148/+98 |
| `scripts/m3-1105-a-playwright.mjs` | 치환 | -65/+48 |
| `docs/testing/web-e2e.md` | 갱신 (공용 하네스 API + 전환 전/후 비교) | -42/+68 |

`app/**` · `components/**` · `api/**` 미수정.

## 3. 자동 검증 (전 7 하네스 · 전부 pageerror 0 · allowlist 없음)

| 하네스 | 결과 |
|--------|------|
| `m0-1104-a-playwright.mjs` | **5/5** · pageerror 0 |
| `m1-1104-b-playwright.mjs` | **8/8** · pageerror 0 |
| `m1-1105-b-playwright.mjs` | **6/6** · pageerror 0 · console.error 0 |
| `m2-1104-a-playwright.mjs` | **4/4** · pageerror 0 |
| `m2-1105-b-inventory-playwright.mjs` | **5/5** · bundle 리터럴 가드 포함 |
| `m2-1105-c-settings-playwright.mjs` | **8/8** · /settings Printer row 렌더 |
| `m3-1105-a-playwright.mjs` | **4/4** · pageerror 0 |

**총 40/40 PASS · pageerror 0 · 필터 코드 0**.

## 4. 효과

| 항목 | 전 | 후 |
|------|---|---|
| React #418 pageerror | 1건/세션 | **0건** |
| `#418` allowlist 유지 | 7 파일 (3~6 라인 각) | **0** |
| 중복 fixture/mock/server 코드 | ~500 라인 복붙 | **_harness.mjs 1곳** |
| dist HTML 수 | 29장 | **1장 (index.html)** |
| Metro web 번들 (chunks) | 영향 없음 | 영향 없음 |

## 5. 네이티브 영향

**0** · `web.output` 은 Expo web 전용 설정 (app.json web). iOS/Android 빌드 경로는 React Native 네이티브 렌더러 그대로 사용. M2-1105-C 의 BLE 플러그인 · SecureStore 래퍼 · Settings Printer row 등 전 기능 미영향.

## 6. docs

`docs/testing/web-e2e.md` 전체 갱신:
- M2-1105-F 이후 변경 요약 섹션 신설
- 공용 하네스 API 레퍼런스 (`createDistServer` / `mockMedusa` / `loginAndReachProducts` / `attachErrors` / `makeChecker`)
- 라운드 하네스 최소 템플릿
- 전환 전/후 비교표
- 전 7 하네스 상태 표
- 변경 소유 섹션 (`scripts/_harness.mjs` = M2 owner · 계약 변경 relay 공지)

## 7. 참고

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/32
- 브랜치: `chore/m2-1105-f-web-single-harness`
- 커밋: `d2011d3`
- 선행: `m2/M2-1105-E-report.md` (뿌리 진단 + 3-C 권장)
