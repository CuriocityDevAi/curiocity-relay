# M3-1105-CI — apps/customer-display G1a

**Result**: DONE · Expo SDK 58 앱 생성 · 모든 테스트 통과 · Draft PR 열림

## PR

- https://github.com/CuriocityDevAi/storeport/pull/263 (base: main · draft)

## Commits

- `294c82a` feat(customer-display): M3-1105-CI G1a — apps/customer-display Expo SDK 58 · Main+Cart · theme/i18n · mock adapter

## CI check results (local)

| 검증 | 명령 | 결과 |
|------|------|------|
| TypeScript | `pnpm run typecheck` | OK (strict · 0 오류) |
| Contrast unit tests | `pnpm run test` | 60 / 60 passed · 20 테마 × (ink/bg · primaryInk/primary · heroInk/hero) |
| Web export | `pnpm run build:web` | OK · `dist/` · 4 static routes (/ · /cart · /_sitemap · /+not-found) |
| Playwright E2E | `pnpm run e2e` | 6 / 6 passed · 1180×820 iPad 뷰포트 |
| Naming check (pre-commit) | `scripts/naming-check.sh` | OK (bundle id = `id.storeport.customerdisplay` · "meros" 無) |

## Screenshots (apps/customer-display/screenshots/)

- `screen1-default.png` — Main (idle · pastel · en · Variant A 매장 이미지 없음)
- `screen1-midnight.png` — Main (idle · midnight · 다크 모드 확인)
- `screen1-ko.png` — Main (idle · pastel · 한국어 전환 후)
- `screen2-checkout.png` — Cart (checkout · pastel · 2 품목 · Rp 126,500 합계 · 6,325 적립 미리보기)
- `screen2-forest.png` — Cart (checkout · forest)
- `screen2-pastel.png` — Cart baseline (pastel)

## Files created / changed

- 신규 `apps/customer-display/` 26 파일 (Expo 앱 전체)
- 수정 `docs/feature-map.yaml` (customer-display L3 + 3 processes 추가)
- 수정 `pnpm-lock.yaml` (Expo · Playwright · vitest 등 새 deps)

## Design diff notes

디자인은 1180×820 레퍼런스에 맞춰 Variant A / B 모두 구현. 두 가지 의도적 편차:

1. **Mint primary 색 조정 (스펙 → 실제)**:
   - 스펙: `#0F8A5F` on `#FFFFFF` = 4.36:1 (WCAG AA 4.5 미달)
   - 조정: `#0F7A55` (스펙의 accent 와 동일) = 5.34:1 (통과)
   - `src/theme/tokens.ts` 코멘트로 명시

2. **Web static SSR mount-gate**:
   - 문제: `expo-router` static export 가 pastel 스냅샷을 `index.html` 에 구워서, `?theme=midnight` 쿼리가 반영 안 됨 (React 가 hydration 시 inline style 재조정 실패)
   - 해결: `app/_layout.tsx` 에서 `Platform.OS === 'web'` 일 때 1 tick 동안 placeholder 를 띄우고, `useEffect` 에서 `readInitialMockState()` 호출 → 완전히 클라이언트 렌더
   - 영향: 네이티브(iOS/Android) 에는 영향 없음 (즉시 렌더)

## Mock adapter

- URL params: `?state=idle|checkout`, `?theme=<key>`, `?event=<key>`, `?lang=en|id|ko|ja|zh`, `?hasImage=true|false`
- Default store: Soopsok Sweets · PB1 10% · 5% earn rate · hasStoreImage=false · pastel
- Mock checkout: Croissant×2 (Rp 70,000) + Latte (Rp 45,000) · subtotal Rp 115,000 · tax Rp 11,500 · total Rp 126,500 · earn Rp 6,325

## Constraints respected

- `apps/customer-display/**` + `docs/feature-map.yaml` + `pnpm-lock.yaml` 만 변경
- `apps/commerce-core/**` · 다른 `apps/*` · `packages/*` 미수정
- Native-only import 無 (expo-secure-store/BLE 등 없음)
- Screen 코드 raw hex 문자열 無 (모두 `t.xxx` 토큰 참조)
- 네이밍 §0 준수
