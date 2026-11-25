PASS

# M2-1125-E — KEMENAG_TABLE 2026 Kemenag 공식 이스밧 정정

**브랜치**: `feat/M2-1125-C-cd-store-image-islamic`  
**커밋**: `fb167b7`  
**Push**: `7137236..fb167b7` → origin

---

## 변경 내용

### islamic-dates.ts

| 필드 | 이전 | 이후 |
|------|------|------|
| `2026.ramadan.start` | `2026-02-18` | `2026-02-19` |
| `2026.ramadan.end` | `2026-03-19` | `2026-03-20` |
| `2026.lebaran.start` | `2026-03-20` | `2026-03-21` |
| `2026.lebaran.end` | `2026-03-29` | `2026-03-30` |
| `2026.maulid.*` | 변경 없음 | — |

주석: 2026은 "Kemenag official isbat result" · 2027~2028은 "계산값(official isbat not yet published)" 명시 구분.

### kemenag-table.unit.spec.ts

- `KEMENAG_TABLE[2026].ramadan.start` 기대값: `"2026-02-18"` → `"2026-02-19"`
- `KEMENAG_TABLE[2026].ramadan.end` 기대값: `"2026-03-19"` → `"2026-03-20"`
- `getIslamicSuggestionsForYear(2026).ramadan.from` 기대값: `"2026-02-18"` → `"2026-02-19"`
- `getIslamicSuggestionsForYear(2026).ramadan.to` 기대값: `"2026-03-19"` → `"2026-03-20"`

---

## 테스트 결과

| 항목 | 결과 |
|------|------|
| kemenag-table.unit.spec.ts (7건) | ✅ ALL PASS |
| commerce-core 전체 (636건) | ✅ ALL PASS |
| customer-display 전체 (238건) | ✅ ALL PASS |
| event-contracts (21건) | ✅ ALL PASS |
