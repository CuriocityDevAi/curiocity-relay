fork #214 계획서 · 미러 권장 a · 서버 변경 X · 라운드 3개 · Kyu 결정 5건

## 계획서 위치
`docs/plans/cd-preview-on-pos.md` — PR #214 (docs-only)

## 핵심 판단

**미러 권장 (a) WebView**: 렌더링 정확도 100% (손님이 보는 그대로), 코드 중복 없음, CD 화면 변경 자동 반영.  
(b) 재구현: 코드 중복 큼. (c) 커스텀: 배지와 큰 차이 없음.

**서버 변경 없음**: 기존 `GET /admin/pos/registers/:id/snapshot` 그대로 사용.

## 라운드 분해

| 라운드 | 작업 | 크기 |
|--------|------|------|
| R1 | (가) 배지 컴포넌트 + Settings + 헤더 연결 | 35–40분 |
| R2 | (나) 미러 창 WebView + 크기 단계 + Settings | 35–40분 |
| R3 | CD 웹 빌드 미러 모드 (별도 리포) | 30–45분 |

fork #213 / M2 겹침 없음 (success/SuccessReceiptAnim 무관, Settings 는 R1→R2 순서 필요).

## Kyu 결정 5건

1. 미러 방법 → 권장 (a) WebView
2. 미러 기본 크기 → 권장 M (25% 화면 폭)
3. 배지 기본 정보량 → 권장 중간
4. 보이는 화면 범위 → 권장 모든 POS 화면 공통
5. R3 타이밍 → 권장 R2 머지 후
