---
round: M2-1105-M
pr:
  fork: agilo-medusa-pos-fork#51
commit: 9366c00cbe3e03551c1ef0df74c2ba5f4c8d53a9
outcome: Receipt snapshot → ESC/POS 렌더러 신설 · 39 단위 어설션 · CI 전부 green · 머지 가능
kyu_checks: 0 (lib/printer + docs + scripts 만 · 결제 UI 미건드림)
ci_run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42350805138
ci_duration_s: 327
lint_run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42350805140
lint_duration_s: 62
---

# M2-1105-M · Receipt snapshot → ESC/POS 렌더러

**일자**: 2026-11-07 · **허브**: M2 · **상대 리포**: `agilo-medusa-pos-fork` · **base**: `master = bc3c0e4` · **open-requirements.md**: §다음 · 영수증 v2 (로고 · SC/PB1 줄 포함)

## 1. 산출물

| 파일 | 변경 | 라인 |
|------|------|------|
| `lib/printer/receipt-escpos.ts` (신규) | `renderReceiptEscPos(receipt)` + `escposBytesToText` 디코더 | 182 |
| `lib/printer/index.ts` | `printReceipt(receipt)` export (BLE 재사용 · fail-open) | +16/-2 |
| `scripts/m2-1105-m-receipt-escpos-assertions.mjs` (신규) | 39 어설션 · 10 블록 | 180 |
| `docs/testing/receipt-escpos-sample.txt` (신규) | 렌더 텍스트 스냅샷 (자동 갱신) | 17 |
| `docs/testing/receipt-escpos.md` (신규) | 설계 메모 · 레이아웃 · 어설션 커버리지 | 93 |

**제품 코드 미수정** (`app/**` · `components/**` · `api/**` 그대로). Settings `Test print` 미건드림 · success 화면 Reprint 미배선 (M3 소유 · 후속).

## 2. 렌더 결과 (스냅샷 텍스트)

`docs/testing/receipt-escpos-sample.txt` (어설션이 자동 생성):

```
MEROS
Jakarta Main
Jl. Melati 1
--------------------------------
No. R-261107-0001
Date 2026-11-07 17:15 WIB
Order #42
--------------------------------
Cheese Bread
  1 x IDR 95,000      IDR 95,000
--------------------------------
Subtotal              IDR 95,000
TOTAL                 IDR 95,000
--------------------------------
CASH                  IDR 95,000
Received             IDR 100,000
Change                 IDR 5,000
--------------------------------
Thank you
```

Service charge + PBJT 변형 (어설션 §7 fixture):
```
Service charge        IDR 9,500
PBJT                  IDR 9,500
TOTAL                IDR 114,000
```

## 3. 어설션 (39/39 PASS · BLE 없이)

```
--- (1) 32자 폭 가드 ---                   2/2
--- (2) 필수 줄 (store/No./Date/Order/품목/Subtotal/TOTAL/CASH/Received/Change/footer) ---  12/12
--- (3) 금액 포맷 "IDR N,NNN" ---          5/5
--- (4) UTF-8 안전 (ASCII only) ---        2/2
--- (5) 반올림 줄 없음 ---                 2/2
--- (6) ESC/POS cut 바이트 (GS V B n) ---  1/1
--- (7) Service charge + PBJT 분기 ---     5/5
--- (8) tax.show=false 숨김 ---            2/2
--- (9) card / qris tender 분기 ---        6/6
--- (10) 긴 품목명 wrap ---                2/2

39/39 passed · 0 failed · 0.5s
```

fixture: `fixtures/pos-receipt-response.json` (M3-1105-H 고정 · 수정 안 함) + inline 변형 4종.

## 4. 설계

- **snapshot-first**: 서버 `GET /admin/pos/receipts/:id` 의 Receipt (`types/receipt.ts`) 를 **그대로** 입력. 필드 유도/보정 없음.
- **58 mm / 32 col**: `escpos.ts` 의 `COL_WIDTH_58MM` 사용. 긴 품목명은 단어 경계 wrap · 폭 초과 줄 0 보장.
- **라벨 = snapshot.labels** (서버 영어 라벨 ADDENDUM §2 M3-1105-K 확정).
- **반올림 줄 없음**: 서버 snapshot 이 최종 금액.
- **로고 자리 = 텍스트 fallback** · `logo_mode='mark'|'wordmark'|'full'` 전부 bold center `store.name` (mark 는 첫 글자). 비트맵 (`GS v 0`) 은 후속.
- **service_charge = defensive optional** · `types/receipt.ts` 에 아직 없어 renderer 레벨에서 `SnapshotWithServiceCharge` 확장 타입 수용 (타입 파일 미건드림).
- **상대 import** (`../../types/receipt`): 단위 어설션 tsc 가 `@/` alias 리졸브 못해 이 파일만 상대 경로.

## 5. 검증 로그 요약

| 체크 | 결과 |
|------|------|
| `node scripts/m2-1105-m-receipt-escpos-assertions.mjs` | **39/39 PASS** · 0.5s |
| `node scripts/run-all.mjs assertions` | **14/14 PASS** · 1.7s |
| `npx expo export -p web` | BUILD SUCCEEDED |
| `node scripts/run-all.mjs playwright` | **13/13 PASS** · 147s |
| isolated `npm ci --legacy-peer-deps` | exit 0 |
| `npx tsc --noEmit` | clean (기존 CSS 경고만) |
| fork CI `Lint` | ✓ **62s** |
| fork CI `assertions + playwright` | ✓ **5m23s** (327s) |

## 6. BLE 흐름 재사용

`printReceipt(receipt)` 는 `printBytes(renderReceiptEscPos(receipt))` 로 기존 BLE 경로 그대로 사용:
- iPad dev-client + 페어링된 BT-58D: `true` (실제 전송)
- 시뮬 · Expo Go · 웹: `false` (`bleAvailability.ok===false` · fail-open)
- 에러 시 throw 하지 않음 · 호출자 (M3 영수증 화면 후속) 는 반환 boolean 만 봄

## 7. 범위 밖 (후속)

- M3 success/orders 화면의 Reprint 버튼 → `printReceipt` 배선 (M3 소유)
- WA 영수증 공유 (프린터 전 · open-requirements.md 상단)
- 비트맵 로고 (`GS v 0`) · 프린터 실측 뒤
- 한글 코드페이지 (ESC t · 필요 시)
- M2-1104-D 의 구 `receipt.ts` 폐기 · 신규 렌더러로 스위치 (후속 라운드)

## 8. 참고

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/51
- 브랜치: `feat/m2-1105-m-receipt-escpos` · 커밋 `9366c00`
- CI 런: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42350805138 (5m23s)
- Lint 런: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42350805140 (62s)
- 선행: M3-1105-H (receipt 서버 shape 확정) · M2-1104-D (ESC/POS 빌더) · M2-1105-H (iOS 시뮬) · M2-1105-L (tunnel fix)
