#32 APPROVE

## 경계 케이스 표 (R0-1125-K 지적 4건 재검증)

| 입력 | 기대 | 결과 |
|---|---|---|
| ☎️ (U+260E + U+FE0F VS-16) | 2 | ✅ 2 |
| è (e + U+0300 결합) | 1 | ✅ 1 |
| ZWJ U+200D 단독 | 0 | ✅ 0 |
| U+1F3FB 단독 (피부색 수식어) | 0 | ✅ 0 |
| 👋🏾 (U+1F44B + U+1F3FE) | 2 | ✅ 2 |
| 👨‍👩‍👧 (U+1F468+ZWJ+U+1F469+ZWJ+U+1F467) | 2 | ✅ 2 |

## truncateWidth grapheme 경계 보존

- T-W6: `'a' + 👨‍👩‍👧 + 'b'` maxCols=3 → `'a…'` (ZWJ 묶음 통째로 팝) ✅
- T-W6: `'ab' + è + 'cd'` maxCols=4 → `'ab…'` (è grapheme 통째로 팝) ✅

## Node 버전 호환

- 러너 Mac: Node v22.23.4 → `Intl.Segmenter` 지원 ✅

## 테스트 로그

```
node --test scripts/test/ci-watch-v2.test.mjs (커밋 6d85e3935, 워크트리 ~/projects/curiocity-relay-wts/R0-1125-L)

T-W1 ok 28  displayWidth — 한글·이모지·●■▲·… 폭 계산
T-W2 ok 29  truncateWidth — 한글 포함 자르기
T-W5 ok 30  displayWidth — 경계 케이스 (VS-16·ZWJ·결합문자·피부색)
T-W6 ok 31  truncateWidth — grapheme cluster 경계 보존
T-W3 ok 32  padEndWidth — EAW 기준 패딩
T-W4 ok 33  renderV2 board — 한글 카드 포함 시 각 줄 표시 폭 동일

1..35 · pass 35 · fail 0
```

## 조치

- APPROVE 코멘트 게시: https://github.com/CuriocityDevAi/curiocity-relay/pull/32#issuecomment-7152777556
  (자기 PR GitHub 제한으로 formal approve 대신 코멘트)
- 열린 리뷰 스레드: 라인 레벨 코멘트 없음 → resolve 불필요
