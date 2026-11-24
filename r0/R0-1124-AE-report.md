APPROVE

# R0-1124-AE — storeport PR #422 리뷰 (M0-1124-J Receipt 탭 Round A)

PR #422 는 merged 상태. APPROVE 상당 COMMENT 로 제출 (자기 PR APPROVE 불가).

---

## 체크포인트 결과

### R2 · 탭 이름 · alias · redirect ✅

| 항목 | 코드 위치 | 확인 |
|---|---|---|
| `TABS` 배열 `"receipt"` | page.tsx | ✅ |
| `normalizeTab("order-numbers") → "receipt"` alias | page.tsx `normalizeTab()` | ✅ |
| `/order-numbers` redirect → `?tab=receipt` | order-numbers/page.tsx | ✅ |
| trigger text "Receipt" · `data-testid="pos-settings-tab-receipt"` | page.tsx Tabs.Trigger | ✅ |

---

### R1 · 닉네임 편집기 ✅

- **Brand 모드 숨김**: `{inLocationMode && selectedLocationId ? <NicknameEditor …> : null}` — Brand 모드(`inLocationMode=false`)에서 렌더 없음 ✅
- **General 탭 · 매장 선택 시만 편집**: `selectedLocationId` 조건 추가 보호 ✅
- **Receipt 탭 display-only**: `nicknameEditable={false}` → `<Text>` + "Edit in General tab…" 힌트 렌더 ✅
- **기존 API 재사용**: `PUT /admin/order-numbers/${stockLocationId}/nickname` — OrderNumbersSection 과 동일 ✅
- 스모크 테스트: Brand 모드(`location_id: null`) → 닉네임 편집기 count 0 → `sloc_pim` 선택 → 편집기 appear 확인 ✅

---

### R3 · receipt_header·logo_url 이동 + 신규 UI · whitelist 일치 ✅

서버 `STORE_PATCH_KEYS` (route.ts:22-42) 확인:

| 키 | PR 전 | PR 후 | whitelist |
|---|---|---|---|
| receipt_header | UI: General | UI: Receipt | ✅ 기존 |
| logo_url | UI: General | UI: Receipt | ✅ 기존 |
| receipt_footer | UI 없음 | UI: Receipt | ✅ 신규 |
| receipt_logo_mode | UI 없음 | UI: Receipt | ✅ 신규 |
| reprint_limit | UI 없음 | UI: Receipt Advanced | ✅ 신규 |
| reprint_watermark | UI 없음 | UI: Receipt Advanced | ✅ 신규 |
| refund_watermark | UI 없음 | UI: Receipt Advanced | ✅ 신규 |

UI ↔ 서버 7개 키 완전 일치.  
`brandHasChanges` + save patch 에 5개 신규 키 모두 포함 ✅  
`reprintLimitInvalid` 클라이언트 가드 ↔ 서버 `reprint_limit must be a non-negative integer` 조건 동일 ✅  
`showSaveFooter`: brand 모드 Receipt 탭 추가, location 모드 Receipt 탭 제외(receipt 필드는 brand-scope) ✅  
`brandInvalid` 에 `reprintLimitInvalid` 추가 → save 버튼 차단 ✅

---

### R6 · 탭 강조 · 다크 모드 토큰 ✅

```ts
const TAB_TRIGGER_CLASS =
  "data-[state=active]:bg-ui-bg-component " +
  "data-[state=active]:text-ui-fg-base " +
  "data-[state=active]:font-semibold " +
  "data-[state=active]:shadow-borders-base";
```

- Medusa UI 토큰 4개만 사용, hex / raw Tailwind 색 없음 ✅
- CSS 변수 기반 → dark/light 자동 대응 ✅
- 스모크 테스트 3번: `data-state=active` / `data-state=inactive` 속성 명시 검증 + 스크린샷 ✅

---

### CI · #420 회귀 ✅

```
feature-map-check        ✅  27s
ci/changes-filter        ✅  21s
ci/route                 ✅  19s
ci/markers-and-forbidden ✅  23s
ci/heavy-mac             ✅  12m 54s  (typecheck · 605 unit · lint · playwright 7P/1S)
ci/heavy-cloud           ⏭  skip (기존 그대로)
```

매장 선택·주소/PB1 상속 경로(M0-1124-E/G/H) diff 미변경 — #420 회귀 없음 ✅

---

## 사소한 메모 (차단 아님)

1. `receipt_logo_mode` 을 Medusa UI `<Select>` 가 아닌 native `<select>` 로 구현. Medusa UI 토큰으로 스타일링해 dark 모드 대응은 됨. Round B 때 다른 selects 와 통일 고려.
2. `NicknameEditor` 가 `/admin/order-numbers` 전체 목록을 fetch 해 한 row 를 필터링 — 매장 수 적어 허용 가능. 단일 row 엔드포인트가 생기면 교체 가능.

---

## 결론

APPROVE. R2·R1·R3·R6 5개 요건 모두 충족. CI 전 잡 초록. #420 회귀 없음.  
PR #422 에 APPROVE 상당 COMMENT 제출 완료 (자기 PR 제한으로 COMMENT 이벤트 사용).
