PASS · PR #449 · https://github.com/CuriocityDevAi/storeport/pull/449

## 변경 요약

**원인**: `apps/customer-display/app/_layout.tsx:129`
```ts
// Before
const langKey = mockState?.langKey ?? "id";
// After
const langKey = mockState?.langKey ?? "en";
```
기본 폴백이 `"id"` (인도네시아어)였으므로 브라우저 언어 무관하게 pair 화면이 "Hubungkan Perangkat"로 표시됐음. `"en"` 으로 변경해 모든 화면(pair·대기·주문·번호입력·첫방문·확인·적립·실패)이 기본 영어로 표시됨.

## 확인 항목

| 항목 | 결과 |
|---|---|
| `_layout.tsx` i18n 설정만 수정 | ✅ |
| `app/index.tsx` 미수정 (#448 충돌 없음) | ✅ |
| GlobeMenu 언어 선택 기능 유지 | ✅ |
| Playwright: browser locale id-ID → pair 화면 "Connect Device" 영어 | ✅ |
| Playwright 전체: 129 passed | ✅ |
| vitest: 312 passed | ✅ |
| Jest: 859 passed | ✅ |

## 스크린샷

`apps/customer-display/screenshots/pair-screen-id-locale-en.png`

브라우저 로케일 `id-ID` 상태에서 `/pair` 화면 로드 — Playwright DOM assertion으로 `"Connect Device"` (영어) 텍스트 존재 확인.
(pair 화면 위에 splash 오버레이가 항상 표시되는 것은 기존 동작과 동일하며, DOM visibility 기준으로 테스트 통과)
