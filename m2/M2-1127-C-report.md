PASS · PR https://github.com/CuriocityDevAi/storeport/pull/470 · 커밋 1ff3481

---

## 완료 항목

| REQ | 내용 | 결과 |
|-----|------|------|
| 1 | `docs/spec-guard/cd-element-inventory.md` 요소 재고표 | ✅ 생성 |
| 2 | `scripts/spec-guard-cd-audit.mjs` 명세↔구현 대조 스크립트 | ✅ 생성 |
| 3 | `scripts/spec-guard-cd-map.json` CD-* ID → testids + 테스트 파일 맵 | ✅ 생성 |
| 4 | 누락 testID 추가 (`order-list-order-no`) | ✅ 1건 추가 |
| 5 | 기존 e2e 테스트에 보존 어설션 추가 | ✅ CD-CHIP-ORDERNUM 테스트 추가 |
| 6 | CI 편입 (`heavy-steps/action.yml` · iMac 전용 · `continue-on-error: true`) | ✅ |
| 7 | 명세↔구현 어긋남 목록 보고 (수정 없음) | ✅ |

---

## 오딧 실행 결과

```
[audit] 명세 로드: local:/Users/kyu.lee/projects/curiocity-relay/specs/screens/customer-display.md
  → 17개 CD ID 파싱

ID                          명세        testID   테스트    결과
CD-CHIP-ORDERNUM            일치        ✅        ✅        ✅ 커버됨
CD-ORDER-LIST               일치        ✅        ✅        ✅ 커버됨
CD-ENTER-PHONE-BTN          일치        ✅        ✅        ✅ 커버됨
CD-QRIS-QR                  일치        ✅        ✅        ✅ 커버됨
CD-KEYPAD                   일치        ✅        ✅        ✅ 커버됨
CD-FIRST-VISIT              일치        ✅        ✅        ✅ 커버됨
CD-CONFIRM                  일치        ✅        ✅        ✅ 커버됨
CD-EARNED                   일치        ✅        ✅        ✅ 커버됨
CD-FAILED                   일치        ✅        ✅        ✅ 커버됨
CD-SKIPPED                  일치        ✅        ✅        ✅ 커버됨
CD-PAYMENT-COMPLETE         일치        ✅        ✅        ✅ 커버됨
CD-RECEIPT-FULL             일치        ✅        ✅        ✅ 커버됨
CD-RECEIPT-MINI             일치        ✅        ✅        ✅ 커버됨
CD-RECEIPT-FORMAT           일치        ✅        ✅        ✅ 커버됨
CD-LEFT-SCREEN-NAME         일치        ✅        ✅        ✅ 커버됨
CD-LEFT-REMAINING           일치        ✅        ✅        ✅ 커버됨
CD-STATE-FROM-SNAPSHOT      일치        ❌        ✅    📋  ⚠️ testID 없음 (순수 함수 · todo)

총 17개 ID · ✅ OK: 16 · ❌ FAIL: 0 · ⚠️ WARN: 1

[audit] ✅ 통과
```

**검증 (testID 제거 → ❌ 감지 → 복원)**: `order-list-order-no` testID를 임시 제거했을 때 CD-CHIP-ORDERNUM ❌ FAIL로 정상 감지됨. 복원 후 ✅ OK.

---

## 명세↔구현 어긋남 목록 (REQ 5 · 수정 없음)

| 요소 | 명세 | 실제 구현 |
|------|------|-----------|
| `CD-CHIP-ORDERNUM` | `#N` 칩 (pos_order_num, 1~99 순환) · PosChipBadge 사용 | `Order #{display_id}` 텍스트 · PosChipBadge 미사용 · `display_id=1042` 형태 |
| `CD-ORDER-LIST` | 품목 32px · 합계 64px | 품목 22px · 합계 45px (M1-1126-B 70% 축소) |

---

## "명세에 없음" 요소

CD-* ID 기준 없음.

**추가 요소**: `WaitingPanel` (`waiting-panel` testID) — relay `customer-display.md` 에 별도 항목 없음. Kyu 에게 명세 추가 여부 확인 요청 필요.

---

## 요소 집계

| 구분 | 개수 |
|------|------|
| 전체 CD 요소 | 17 |
| 명세에 있음 | 17 |
| 명세에 없음 (CD-*) | 0 |
| testID 추가 (M2-1127-C) | 1 (`order-list-order-no`) |
| 보존 테스트 추가 | 1 (CD-CHIP-ORDERNUM) |
| todo (CD-STATE-FROM-SNAPSHOT) | 1 |
