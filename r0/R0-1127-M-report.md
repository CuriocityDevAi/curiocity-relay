storeport#475: APPROVE · 필수 0건 · 권고 3건 · CI heavy-mac pass · vitest run 36 passed 1 skipped

## CI 요약
- heavy-mac: **pass** (14m21s)
- heavy-cloud: skipping (범위 밖)
- actionlint / changes-filter / check / docker-build / markers-and-forbidden / route: 전부 pass

## 직접 실행한 명령
```
cd ~/curiocity-live/storeport-wts/hub-m2/packages/receipt-lines
node_modules/.bin/vitest run --reporter=verbose
# → Test Files 3 passed | 1 skipped (4)
#       Tests  36 passed | 1 skipped (37)
```

## REQ별 판정

### REQ #1 패리티 "차이 0" 진짜인지
- `parity.test.ts` 2 케이스 모두 통과.
- 비교 방식: `toBe(expected)` — 공백·순서 무시 없음, 완전 문자열 동일 비교.
- 검증의 검증: 품목 순서 `[items[1], items[0]]` 로 바꾸면 `not.toBe`로 빨강 — 느슨하지 않음.
- 샘플(`docs/testing/receipt-escpos-sample.txt`)은 32칸 고정폭·`Rp 16.500` 형식으로 커밋, 실제 렌더와 일치.

### REQ #2 모든 분기 테스트
sale · discount · reprint · void · refund · partial_refund · split · preorder · delivery · service/tax on·off · logo on·off · 매장 토글 전부 커버. ✅

### REQ #3 `Order #<display_id>` 내부 번호 줄
없음. Queue #42(pos_order_num) 하나, Order kv는 `order_custom_display_id`(PIM26B1042). 중복 없음. ✅

### REQ #4 POS fork git 의존성 구조
PR 본문 3줄 확인. 구조 문제없음. 단, POS fork는 npm 사용(`package-lock.json`)이므로 `github:org/repo#path:` 문법이 npm에서는 미지원(pnpm 전용) — 권고로 기록.

## 권고 (필수 아님)
1. **[R3/R4 전 반영]** `ReceiptSnapshot.order_display_id` → `pos_order_num` rename. 현 명칭이 Medusa `display_id`(내부 증분 ID)와 혼동 가능. Kyu 14:13 결정 반영.
2. **[R2 착수 전]** npm에서 `github:...#path:` git dep 미지원. R2 POS fork 연결 시 pnpm 전환 or tsup dist/ 추가 필요.
3. **[R2 전 추가 권고]** `tenderDetails()` card 분기 단독 테스트 없음. 현 split 픽스처 cash+QRIS만 사용.

## PR 코멘트
storeport#475 COMMENT(자기 PR로 APPROVE 불가) 제출 완료.
