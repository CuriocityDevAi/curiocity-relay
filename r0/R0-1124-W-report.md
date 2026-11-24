# CHANGES

R0-1124-W — PR #420 리뷰 (M0-1124-G · R3 Admin 매장 선택)
PR: https://github.com/CuriocityDevAi/storeport/pull/420

---

## 1. diff 깨끗함 여부 (mergeable)

**CHANGES 요인.**

- GitHub `mergeable_state: "dirty"`. PR 베이스 SHA = `61b4d18` (M0-1124-E #418 squash).
- fetch 후 확인: 브랜치에 `efd6325`(M0-1124-E 원본) + `3d41243`(feature-map) + `e3b05f3`(main merge) 가 남아 `git diff origin/main...HEAD` 가 15 files (+1493/−220) — 예상 7 files(+624/−196) 대비 불필요한 커밋 포함.
- `git merge-tree $(merge-base) origin/main HEAD` → 충돌 마커 0건. 콘텐츠 충돌은 없음. `diff <main_route.ts> <branch_route.ts>` = 출력 없음(동일). `setup-multi-store.ts`, `settings/__tests__/route.unit.spec.ts` 도 main 에 이미 존재·동일.
- 단, GitHub `dirty` 는 squash 이력 불일치 때문에 발생한 stale 평가로 추정. 콘텐츠 자체는 충돌 없음.

**요청:** `130f8fa`(M0-1124-G) 단 1커밋을 `61b4d18`(현 main HEAD) 위로 rebase → force-push → GitHub 재평가. PR diff 가 7 files 로 정리되고 `dirty` 해소됨.

---

## 2. 편집 범위 · whitelist

**PASS.**

- UI: location mode 시 `receipt_header`, `logo_url`, `show_tax_label`, `service_charge_pct`, `dp_percent` 전부 `disabled={inLocationMode}` + `readOnly={inLocationMode}`. PB1은 On/Off Switch만 노출.
- `onSave()` location 분기: `patch = { store_address, pb1_pct }` 2개만 전송. 다른 필드 전혀 포함 않음.
- 서버 `LOCATION_PATCH_KEYS = new Set(["store_address", "pb1_pct"])` 가 추가 방벽. 클라이언트·서버 이중 보호. ✓
- Payments 탭: location mode 에서 BrandHint + 안내 텍스트만 렌더, 편집 UI 없음. ✓

---

## 3. PB1 On = 브랜드 값 복사 저장 · diverge 위험 (의견)

**의견: `On = override 삭제`가 맞다.**

현재 로직(page.tsx L.253–255):
```ts
pb1_pct: locPb1Enabled ? brandPb1 : 0,
```
On → location row 에 `pb1_pct = 현재 브랜드 값(예: 10)` 스냅샷 저장.
이후 브랜드 값을 15로 올리면, On 상태 매장은 10 고정 → 의도한 "브랜드 값 추종"과 다른 결과.

올바른 의미론: On = "브랜드 값을 inherit" = location row 의 `pb1_pct` 를 **삭제 또는 null** → `getForLocation` merged view가 store row fallback → 항상 최신 브랜드 값.

현재 `patchByScope` 는 삭제를 지원하지 않아 서버 계약 변경이 필요하므로 이번 PR 범위 밖. 운영상 "브랜드 값 고정 override" 로 쓰면 단기에는 동작하지만, 추후 브랜드 PB1 조정 시 On 매장을 수동으로 다시 토글해야 한다는 점을 인지 필요. ← 별도 티켓 권장.

---

## 4. custom_display_id OR 매칭 · 성능

**PASS.**

- `matchesCustomDisplayId`: `typeof c !== "string" || c === ""` 이면 `false` 반환 → custom_display_id 없는 주문은 phone/display_id 경로로만 매칭. 기존 전화번호 검색 보존. ✓
- qE164 분기·비E164 분기 모두 동일 패턴. ✓
- `custom_display_id` 는 `list-pos-orders.ts` `BASE_FIELDS` 에 이미 포함 → 기존 쿼리에서 함께 조회. 추가 DB 쿼리 없음. 인메모리 `includes()` 스캔은 기존 체계와 동일 수준. 성능 문제 없음. ✓

---

## 5. refund/return 영수증 store.address

**PASS.**

pos-refund `mint-receipt.ts` L.57: `settingsSvc.getForLocation(stock_location_id)`
pos-return `mint-receipt.ts` L.65: 동일.

`getForLocation` → merged view `{ ...DEFAULT_POS_SETTINGS, ...storeSettings, ...locSettings }` → location 설정이 store 설정을 덮어 씀. `store.address = settings.store_address` 에서 location override 주소가 우선 반영. 브랜드 값만 쓰는 경우는 없음. ✓

pos-fulfill `mint-sale-receipt.ts` 도 동일 패턴 사용(기존 M0-1124-E). 세 영수증 경로 일관. ✓

---

## 6. 색 하드코딩 · CI

**PASS.**

- `OrderNumbersSection.tsx`: `bg-ui-bg-highlight`, `ring-1 ring-ui-border-interactive` — Medusa UI 토큰. ✓
- `page.tsx`: `text-ui-fg-muted`, `text-ui-fg-subtle`, `text-ui-fg-error`, `bg-ui-bg-field`, `ring-ui-border-interactive`, `border-ui-border-base` 전부 토큰. Badge `color=` API 사용. 하드코딩 hex / raw Tailwind 색상 클래스 없음. ✓
- CI: PR 본문 기록 — typecheck PASS · 593 tests PASS · lint 0 errors · feature-map-check 1267 matched. GitHub `get_check_runs` API 403 (권한 미할당)으로 실시간 확인 불가이나 M0-1124-G 보고서와 일치.
- 드롭다운 렌더 실기: 포트 미할당, 미수행.

---

## 결론

**CHANGES 1건:** 브랜치를 `61b4d18` 위로 rebase (redundant M0-1124-E/F 커밋 제거) → PR diff 7 files 로 정리 필요.

기능 로직(항목 2·4·5·6)은 모두 정상. PB1 On 의미론(항목 3)은 별도 티켓 권장.
