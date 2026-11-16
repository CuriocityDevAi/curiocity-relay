# #152 APPROVE · #290 APPROVE · #298 APPROVE · 로컬 검증

## #152 (fork) — APPROVE

#150 APPROVE(R0-1116-I) 이후 변경분만 확인.

| 항목 | 결과 |
|---|---|
| REQ1 페어링 코드 · REQ2 다음 주문 잠금 · REQ3 409/pre_entry | R0-1116-I 기준 동일 — 추가 검토 없음 |
| `shouldDisableNextOrder` 6종 unit test (null/paid_at null/link_open_until null/>now/<now/===now) | ✓ |

**base 주의 (non-blocking)**: base = `feat/m3-1116-d`(master 아님). 머지 전 `feat/m3-1116-d` 착지 또는 rebase 필요.

## #290 (storeport) — APPROVE

| 항목 | 결과 |
|---|---|
| M0-1116-F shallow copy (commit 8145605) · `applyDraft` prevLive spread · `revertToPrevious` previous/current spread | ✓ |
| 나머지 JSON 대입 (patchSettings/patchDraft/이벤트 CRUD) audit — 이미 spread, 수정 불필요 | ✓ |
| 통합 5/5 | ✓ |
| CHANGES 스레드 `PRRT_kwDOTe-UYs63vftG` resolved | ✓ |

## #298 (storeport) — APPROVE

| 항목 | 위치 | 결과 |
|---|---|---|
| message 30자 | `EVENT_MESSAGE_MAX_LENGTH = 30` · route 양쪽 400 처리 | ✓ |
| 기본 문구 7종 | `EVENT_DEFAULT_MESSAGES` · `resolveEventMessage` | ✓ |
| overrides 겹치는 모든 날 필수 | `applyEventSetUpdate` missing → `EventOverlapError` | ✓ |
| 하루 1이벤트 | `events_overrides: { "YYYY-MM-DD": event_id }` | ✓ |
| 고아 override 자동 정리 | `deleteEvent`/`updateEvent` → `cleanOrphanOverrides` | ✓ |
| display-config `active_event_message` | `getDisplayConfig` → `resolveEventMessage(activeEvent)` | ✓ |
| 마이그레이션 이름 중복 없음 | main:`20261115210000` · #290:`20261116120000` · #298:`20261116210000` | ✓ |
| #291 호출 형식 일치 | Admin UI는 client-side `checkEventOverlap` → `overrides:[{date,event_key}]` POST. `conflicting`→`conflicts` 필드명 변경은 UI에 영향 없음(UI는 `type:"event_overlap"`만 체크) | ✓ |

통합 8/8 · draft-apply 5/5 재검증 ✓
