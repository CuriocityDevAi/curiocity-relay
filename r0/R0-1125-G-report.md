CHANGES

## PR #428 (M2-1125-F) 체크리스트

| 항목 | 결과 | 근거 |
|------|:----:|------|
| PIN 값 미저장 | ✅ | `service.ts` `createLog` 저장 필드 목록에 `pin`/`manager_pin`/`secret` 없음; 단위 테스트 `keys.not.toContain("pin")` 어설션 명시 확인 |
| 기록 실패 non-fatal | ✅ | `createLog` reject + `container.resolve` throw 2케이스 모두 `.resolves.toBeUndefined()` 단위 테스트 통과 |
| migration 안전 | ✅ | `Migration20261125000000`: `add column if not exists "custom_display_id" text null` — nullable + idempotent; `down()` 도 `drop column if exists` |
| 날짜 필터 WIB 경계 | ✅ | `audit/route.ts`·`service.ts` 모두 `wibDateKey(+7h)` 경유; UTC 17:30→다음날 단위 테스트 명시 확인 |
| Admin 권한 | ✅ | `/admin/*` 경로 → Medusa admin 인증 미들웨어 자동 적용; `fetch` 호출에 `credentials:"include"` |
| CI | ❌ | bot comment (02:42 UTC) 기준 `ci (running) ⏳` 이후 업데이트 없음 — 완료 확인 불가 |

## CHANGES 사유

**CI 완료 미확인** — `github-actions[bot]` comment가 PR 생성 1분 후(02:42 UTC)에 `ci (running) ⏳`로 기록된 뒤 `updated_at` 변동 없음. CI 완료 후 pass 확인 필요.
