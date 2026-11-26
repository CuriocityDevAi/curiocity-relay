POS qr_string 전송 OK(코드 수정 없음) · 서버→CD 전달 OK(snapshot.qr_string 레벨, CD QrisScreen.tsx:124)

## 진단

### POS 코드 경로
- `tender-qris/[draftOrderId].tsx:341-353` — 화면 마운트/`currentQrString` 변경 시 `setPosScreenHint({ pos_screen, extras: { amount: total, qr_string: currentQrString } })` 호출
- `hooks/usePosScreenAutoEmit.ts:97-98` — `hint.extras`를 그대로 `emit({ extras })`에 전달
- `hooks/usePosScreen.ts:73-74` — `if (item.qr_string) body.qr_string = item.qr_string;` / `if (typeof item.amount === 'number' && !Number.isNaN(item.amount)) body.amount = item.amount;`
- `POST /admin/pos/orders/${order_id}/checkout-snapshot` — body 에 `pos_screen` · `qr_string` · `amount` 포함

### 각 경우 판정

| 경우 | 판정 |
|------|------|
| 화면 진입 (초기 qrString route param) | ✅ OK |
| QR regenerate (`onNewQr` → `setCurrentQrString` → useEffect 재실행) | ✅ OK |
| 15분 만료 후 New QR → regenerate 동일 경로 | ✅ OK |
| split 1차 (payment_split_1) | ✅ OK — 동일 컴포넌트, isSplitFirst='1' 차이만 |
| split 2차 (payment_split_2) | ✅ OK — 동일 컴포넌트, isSplitSecond='1' 차이만 |

### 서버→CD 전달 (코드 대조)
`checkout-snapshot/route.ts:116-118` → `upsertSnapshotForRegister({ ..., qr_string })` → DB `order_snapshot.qr_string` 컬럼(Migration20261119000002) → CD 폴링 응답 `snapshot.qr_string` → CD `QrisScreen.tsx:124` `const qrString = snapshot.qr_string ?? null` 직접 읽음. **OK**.  
`ReceiptTender.qris` 에 `qr_string` 필드 없음은 계약상 정상 (결제 화면 QR ≠ 영수증 tender 필드).

## 테스트 결과

파일: `e2e/flows/M3-1126-G-qris-snapshot.spec.ts`

```
  ✓  [chromium] M3-1126-G · QRIS checkout-snapshot qr_string 전송
       › QRIS 화면 진입 → checkout-snapshot body 에 qr_string · amount 포함 (1.8s)
  ✓  [chromium] M3-1126-G · QRIS checkout-snapshot qr_string 전송
       › QR regenerate → 새 qr_string 이 checkout-snapshot 에 재전송 (1.5s)

  2 passed (5.0s)
```

### 네트워크 캡처 로그

**테스트 1 — 화면 진입:**
- 어설션 통과: `entry.body.qr_string.slice(0,20) === '00020101021226690016'`
- 어설션 통과: `entry.body.amount === 95000`
- 어설션 통과: `entry.body.pos_screen === 'payment_qris'`
- 어설션 통과: `entry.url` contains `/order_qris_01/`
- 어설션 통과: `entry.body.register_session_id === 'sess_e2e_01'`

**테스트 2 — regenerate:**
- 어설션 통과: `regenEntry.body.qr_string.slice(0,20) === '00020101021226690016'`
- 어설션 통과: `regenEntry.body.qr_string.includes('REGEN')` (기존과 다른 새 qr_string)
- 어설션 통과: `regenEntry.url` contains `/order_qris_01/`

## 커밋 · PR

- commit: `efb5a1e` — `test(qris): M3-1126-G — QRIS checkout-snapshot qr_string·amount 전송 E2E 어설션`
- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/273
