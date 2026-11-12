# M0-1105-AU 리포트

작성일: 2026-11-12
작업자: Claude Code

---

## 수정 내용

### app/(tabs)/scan.tsx:89 — setErrorMessage('Order not found') 삭제

**위치**: `pos-m2` 워크트리 · 브랜치 `feat/m0-1105-as-order-qr-scan`

**수정 전** (`app/(tabs)/scan.tsx:88-93`):
```ts
} else {
  setErrorMessage('Order not found');
  setTimeout(() => {
    scannedBarcodeRef.current = false;
  }, 2000);
}
```

**수정 후**:
```ts
} else {
  setTimeout(() => {
    scannedBarcodeRef.current = false;
  }, 2000);
}
```

ref 리셋 타이머(2000ms) 유지. `setErrorMessage('Order not found')` 1줄 삭제.

---

## 어설션 추가

**파일**: `scripts/m0-1105-as-qr-assertions.mjs` — 섹션 (4) scan.tsx 소스 검사 말미에 1줄 추가

```js
check('상품 바코드 미발견 — Order not found 오메시지 없음', !/setErrorMessage\('Order not found'\)/.test(scan));
```

수정 전: FAIL (해당 문자열 존재)  
수정 후: PASS

---

## 커밋

| 브랜치 | SHA | 설명 |
|--------|-----|------|
| `feat/m0-1105-as-order-qr-scan` (#100) | `72406e8` | fix(pos): scan.tsx 바코드 미발견 분기 Order not found 오메시지 삭제 · 어설션 1줄 추가 (M0-1105-AU) |

push: `origin/feat/m0-1105-as-order-qr-scan` → `72406e8` ✅

---

## #102 rebase 결과

브랜치 `feat/m0-1105-at-receipt-qr` (#102)를 새 `72406e8` 위로 rebase 완료.

```
8b48650 feat(pos): 영수증 QR — ReceiptCard SvgXml + ESC/POS GS v 0 raster · Sale/VOID/REFUND 공통 (M0-1105-AT)
72406e8 fix(pos): scan.tsx 바코드 미발견 분기 Order not found 오메시지 삭제 · 어설션 1줄 추가 (M0-1105-AU)  ← 새 베이스
0961bbb feat(pos): QR 생성 유틸(lib/qr.ts) + Scan 탭 QR 분기 (M0-1105-AS Round 1,3)
```

push: `--force-with-lease` → `origin/feat/m0-1105-at-receipt-qr` → `8b48650` ✅  
충돌: 없음 (clean rebase)

---

## run-all.mjs assertions 로그

```
==== ASSERTIONS · 43개 ====
  · m0-1105-as-qr-assertions.mjs ... PASS · 2.1s
  ... (전체 43개)
==== 요약 ====
  총 43 개 · 43 PASS · 0 FAIL · 19.2s
```

---

## 이연 순증감

| 항목 | 증감 |
|------|------|
| 어설션 1줄 추가 (Order not found 오메시지 없음 검사) | +1 |
| scan.tsx 1줄 삭제 (오메시지 setErrorMessage) | -1 |
| package-lock.json qrcode@1.5.4 lock (npm install 반영) | ± |
| 신규 이연 없음 | 0 |
