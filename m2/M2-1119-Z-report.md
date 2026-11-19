fork #208 · #207 반영 O · paid 단일 채널 O · cleanup 덮어쓰기 차단 O · #400 정합 O · 테스트 9/9 · lint 0

## 수행 내역

### #207 반영
`fix/M2-1119-S-pos-slip-nextcustomer` → `fix/M3-1119-O-cd-emit` 3-way merge clean (충돌 없음).
merged commit: 741ab8c

### paid 단일 채널화
- `success/[orderId].tsx`: `posScreen.emit(paid)` 제거 → `setPosScreenHint({pos_screen:'paid', freezeCart:true})` 단일 채널
  - 언마운트(Next customer / Done / Hand over) 시 `setPosScreenHint(null)` → idle 폴백
  - `revertDisplayToPaid` 도 동일 채널 사용 (loyalty_entry 타임아웃 복귀)

### tender-qris cleanup 차단
- `tender-qris/[draftOrderId].tsx` cleanup: `if (!paidRef.current) setPosScreenHint({checkout_review})`
  - `paidRef.current = true` 는 `navigateToSuccess()` 최상단에서 이미 설정 → 타이밍 보장

### #400 정합
메시지 순서 (paid → idle):
```json
{"pos_screen":"payment_qris","seq":100}
{"pos_screen":"paid","seq":101}
{"pos_screen":"idle","seq":102}
```
paid 후 번호입력/영수증/감사는 success 화면 내 (hint=paid 유지).
Next customer → setPosScreenHint(null) → 빈 카트 → idle.

### 테스트
`__tests__/m2-1119-z-paid-channel.test.ts` 신설 (9개 케이스):
- ① success 진입 시 hint=paid 고정
- ② paidRef 가드 — cleanup 이 paid 를 덮지 않음
- ③ Next customer 후 hint=null → idle 폴백
- ④ 전체 시퀀스 (QRIS → paid → Next customer → idle)

전체 vitest: 64 passed / 1 pre-existing fail (docs/plans/splitview-capture.spec.ts · @playwright/test 없음).
신규 fail 0.

### lint / tsc
- tsc: 변경 파일 신규 error 0 (기존 pre-existing errors 유지)
- lint: 변경 파일 warnings 6 → 5 (1 감소 · 신규 error 0)

## 커밋
- 741ab8c merge: #207 반영
- 217b695 fix(pos): M2-1119-Z — paid 단일 채널화 · tender-qris cleanup 덮임 차단
  pushed to origin/fix/M3-1119-O-cd-emit
