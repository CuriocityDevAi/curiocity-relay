PASS

## PR
https://github.com/CuriocityDevAi/storeport/pull/433

## 변경 파일
| 파일 | 변경 내용 |
|------|-----------|
| `apps/commerce-core/src/admin/routes/pos-settings/page.tsx` | R1' 탭 스타일: rounded-full 알약 + border-t-2 강조선 · :after / rounded-t-md 제거 · 패널 full border 유지 |
| `apps/commerce-core/src/modules/order_number/lib/format.ts` | R2' 항상 하이픈 · `needsOrderNumberHyphen` deprecated(항상 true) |
| `apps/commerce-core/src/admin/routes/pos-settings/sections/OrderNumbersSection.tsx` | 설명 텍스트 → `{NICK}-{YY}{MONTH}{SERIAL}` · 예시 PIM-26B1000 |
| `apps/commerce-core/src/modules/order_number/__tests__/format.unit.spec.ts` | 테스트 케이스 갱신 (항상 하이픈) |
| `apps/commerce-core/e2e/admin/admin-smoke.spec.ts` | R1' 알약 탭 구조 테스트 · preview_next PIM-26B1001 |

## 테스트 로그

### Unit (jest)
```
Test Suites: 60 passed, 60 total
Tests:       681 passed, 681 total
Time:        40.887s
```

### Playwright (admin-smoke Screen 4)
```
✓ 탭 5개 · Receipt 활성 · Advanced 섹션
✓ General 탭 · 매장 선택 시 nickname 편집기
✓ Receipt 탭 트리거 활성 강조 (shadow + 배경)
✓ R1' 알약 탭 · 패널·토큰·ARIA 구조
✓ R1 폴더 탭 · ←/→ 방향키로 탭 이동
✓ R2 닉네임 영숫자 · PIM3 허용 · pim3 자동 대문자
✓ R2 닉네임 영숫자 · 3PIM 은 클라이언트 regex 로 거절
7 passed (5.3s)
```

전체 smoke: 14 passed, 1 skipped (기존 미머지 Screen 2)

## CI
push hook 테스트 통과 후 push 완료 · GitHub Actions CI 대기 중

## 주요 기술 선택 (PR 본문 발췌)
1. `:after` 대신 `border-t-2` — 알약 curved border-top이 강조선 역할, 1줄 처리
2. `needsOrderNumberHyphen` 유지(항상 true) — #431 backward compat
3. `TAB_LIST_CLASS border-b` 제거 — 알약 탭은 패널과 독립, 패널 full border가 경계

## 실기 확인 항목 (Kyu)
- admin.meros.id 시크릿 → POS Settings → 탭이 알약 모양 + 활성 탭 위 얇은 선 + 패널 한 덩어리
- Receipt 탭 → Order number format 예시 PIM-26B…
- POS 새 주문 1건 결제 완료 → 주문번호 PIM-26B…
