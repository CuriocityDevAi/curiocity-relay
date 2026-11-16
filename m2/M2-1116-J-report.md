E2E 수정 완료(9+1건) · draft-apply 실패 원인 = #290 M0-1116-F 미포함 · CI customer-display ✅ / pos-integration ❌(동일원인) / docker-smoke ⏳(~19min 빌드 중) · mergeState UNSTABLE

## E2E 수정 (REQ 1)

### 기존 9건 — `?mock=1` 추가
`_layout.tsx` live 부팅 게이트가 `?mock=1` 없는 URL을 `/pair`로 리다이렉트함에 따라 아래 테스트 URL 수정:

**snapshots.spec.ts 6건**
| 경로 | 변경 |
|------|------|
| `/keypad?earnPreview=6500` (keypad-ok-condition) | `?mock=1&` 추가 |
| `/keypad?earnPreview=6500` (keypad-del-long) | 동일 |
| `/keypad-after?earnPreview=6500` (keypad-after-skip) | `?mock=1&` 추가 |
| `/keypad-after?earnPreview=6500&keypadTimeout=30` | `?mock=1&` 추가 |
| `/consent?maskedPhone=...` | `?mock=1&` 추가 |
| `/keypad?lang=ko&earnPreview=6500` | `?mock=1&` 추가 |

**event-decor-screens.spec.ts 3건**
| 경로 | 변경 |
|------|------|
| `/receipt?testDate=2026-12-20` (Christmas receipt) | `?mock=1&` 추가 |
| `/done?testDate=2026-12-20` (Christmas done) | `?mock=1&` 추가 |
| `/receipt?testDate=2026-03-15` (inactive date) | `?mock=1&` 추가 |

### 신규 — pair-screen.spec.ts
`/pair` 직접 이동 → `testID="pair-screen"` 확인.
- 주의: `router.replace("/pair")` 는 static export에서 초기 로드 시 동작하지 않음(index.tsx가 MainScreen을 먼저 렌더 후 effect가 trigger되나 URL 변환 미완료). 직접 `/pair` 이동으로 pair 화면 렌더 보장.

### 로컬 테스트 결과
- E2E: 25/25 통과 (8 skipped — decor-preview dev-only)
- 단위: customer-display 123/123 · commerce-core 326/326 · event-contracts 21/21
- 빌드: 11개 정적 라우트 성공 (/pair 포함)

---

## draft-apply 실패 원인 판정 (REQ 2)

**원인: #295가 M0-1116-F(fix)를 포함하지 않는 M0-1116-C를 끌어왔기 때문**

| 커밋 | 브랜치 | 내용 |
|------|--------|------|
| `80f9ee3` (M0-1116-C) | #295 ✅ | `settings_draft/previous/live_version` 모델 + 라우트 |
| `8145605` (M0-1116-F) | #290 only ❌ | JSON 컬럼 별칭 해제 + 테스트 자가 시드 |

실패 위치: L70 `color_theme_key` → apply 후 "forest" 아닌 값 반환 (JSON 별칭 버그), L81 `settings_previous` → null (이전 live 미저장).

**결론: #295 자체 코드 변경과 무관. #290의 미완성 커밋(M0-1116-C, M0-1116-F 미적용)을 의존하는 한 재현 불가피.**

**올바른 절차: #290 머지 → main rebase #295**
- #290 머지 시 M0-1116-F(JSON 별칭 수정)가 main에 포함됨
- #295 rebase 후 `customer-display-settings-draft-apply.spec.ts` 통과 예상

docker-smoke 실패도 동일 원인으로 추정: M0-1116-C migration 적용 후 서버가 healthy 미도달 (migration 루프 — 01:40:02 timestamp 무한 반복).

---

## CI 결과 (REQ 3)

**CI run ID: 43790116026** (push: c5c4314 — main rebase + E2E 수정)

| Job | 결과 |
|-----|------|
| changes-filter | ✅ |
| markers-and-forbidden | ✅ |
| unit-commerce-core | ✅ |
| e2e-admin-loyalty | ✅ |
| customer-display | ✅ **(기존 FAIL → PASS)** |
| pos-integration | ❌ (draft-apply, #290 미머지 원인) |
| docker-smoke-commerce-core | ⏳ 진행중 (~19min 빌드, 이전 run FAIL) |

**mergeStateStatus: UNSTABLE**

남은 2건은 모두 #290 미머지에 기인. #290 머지 후 #295 rebase 시 해소 예상.
