#430 APPROVE

**PR**: https://github.com/CuriocityDevAi/storeport/pull/430
**브랜치**: `feat/M0-1125-F-pos-settings-folder-tab`
**HEAD**: `19c3fe3`
**리뷰어**: R0-1125-M (자기 PR — GitHub Approve 불가 · COMMENT로 대체)

---

## 검증 표

### R1 · 폴더 탭

| 항목 | 결과 | 근거 |
|------|------|------|
| 활성 탭 `bg-ui-bg-component` = 패널과 동일 | ✅ | `TAB_TRIGGER_CLASS` 코드 확인 |
| `:after` 1px overlay 로 하단 경계선 cut | ✅ | `data-[state=active]:after:bg-ui-bg-component` |
| 비활성 탭 `bg-ui-bg-subtle` (패널보다 옅음) | ✅ | 코드 확인 |
| semantic 토큰만 — raw hex 없음 | ✅ | `grep -n "hex\|#[0-9a-fA-F]"` → 주석 1줄(설명)만, 스타일 없음 |
| `role=tablist/tab/tabpanel` | ✅ | Radix/Medusa UI Tabs 자동 · Playwright spec test 4 |
| `aria-selected` | ✅ | Playwright spec test 4 직접 확인 |
| `aria-controls` | ✅ | Radix UI Tabs.Trigger 자동 주입 |
| ←/→ 키보드 이동 | ✅ | Playwright spec test 5 pass |
| 라이트/다크 실 색상 | ⚠️ **미검증** | 하니스 Medusa UI CSS 미로드 — Kyu 실기 체크 필요 |

### R2 · 닉네임 영숫자 + 주문번호 하이픈

| 항목 | 결과 | 근거 |
|------|------|------|
| `NICKNAME_REGEX = /^[A-Z][A-Z0-9]{1,3}$/` 단일 소스 | ✅ | `format.ts:15` |
| 서버 검증 `service.ts` → `NICKNAME_REGEX` | ✅ | `service.ts:4,44` |
| 주문번호 발급 `reserve.ts` → `NICKNAME_REGEX` | ✅ | `reserve.ts:28,139` |
| Admin UI 양쪽 → `NICKNAME_REGEX`/`NICKNAME_RULE_TEXT` | ✅ | `NicknameEditor.tsx:4-6`, `OrderNumbersSection.tsx:12-14` |
| `PIM → PIM26B1000` | ✅ | unit test `format.unit.spec.ts:75` |
| `PIM3 → PIM3-26B1000` | ✅ | unit test `:93` |
| `P1A → P1A26B1000` | ✅ | unit test `:101` |
| 기존 `custom_display_id` 불변 | ✅ | 마이그레이션 없음 · 포맷팅 단계에서만 적용 |
| PIM 매장 카운터 연속성 | ✅ | `reserve.ts:160-170` `last_serial` 증분 로직 그대로 |
| 닉네임 중복 금지 검증 | ✅ | `service.ts:54-58` — `listOrderNumberStores({nickname:up})` 후 타 매장 충돌 시 에러 |

---

## 직접 실행 테스트 로그

### pnpm --filter commerce-core test

```
Test Suites: 60 passed, 60 total
Tests:       674 passed, 674 total
Snapshots:   18 passed, 18 total
Time:        28.691 s
```

### pnpm --filter commerce-core typecheck

```
> tsc --noEmit
(에러 0)
```

### Playwright smoke "POS Settings" — 7/7 pass

```
✓  1 [chromium] 탭 5개 · Receipt 활성 · Advanced 섹션 (870ms)
✓  2 [chromium] General 탭 · 매장 선택 시 nickname 편집기 (426ms)
✓  3 [chromium] Receipt 탭 트리거 활성 강조 (shadow + 배경) (457ms)
✓  4 [chromium] R1 폴더 탭 · 패널·토큰·ARIA 구조 (485ms)
✓  5 [chromium] R1 폴더 탭 · ←/→ 방향키로 탭 이동 (387ms)
✓  6 [chromium] R2 닉네임 영숫자 · PIM3 허용 · pim3 자동 대문자 (457ms)
✓  7 [chromium] R2 닉네임 영숫자 · 3PIM 은 클라이언트 regex 로 거절 (857ms)
7 passed (5.6s)
```

---

## CI 체크 상태

| check | 상태 |
|-------|------|
| changes-filter | ✅ pass |
| check | ✅ pass |
| markers-and-forbidden | ✅ pass |
| route | ⏳ pending (리뷰 시점) |

---

## 스크린샷

하니스 Medusa UI CSS 미로드 → 토큰/구조/ARIA 어설션 중심. 실 색상(라이트/다크) 확인은 Kyu 실기 필요.

스크린샷 위치 (워크트리 e2e 아티팩트):
- `apps/commerce-core/e2e/screenshots/admin-smoke/04d-pos-settings-folder-tab-structure.png`
- `apps/commerce-core/e2e/screenshots/admin-smoke/04c-pos-settings-tab-highlight.png`
- `apps/commerce-core/e2e/screenshots/admin-smoke/04b-pos-settings-general-nickname.png`

---

## 결론

R1·R2 모두 원장 결정 사항 반영 확인. 단일 소스 원칙(`format.ts`)·ARIA·키보드·중복 검증 모두 OK.
실 색상(라이트/다크)만 Kyu 실기 체크 미완.
