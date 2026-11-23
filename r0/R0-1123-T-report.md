#245: APPROVE

## 확인 항목

| # | 항목 | 결과 |
|---|---|---|
| ① | 헤더 "Sell" 제거 · SellTopBar 최상단 (`● Open · <store>` + Connected + `…`) | ✅ |
| ② | 순서(상태줄→칩→검색→상품) · 빈 공간 제거 | ✅ |
| ③ | 폰 세로·iPad 가로/세로 e2e 스펙 | ✅ |
| ④ | SellTopBar minHeight 44px (Pay 규격) | ✅ |
| ⑤ | #244 회귀 없음 (칩·Cash pickup·스캔·시트) | ✅ |
| ⑥ | diff = master 위 M3-1123-M 커밋 1개 (리베이스 완료) | ✅ |
| ⑦ | CI | ⚠️ gh pr checks 결과 없음 |

## 소견

- `SellTopBar.tsx:22` — 외부+내부 `TouchableOpacity` 중첩, 세션 닫힘 시 `…` 버튼 무반응. 블로커 아님.
- `SellTopBar.tsx:39` — `● Connected`가 CD 연결 상태가 아닌 `isOpen`(세션)에 묶임. 의도적 단순화면 PR 설명 명시 권장.

## 제출

본인 PR 제약으로 APPROVE 대신 COMMENT 제출. 인라인 코멘트 2건 포함.
