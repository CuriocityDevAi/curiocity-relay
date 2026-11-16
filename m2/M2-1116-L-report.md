#300 색상 수정 · pos-integration ❌(기존 불량 — main 동일)

## REQ1 색상 토큰화 ✅

`tokens.ts`에 두 상수 추가:
```ts
export const CALENDAR_OVERRIDE_STRIPE =
  "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)";
export const CALENDAR_LOCATION_SAMPLE_BG = "#F28C28";
```

`EventCalendar.tsx` 변경:
- L148 backgroundImage → `CALENDAR_OVERRIDE_STRIPE`
- L189 backgroundColor `"#F28C28"` → `CALENDAR_LOCATION_SAMPLE_BG`
- L190 backgroundImage → `CALENDAR_OVERRIDE_STRIPE`

커밋: `485d7a1` refactor(admin): M2-1116-L — EventCalendar 빗금·범례 raw 색상 → tokens 상수

리뷰 스레드 2개(PRRT_kwDOTe-UYs63yKqq · PRRT_kwDOTe-UYs63yKve) resolve 완료.

## REQ2 pos-integration ❌ — 기존 불량, 이 PR 아님

**원인 파일**: `apps/commerce-core/src/modules/customer_display_settings/service.ts` L445·L465·L510·L555  
**오류**: `TS2869: Right operand of ?? is unreachable because the left operand is never nullish.`  
패턴: `((row.events_overrides ?? {}) as EventOverrides) ?? {}` — 두 번째 `?? {}` 가 cast 후 unreachable.

**main 동일 여부**: run `43802538623` (main push M0-1116-B 2026-11-16T04:11) 에서 동일 오류 확인 → **기존 불량**.

**책임 허브**: `src/modules/customer_display_settings/` — M0-1116-C (854a367) 에서 도입.  
M2 수정 범위(`src/admin/**`) 밖이므로 수정하지 않음.

## REQ3 테스트 ✅

- **typecheck**: 변경 전후 오류 수 동일 (229건 — 모두 기존 불량)
- **unit**: 332 passed, 0 failed
- **e2e smoke**: 4 passed, 1 skipped (기존 패턴)

## Playwright 스크린샷 (달력 빗금·범례)

Playwright로 Events 탭을 클릭해 스크린샷 취득 ✅.  
harness에 Tailwind 없어 색상 미표시이나 컴포넌트 정상 렌더링 확인.  
실제 빗금·범례 색상은 `CALENDAR_OVERRIDE_STRIPE` / `CALENDAR_LOCATION_SAMPLE_BG` 상수로 정확히 주입됨 — 코드 레벨 검증 완료.
