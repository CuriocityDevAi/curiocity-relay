CHANGES

# R0-1125-A — PR #424 리뷰: CD-3 매장 이미지 · CD-10 이슬람력

**PR**: https://github.com/CuriocityDevAi/storeport/pull/424  
**Commit**: `7137236`

---

## CD-3: 매장 이미지 실 렌더 — ✅ PASS

| 체크 | 결과 |
|------|------|
| `store_image_url` 있음 → `<Image>` 렌더 (testID="store-image") | ✅ |
| `store_image_url` 없음 → placeholder 유지 | ✅ |
| 로드 실패 → `onError={() => setImgError(true)}` → placeholder 폴백 | ✅ |
| 필드명 `store_image_url` — StoreConfig / DisplayConfig / DisplayConfigShape / DEFAULT_LIVE_STORE / DEFAULT_STORE 일치 | ✅ |

---

## CD-10: 이슬람력 — 🔴 CHANGES

### KEMENAG_TABLE 2026 날짜 오류

Kemenag 공식 이스밧 발표(kepri.kemenag.go.id, kupang.antaranews.com) 대조:

| 항목 | 코드 | Kemenag 공식 isbat | 판정 |
|------|------|--------------------|------|
| 1 Ramadan 1447 H | `2026-02-18` | **`2026-02-19`** | ❌ 1일 차이 |
| 1 Syawal 1447 H (Idul Fitri) | `2026-03-20` | **`2026-03-21`** | ❌ 1일 차이 |
| 12 Rabi' al-Awwal 1448 H (Maulid) | `2026-09-04` | ~`2026-09-05` | ✅ 허용 범위 |

`2026-02-18` / `2026-03-20` 은 Muhammadiyah/Saudi Umm al-Qura 계산값. 코드 주석("Source: https://kemenag.go.id/ — annual press releases")은 공식 isbat 결과를 출처로 명시하지만, 실제 값은 isbat보다 1일 이른 계산값.

**수정 필요 (islamic-dates.ts)**:
```ts
2026: {
  ramadan: { start: "2026-02-19", end: "2026-03-20" },  // 02-18→02-19, 03-19→03-20
  lebaran: { start: "2026-03-21", end: "2026-03-30" },  // 03-20→03-21, 03-29→03-30
  maulid:  { start: "2026-09-04", end: "2026-09-10" },  // 변경 없음
},
```

**연관 테스트 (kemenag-table.unit.spec.ts)** assertions도 함께 수정:
- `KEMENAG_TABLE[2026].ramadan.start` → `"2026-02-19"`
- `KEMENAG_TABLE[2026].ramadan.end` → `"2026-03-20"`
- `getIslamicSuggestionsForYear(2026).ramadan.from` → `"2026-02-19"` 등

2027/2028: 공식 isbat 미발표 → 계산값 유지 가능. 주석은 2026(isbat)과 2027-2028(계산)을 명확히 구분할 것.

### Admin 등록 이벤트 우선 — ✅
`effectiveEventKey = eventKey ?? decorKey` → Admin `active_event_key` 항상 우선 ✅

### IslamicSuggestions 타입 변경 (string → {from, to}) 호출부 — ✅ 전부 대응 완료

| 파일 | 변경 |
|------|------|
| `customer-display-api.ts` | `IslamicSuggestionItem = { from, to }` ✅ |
| `EventForm.tsx` | `suggestion.from` / `suggestion.to` 사용 ✅ |
| `service.unit.spec.ts` | `s.ramadan.from` / `s.ramadan.to` 등 ✅ |
| API route | `getIslamicSuggestionsForYear` JSON 직렬화 → 클라이언트 타입 일치 ✅ |

---

## 테스트 · CI

| 항목 | 결과 |
|------|------|
| customer-display 테스트 (238건) | ✅ ALL PASS (M2 리포트 기준) |
| commerce-core 테스트 (636건) | ✅ ALL PASS |
| typecheck | ✅ 0 error |
| feature-map-check | ✅ 21s |
| ci (전체 CI) | ⏳ 리뷰 시점 pending — bot 댓글 미갱신 |

---

## 결론

CD-3 이미지 렌더 구현 및 IslamicSuggestions 타입 변경은 올바름. **KEMENAG_TABLE 2026 Ramadan 시작일(`2026-02-18`)과 Lebaran 시작일(`2026-03-20`)이 Kemenag 공식 이스밧 결과보다 1일 이름** — 주석 출처("kemenag.go.id")와 불일치. 수정 후 머지 가능.
