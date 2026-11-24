APPROVE

R0-1124-Z — PR #420 재리뷰 (M0-1124-H 수정분 · R0-1124-W CHANGES 해소)
PR: https://github.com/CuriocityDevAi/storeport/pull/420

---

## 1. PR 커밋 · mergeable (지침 1)

**PASS.**

- 커밋 2개만 존재:
  - `768ceca` M0-1124-G (POS Settings 매장 선택 + custom_display_id + refund/return 영수증 주소)
  - `23c18df` M0-1124-H (상속 모델 · null=키 삭제 · 브랜드 추종)
- 베이스: `61b4d18` (#418 squash HEAD). R0-1124-W CHANGES `dirty` → rebase 완료.
- `mergeable_state: "unstable"` = CI checks pending, 충돌 아님. ✓
- diff: 11 files · #418 중복 커밋 없음. ✓

---

## 2. `patchByScope` nullDeletes · whitelist (지침 2)

**PASS.**

`service.ts` 직접 확인:

```ts
private async patchByScope(scope, patch, opts: { nullDeletes?: boolean } = {}) {
  ...
  for (const [k, v] of Object.entries(patch)) {
    if (v === null && opts.nullDeletes) { delete next[k]; }
    else { next[k] = v; }
  }
}
```

- `patchLocationSettings` → `patchByScope(scope, patch, { nullDeletes: true })` — location 에서만 null=키 삭제. ✓
- `patchStoreSettings` → `patchByScope("store", patch)` opts 생략 — null=저장, 기존 동작 그대로. ✓
- `LOCATION_PATCH_KEYS = new Set(["store_address", "pb1_pct"])` — whitelist 2개 유지. ✓
- `route.ts`: location scope `pb1_pct=null` / `store_address=null` 검증 통과·그대로 전달. store scope `store_address=null` → `""` 정규화(기존 동작). ✓

---

## 3. `getOrCreateByScope` 빈 `{}` · 기존 row 영향 (지침 3)

**PASS. 마이그레이션 불필요 (현 단계).**

```ts
const isLocationScope = scope.startsWith("location:");
row = await this.createPosSettings({
  scope,
  settings: isLocationScope ? {} : DEFAULT_POS_SETTINGS,
});
```

신규 location row = 빈 `{}` → 완전 상속 기본값. ✓

**기존 row 영향 판단:**
이 변경은 신규 row 생성 경로에만 적용. M0-1124-H 보고서 명시: `setup-multi-store --apply` 미실행 전 상태이므로 운영·dev 에 DEFAULT_POS_SETTINGS 복사본으로 생성된 location row 없음. 따라서 현 시점 마이그레이션 불필요.
- `setup-multi-store --apply` 실행 시 → 신규 row 는 빈 settings 로 생성(주소만 override). ✓
- 만약 dev 에서 수동으로 생성한 location row 가 있다면: 개발자가 직접 정리 필요. 운영 영향 없음.

---

## 4. `getForLocation` overrides 반환 shape · receipt·quote·POS (지침 4)

**PASS.**

```ts
return {
  ...existing[0],
  settings: { ...DEFAULT_POS_SETTINGS, ...storeSettings, ...locSettings },
  overrides: locSettings,   // 신규 추가
};
```

- `overrides` 는 additive extension. 기존 `.settings` = merged view 그대로 유지. ✓
- receipt (`mint-sale-receipt`, `pos-refund`, `pos-return`) callers: `.settings` 만 읽음 → 영향 없음. ✓
- fork #251 `usePosSettings` 는 `settings` 키만 읽음 → 영향 없음. ✓
- route.ts: store scope 응답에 `overrides` 미포함 (`...(locationId ? { overrides } : {})`) → store scope callers 응답 shape 변경 없음. ✓

---

## 5. Admin UI (지침 5)

**PASS.**

`page.tsx` 직접 확인:

| 항목 | 코드 | 결과 |
|------|------|------|
| 주소 빈칸 → 상속(null) | `locStoreAddress.length === 0 ? null : locStoreAddress` | ✓ |
| PB1 On → 상속(null) | `locPb1Enabled ? null : 0` | ✓ |
| PB1 Off → 0 override | `locPb1Enabled ? null : 0` | ✓ |
| "Follows brand (…)" 주소 힌트 | `Follows brand ({brandStoreAddress \|\| "—"})` (locStoreAddress 빈칸 시) | ✓ |
| "Follows brand (n%)" PB1 힌트 | `Follows brand ({brandPb1Display}%)` (locPb1Enabled=On 시) | ✓ |
| 색 토큰 | `text-ui-fg-muted/subtle/error` · `border-ui-border-base` · `bg-ui-bg-field` · `ring-ui-border-interactive` · `Badge color=` API | ✓ |
| override 초기 복원 | `"store_address" in ov` / `"pb1_pct" in ov` 로 판별 → 스위치·주소 올바르게 초기화 | ✓ |

하드코딩 hex / raw Tailwind 색상 클래스 없음. ✓

---

## 6. CI (지침 6)

`get_check_runs` / `get_status` API 403 (권한 미할당 · R0-1124-W 와 동일 상황).
PR `mergeable_state: "unstable"` = checks pending.

로컬 검증 (M0-1124-H 보고서 실행 기록):
- typecheck: PASS (에러 0)
- test: 605/605 PASS (location-inherit 7건 신규 포함)
- lint: 0 errors (9 pre-existing warnings · 변경 파일 무관)
- feature-map: 1268/1268 matched

PR 본문에 모든 검증 기록 존재. CI pending 상태이며 403 로 직접 확인 불가이나, 로컬 suite 전 항목 PASS.

---

## 결론

**APPROVE.**

R0-1124-W CHANGES 1건(dirty → rebase 해소) 확인. M0-1124-H 신규 변경 전항목 코드 직접 검증.
GitHub 리뷰: COMMENT 이벤트로 기록 완료 (자체 PR APPROVE 버튼 불가).

CI 초록 확인 후 squash merge 권장. 머지 후 `setup-multi-store --apply` 실행(PIM/PS 2매장 · 주소 override).
