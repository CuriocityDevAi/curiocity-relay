#351 APPROVE · #349 CHANGES · 문제 1건

## #351 fix(customer-display): M2-1117-AA — APPROVE

### react-native-svg import
- `apps/customer-display/src/` 전체 grep: 0건 ✓
- `MerosWordmark.tsx`: `Svg/G/Path` → `Image` + PNG require 완전 교체

### npx expo export --platform ios
```
iOS Bundled 3325ms (1177 modules)
assets/wordmark.png (3 variations | 1.9KB)
_expo/static/js/ios/entry-*.hbc (2.6MB)
```
번들 성공, 에러 없음, @1x/@2x/@3x 모두 번들 포함 ✓

### 워드마크 PNG 해상도
| 파일 | 실측 |
|------|------|
| wordmark.png | 88×16 ✓ |
| wordmark@2x.png | 176×32 ✓ |
| wordmark@3x.png | 264×48 ✓ |

### 스플래시 규칙
SplashAnimation.tsx: BG=#FFE58A · INK=#3B2A1F · MUTED=#7A6656 · receipt 비율 68:74
POS와 동일 브랜드 토큰·구조. 이 PR 크기 미변경, `fill={INK}` 제거만 ✓

### icon.png
PIL 픽셀 샘플링:
- 1024×1024 ✓
- 배경 #3B2A1F ✓
- M glyph + CUSTOMER 텍스트 #FFE58A ✓
- icon-adaptive-foreground.png + app.config.ts Android adaptiveIcon ✓

---

## #349 docs(contracts): M1-1117-T — CHANGES

### ✅ 통과
- TB2 (판매재고=MEROS): production.stock.confirmed.v1 TB→MEROS, delta_qty>0, confirmed_by_user_id ✓
- TB3 (픽업완료=MEROS): commerce.order.handed_over.v1 MEROS→TB ✓
- TB4 (주문분리 나중에): order.created/modified/cancelled Phase E, 계약만 고정 ✓
- 주문 분리 설계 체크만(구현 없음): docs-only ✓
- todoboss_bridge 스텁 충돌 없음: external_ref_kind · HMAC · idempotency_key · retry 일치 ✓

### ❌ 문제 1건
`docs/contracts/meros-todoboss-events-v1.md` §1 실제 이벤트 9종인데 PR 제목·본문·footer 모두 "8종" 기재
→ staff / order(created/modified/cancelled) / handed_over / sale(completed/refunded) / production.stock / session = 9종
→ "9종"으로 수정 또는 order.modified 제외 여부 Kyu 판정 필요

---

## 착지 메모
- 자가 PR로 APPROVE/REQUEST_CHANGES 불가 → 양쪽 모두 COMMENT 형식으로 리뷰 제출
- storeport#351 COMMENT(APPROVE 내용) 제출 완료
- storeport#349 COMMENT(CHANGES 내용) 제출 완료
