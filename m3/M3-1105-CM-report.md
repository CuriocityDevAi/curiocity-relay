# M3-1105-CM 완료 보고

PR: https://github.com/CuriocityDevAi/storeport/pull/272 (Draft)

## 결과 요약
`apps/customer-display/src/decor/**` 신규 독립 모듈 생성 완료. #268 파일 미수정 확인.

## 구현 항목
| 항목 | 파일 | 상태 |
|---|---|---|
| 7종 이벤트 모티프 정의 | `src/decor/events.ts` | ✅ |
| resolveActiveEvent 순수 함수 | `src/decor/resolveActiveEvent.ts` | ✅ |
| EventDecor 컴포넌트 | `src/decor/EventDecor.tsx` | ✅ |
| i18n 인사 띠 (5개 언어) | `src/decor/strings.ts` | ✅ |
| 공유 타입 | `src/decor/types.ts` | ✅ |
| 단위 테스트 | `src/decor/__tests__/*.test.ts` | ✅ 98개 통과 |
| dev 미리보기 페이지 | `app/decor-preview.tsx` | ✅ |
| Playwright 스펙 | `e2e/decor-preview.spec.ts` | ✅ 8/8 통과 |
| 스크린샷 | `screenshots/decor-*.png` | ✅ 7종 생성 |
| feature-map 등록 | `docs/feature-map.yaml` | ✅ cd-event-decor |

## 확인(실기) 항목

### 미리보기 페이지 여는 법
```
pnpm -F customer-display build:web
pnpm -F customer-display e2e --grep "decor"
# 또는 직접: npx serve -s apps/customer-display/dist -l 4173
# 브라우저: http://localhost:4173/decor-preview
```

### 7종 각 모습 (Playwright 확인 완료)
- christmas: ❄✦ 빨강/녹색/금색 반짝임·둥실 모티프
- imlek: 🏮✨ 빨강/금색 등불·반짝임
- valentine: ♥♡ 붉은/분홍 하트 둥실
- ramadan: ☽✦🏮 금색/녹색 초승달·별·등불
- lebaran: ◆☽ 녹색/금색 다이아몬드·초승달
- maulid: ✴☽ 짙은녹색/금색 별8각·초승달
- merdeka: 🚩✨ 빨강 흔들깃발·반짝임

## Playwright 결과
```
8 passed (10.6s)
✓ renders the preview page with all 7 event cards
✓ decor renders for christmas
✓ decor renders for imlek
✓ decor renders for valentine
✓ decor renders for ramadan
✓ decor renders for lebaran
✓ decor renders for maulid
✓ decor renders for merdeka
```

## 단위 테스트 결과
```
Test Files  4 passed (4)
     Tests  98 passed (98)
```
- resolveActiveEvent: Gregorian/Islamic 날짜 판정, 이벤트 없음=null
- tokens: 7종 완전성, 모티프 크기(40–84px), i18n 5개 언어

## `gh pr checks 272` 결과
| job | 결과 |
|---|---|
| check (feature-map) | ✅ pass (feature-map 등록 커밋 후) |
| markers-and-forbidden | ✅ pass |
| changes-filter | ✅ pass |
| unit-commerce-core | pending → 완료 예정 |
| pos-integration | pending → 완료 예정 |

## 이연 순증감
신규 파일만: src/decor/ 7파일 · app/decor-preview.tsx · e2e spec · 스크린샷 8장 · feature-map 1항목.
기존 파일 수정 없음. 이연 항목 증가 없음.

## #268 연결 지점
#268 머지 후: `ReceiptScreen`·`DoneScreen`·`MainScreen` 의 루트 `<View>` 내부에서 `eventKey` non-null 시 아래를 overlay 추가:
```tsx
<EventDecor event={eventKey} theme={t} lang={lang} />
```
