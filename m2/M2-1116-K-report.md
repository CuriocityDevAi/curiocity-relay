PR #300 · apply/discard/revert · preview · message · overrides · 로컬 검증 통과

## 반영 내용

### REQ 1 — Apply/Discard/Revert + Live vN
- **Apply to stores**: `updateCdSettings` → `PUT /settings/draft` → `POST /settings/apply` (`applyDraft` 함수 사용)
- **Discard**: 404 silencing 제거, 서버 `POST /settings/discard` 직접 호출
- **Restore previous**: 404 fallback 제거, 서버 `POST /settings/revert` 직접 호출
- **헤더**: `Live v{live_version} · applied {applied_at}` — 서버 응답값 사용
- **404 대체 분기**: `applyDraft`, `revertToPrevious` 에서 완전 제거

### REQ 2 — 미리보기 + active_event_message
- `GET /settings/preview?view=draft&as_of={today}` 호출 → `config.active_event_message` 배너 텍스트
- `PreviewPanel`에 `eventBannerMessage?: string | null` prop 추가
- Apply/Discard/Revert/Event변경 후 preview 갱신
- 실패 시 client-side fallback (`EVENT_GREET`)

### REQ 3 — Events message + overrides + 달력 hatching
- `message: null` = Reset to default (서버 기본 문구), `""` = 동일 처리
- 400 `event_overlap` → `conflicts[]` 추출 → EventForm에 `serverConflicts` 전달 → 모든 날 라디오 → overrides 재전송
- `GET /events` 응답 `overrides: Record<string, string>` 파싱 → EventCalendar에 전달
- 달력: override 날짜에 diagonal stripe hatching 추가

### REQ 4 — 테스트 + typecheck + smoke
- **단위 테스트 6개 추가**: 겹침 재전송 흐름(3) + null message(3) → 22/22 통과
- **typecheck**: 신규 TS 에러 없음
- **admin-smoke**: 4/4 통과 (mock 업데이트: live_version, overrides, /preview 엔드포인트)

## 변경 파일 (src/admin/** 만)
- `src/admin/lib/customer-display-api.ts` — 타입 정비 + 404 fallback 제거 + fetchDraftPreview 계약 맞춤
- `src/admin/components/customer-display/PreviewPanel.tsx` — eventBannerMessage prop
- `src/admin/components/customer-display/EventCalendar.tsx` — overrides hatching
- `src/admin/components/customer-display/EventForm.tsx` — serverConflicts + null message + Reset to default
- `src/admin/routes/pos-settings/customer-display/page.tsx` — 전체 조율
- `src/admin/routes/pos-settings/customer-display/__tests__/overlap.unit.spec.ts` — 신규 테스트
- `e2e/admin/admin-smoke.spec.ts` — mock 업데이트
