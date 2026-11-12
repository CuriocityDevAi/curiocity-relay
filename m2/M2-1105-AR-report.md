# M2-1105-AR 완료 리포트
작성: 2026-11-12 · Sonnet 4.6
PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/99
브랜치: fix/m2-1105-ar-split-second-tender

---

## 항목별 표

| 항목 | 파일:줄 | 내용 | 커밋 |
|------|---------|------|------|
| **S1 buildSplitBody 헬퍼** | split-tender/[draftOrderId].tsx:119 | `buildSplitBody()` 헬퍼 — `split:true` 고정, 4조합 모두 경유 | 0218c5d |
| **S1 onProcessSecond** | split-tender/[draftOrderId].tsx:171 | `buildSplitBody(PROVIDER_CASH, remaining, {...})` | 0218c5d |
| **S1 onConfirmSecondCard** | split-tender/[draftOrderId].tsx:184 | `buildSplitBody(PROVIDER_EDC_MANUAL, remaining, {...})` | 0218c5d |
| **S1 onProcessFirst** | split-tender/[draftOrderId].tsx:143 | 기존 `split:true` → 헬퍼 경유로 통일 | 0218c5d |
| **S1 onConfirmFirstCard** | split-tender/[draftOrderId].tsx:155 | 기존 `split:true` → 헬퍼 경유로 통일 | 0218c5d |
| **S1 회귀 어설션** | scripts/m2-1105-ar-assertions.mjs | S1-1~S1-6: 헬퍼 존재·4함수 경유·raw call 없음 | 0218c5d |
| **S2 approval_code** | CardTenderPanel.tsx:75 | `keyboardType="numeric"` → `{...DIGITS_INPUT_PROPS}` 스프레드 | f34da0d |
| **S2 bank returnKeyType** | CardTenderPanel.tsx:63 | `returnKeyType="done"` 추가 — bank→approval 전환 시 키보드 확실히 닫힘 | f34da0d |
| **S2 CashTenderPanel custom** | CashTenderPanel.tsx:116 | `inputMode="numeric"` 추가 | f34da0d |
| **S2 split 1차 금액** | split-tender/[draftOrderId].tsx:339 | `inputMode="numeric"` 추가 | 0218c5d |
| **S3 _layout.tsx** | _layout.tsx:82 | `checkout/split-tender/[draftOrderId]` Stack.Screen 등록 `title:''` | ab2286e |

## 숫자 칸 전체 감사 표

| 칸 | 파일:줄 | keyboardType | inputMode | 조치 |
|---|---|---|---|---|
| approval_code | CardTenderPanel.tsx:75 | `numeric` (DIGITS_INPUT_PROPS) | `numeric` ✅ | **이번 수정** |
| card_last4 | CardTenderPanel.tsx:96 | `numeric` (DigitsInput) | `numeric` ✅ | 정상 (수정 안 함) |
| cash received | CashTenderPanel.tsx:116 | `numeric` | `numeric` ✅ | **이번 수정** |
| split 1차 금액 | split-tender/.../339 | `numeric` | `numeric` ✅ | **이번 수정** |
| delivery phone | DeliveryInputs.tsx:123 | `phone-pad` | ❌ | 의도적 (범위 밖) |

## 자기 검증

```
node scripts/run-all.mjs assertions
→ 총 42 개 · 42 PASS · 0 FAIL

npx prettier --check ...
→ All matched files use Prettier code style!
```

(자기 검증 항목 5: iPad 시뮬레이터 스샷 — 로컬 서버 미기동으로 완료 불가. Kyu 실기 확인 항목으로 PR에 명시.)

## git ls-tree

```
100644 blob 597b0eec  app/_layout.tsx
100644 blob a56aa567  app/checkout/split-tender/[draftOrderId].tsx
100644 blob 15df7dda  components/payment/CardTenderPanel.tsx
100644 blob ead759f9  components/payment/CashTenderPanel.tsx
100644 blob 4a75d8d8  scripts/m2-1105-ar-assertions.mjs
```

## 커밋 목록

| 해시 | 항목 | 내용 |
|------|------|------|
| 0218c5d | S1 + 어설션 | buildSplitBody 헬퍼 · 4조합 split:true · m2-1105-ar-assertions.mjs |
| f34da0d | S2 | CardTenderPanel DIGITS_INPUT_PROPS + returnKeyType · CashTenderPanel inputMode |
| ab2286e | S3 | _layout.tsx split-tender Stack.Screen 등록 |

## PR

PR #99: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/99

## Kyu 확인(실기) 항목

- [ ] Cash 89,500 → Card 400,000 완료 (합계 489,500) — 토스트 없이 영수증 화면으로
- [ ] Card 1st → Cash 2nd 조합도 완료
- [ ] Split payment 화면 상단에 경로 문자열 대신 빈 제목
- [ ] Approval code 칸 탭 시 항상 숫자 키패드 (QWERTY 없음)
- [ ] Bank 입력 후 Done → 키보드 닫힘 → Approval 탭 시 숫자 키패드

## 이연 순증감

- 신규: 없음
- 해소: 없음
