PASS

# M1-1125-H — text-width.mjs 폭 계산 경계 버그 4건 수정

PR #32 (`fix/M2-1125-H-ci-watch-width`) · 커밋 `6d85e3935`

## 경계 케이스 표

| 입력 | 기대 | 수정 전 | 수정 후 | 비고 |
|---|---|---|---|---|
| `'☎️'` (☎ U+260E + VS-16 U+FE0F) | 2 | 3 | 2 | VS-16 → 0칸 |
| `'\u{200D}'` ZWJ 단독 | 0 | 1 | 0 | ZWJ → 0칸 |
| `'è'` (e + U+0300 결합) | 1 | 2 | 1 | 결합 발음 부호 → 0칸 |
| `'\u{1F44B}\u{1F3FB}'` 👋🏾 | 2 | 4 | 2 | 피부색 수식어 → 0칸 |
| `'\u{1F468}‍\u{1F469}‍\u{1F467}'` 👨‍👩‍👧 | 2 | 6 | 2 | ZWJ 묶음 2칸 (Intl.Segmenter) |
| `'a\u{1AB0}'` Ext. Combining | 1 | 2 | 1 | U+1AB0 → 0칸 |
| `'a⃐'` (a+U+20D0) | 1 | 2 | 1 | U+20D0 Enclosing → 0칸 |
| `'a︠'` (a+U+FE20) | 1 | 2 | 1 | U+FE20 Half Mark → 0칸 |
| truncate: `'a'+family+'b'` maxCols=3 | `'a…'` | ZWJ 중간 분리 가능 | `'a…'` | grapheme 단위 팝 |
| truncate: `'abècd'` maxCols=4 | `'ab…'` | è 중간 분리 가능 | `'ab…'` | grapheme 단위 팝 |

## 수정 내역

### `scripts/watch/text-width.mjs`

1. **cpWidth() 선두에 zero-width 가드 추가**
   - 결합 발음 부호: U+0300–036F · 1AB0–1AFF · 1DC0–1DFF · 20D0–20FF → 0
   - ZWJ U+200D → 0
   - 변형선택자 U+FE00–FE0F (VS-16 포함) → 0
   - Combining Half Marks U+FE20–FE2F → 0
   - 피부색 수식어 U+1F3FB–1F3FF → 0

2. **Intl.Segmenter 도입 (Node 내장, 의존성 0)**
   - `displayWidth`: grapheme 단위 순회, 각 cluster 첫 cp 폭 합산
     → ZWJ 묶음 전체가 1 grapheme이 되어 2칸 한 덩어리
   - `truncateWidth`: 동일하게 grapheme 단위로 추가·팝
     → 결합문자·ZWJ 묶음 중간 절단 방지

### `scripts/test/ci-watch-v2.test.mjs`

- **T-W5**: displayWidth 경계 케이스 7건 추가
- **T-W6**: truncateWidth grapheme cluster 경계 보존 2건 추가

## 테스트 로그

```
TAP version 13
...
ok 28 - T-W1: displayWidth — 한글·이모지·●■▲·… 폭 계산
ok 29 - T-W2: truncateWidth — 한글 포함 자르기
ok 30 - T-W5: displayWidth — 경계 케이스 (VS-16 · ZWJ · 결합문자 · 피부색)
ok 31 - T-W6: truncateWidth — grapheme cluster 경계 보존
ok 32 - T-W3: padEndWidth — EAW 기준 패딩
ok 33 - T-W4: renderV2 board — 한글 카드 포함 시 각 줄 표시 폭 동일
ok 34 - T-9a: --once 줄형 출력 캐처 — 한글/이모지 카드 포함
ok 35 - T-9b: --once 박스 출력 캐처 — 한글/이모지 카드 포함
1..35
# tests 35
# pass 35
# fail 0
# duration_ms 145.036625
```

## PR

- PR #32: https://github.com/CuriocityDevAi/curiocity-relay/pull/32
- 코멘트: https://github.com/CuriocityDevAi/curiocity-relay/pull/32#issuecomment-7152609321
