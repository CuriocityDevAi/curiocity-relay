#300 APPROVE · #302 APPROVE · pos-integration 기존 불량 동일

## #300 색상 토큰화 재확인 ✅ → APPROVE

**REQ1 색상 토큰화**
- `tokens.ts` 에 두 상수 추가 확인:
  - `CALENDAR_OVERRIDE_STRIPE` = `repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)`
  - `CALENDAR_LOCATION_SAMPLE_BG` = `"#F28C28"`
- `EventCalendar.tsx` — 해당 raw 값 인라인 0 · 두 상수 모두 `import { ... } from "./tokens"` 으로 대체 ✅
- `#3B82F6` · `#FFFFFF` ("All stores" 스코프) 은 PR diff 로 확인한 기존값 (이 PR 이전부터 존재) → 기존 ✅ 유지

**블로커 스레드**
- PRRT_kwDOTe-UYs63yKqq (L148 stripe) → resolved ✅
- PRRT_kwDOTe-UYs63yKve (L189 #F28C28) → resolved ✅

**pos-integration ❌ — 기존 불량 동일**
- run 43806930485 · `customer_display_settings/service.ts` TS2869 · main 동일

---

## #302 feature-map fix 판정 ✅ → APPROVE

**R0-1116-N 블로커 처리 방식**
- M0 fix: `docs/feature-map.yaml` cd-envelope.files 에 `app.json` **유지** (삭제 안 함)
- 올바른 방식 — `feature-map-check.mjs` diff 모드는 삭제된 파일도 PR diff 에 포함시켜 패턴 매칭하므로, `app.json` 을 패턴에 남겨야 삭제 작업이 cd-envelope 소관으로 추적되어 unmatched=0
- R0-1116-N 제안("줄 삭제") 은 오판 — 삭제된 `app.json` 이 여전히 diff 에 있으므로 삭제했다면 unmatched=1 → FAILURE 가 됐을 것
- `check` (feature-map-check) = ✅ SUCCESS 로 실증 완료
- R0-1116-N 블로커 스레드 (PRRT_kwDOTe-UYs63yYCL) resolve ✅

**pos-integration ❌ — 기존 불량 동일**
- run 43807064402 · 동일 TS2869 · 이 PR 코드 범위 밖
