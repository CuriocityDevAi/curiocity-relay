# R0-1116-M — #300 CHANGES · pos-integration ❌

## REQ별 판정

**REQ1 ✅ Apply 순서**
`applyDraft` = `PUT /settings/draft` → `POST /settings/apply` 직렬 호출. 404 fallback 제거. 두 요청 모두 성공 시에만 `setSavedSettings` / `setAppliedAt` / `setLiveVersion` 호출 → PUT 성공 + POST 실패 시에도 "적용됨" 오표시 없음.

**REQ2 ✅ Discard/Revert 오류 노출 + 이중클릭 방어**
Discard `catch`: `toast.error("Discard failed", ...)` 로 서버 4xx/5xx 노출. 404 fallback 완전 제거. `setDiscarding(true/false)` 이중 클릭 방어 유지. Revert 동일 패턴.

**REQ3 ✅ 400 event_overlap → conflicts[] → overrides 재전송 스키마 일치**
서버 `EventOverlapError.conflicts[]` 필드 `{date, existing_event_id, existing_event_key}` ↔ 클라이언트 `OverlapConflict` 타입 정확히 일치.
재전송 `overrides[].{date, event_key}` ↔ 서버 `OverrideInput` / `validateOverrides` 계약 일치.
`serverConflicts` → 라디오 → `priorityPicks` → `overrides` 흐름 올바름. cancel 시 `setServerConflicts(null)` 클리어 확인.

**REQ4 ✅ message null/""**
UI: 빈 문자열 입력 `onChange` → `setMessage(null)`, Reset 버튼 → `setMessage(null)`.
서버: `validateMessage(null)` → `value: null` 저장, `resolveEventMessage` null/공백 모두 `EVENT_DEFAULT_MESSAGES[event_key]` fallback. 계약 일치.

**REQ5 ❌ BLOCKER — raw hex/rgba**
`EventCalendar.tsx`에서 이 PR이 신규 추가한 두 곳에 raw 색상:
- L148: override stripe `backgroundImage` 안 `rgba(255,255,255,0.4)`
- L189: legend indicator `backgroundColor: "#F28C28"`
- L190: legend stripe `backgroundImage` 안 `rgba(255,255,255,0.4)`
(L348 `#3B82F6`, L349 `#FFFFFF` 는 기존 코드 — 이 PR 도입 범위 아님)
semantic 변수(`EVENT_COLORS` 토큰 또는 `var(--color-bg-*)`) 로 교체 필요.

**REQ6 — 테스트 ✅ / pos-integration ❌**
테스트: `admin-smoke.spec.ts`는 신규 필드 목업(`live_version`, `overrides{}`, `/preview` 핸들러) 추가 — 기대값 변경 아님. `overlap.unit.spec.ts` 신규 케이스 73줄 추가. `customer-display-event-message-overrides.spec.ts` 신규 통합 테스트 266줄. 코드 수정 확인.
CI: pos-integration ❌ · docker-smoke ❌(기존 불량, 판정 제외).

## 판정: CHANGES
블로커: REQ5(raw hex/rgba) + pos-integration ❌
