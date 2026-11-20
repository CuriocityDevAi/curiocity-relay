원인 MTU=23 payload=20B 로 180B write 20B 뒤 drop · 청크 20바이트/20ms · native 변경 X · iPad 빌드 5a73b64e FINISHED · PR #219 · tests 22/22

## 작업 요약

**티켓**: M0-1120-E
**대상 PR**: [agilo-medusa-pos-fork#219](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/219) (`fix/M0-1120-E-ble-mtu-chunk`)
**부수**: PR #217 (feat/M0-1120-C-classic-spp) → **draft 전환 완료** (`gh pr ready 217 --undo` ✓)
**완료 시각**: 2026-11-20 17:52 KST

## 원인 확정

BT-58D (BLE adv 이름 `RPPO2N`/RPP02N) 는 BLE 기본 MTU=23 → 효과 payload=20B (BLE ATT header 3B). master 의 `lib/printer/ble.ts` 는 `WRITE_CHUNK_SIZE=180` 로 한 번에 write → characteristic 이 앞 20B 만 받고 나머지 드롭.

**바이트 재현** (buildTestReceipt 앞 20B):
```
INIT(1b 40) + ALIGN_C(1b 61 01) + BOLD_ON(1b 45 01) + "MEROS"(5B)
+ LF(0a) + BOLD_OFF(1b 45 00) + "Tes"(3B) = 정확히 20B
```
→ Kyu 실기 16:37 "MEROS / Tes" 지점 끊김과 바이트 단위 일치.

## 변경 (JS only)

| 파일 | 변경 |
|------|------|
| `lib/printer/escpos.ts` | `DEFAULT_WRITE_CHUNK_SIZE=20`·`REQUEST_MTU_BYTES=185`·`MAX_CHUNK_BYTES=182`·`WRITE_CHUNK_DELAY_MS=20` 상수 · `chunkSizeFromMtu(mtu)` pure 함수 |
| `lib/printer/ble.ts` | `negotiateMtu()`(Android `requestMTU(185)`) · `findWriteCharacteristic` 알려진 UUID (ISSC·FFE0/FFE1·FF00/FF02·18F0/2AF1) 우선 · `printBytes` chunk+지연+withResponse 폴백 |
| `lib/printer/receipt.ts` | `buildTestReceipt` → 품목 3·합계·결제·footer (200B+) 샘플 영수증 |
| `__tests__/m0-1120-e-ble-chunk.test.ts` | 신규 22 assertions (실기 fixture 포함) |

**native 변경**: 없음. 기존 development APK 그대로 **Metro reload 로 반영**. 신규 EAS 빌드 불필요.

**commit**: `315a3b8 fix(printer): M0-1120-E — BLE MTU 협상 · 20B chunk 전송 · withResponse 폴백`

## 테스트

| 스위트 | 결과 |
|--------|------|
| `__tests__/m0-1120-e-ble-chunk.test.ts` (신규) | **22/22 pass** |
| `tests/flows/m3-1118-j-printer.test.ts` (기존 프린터) | 20/20 pass · 회귀 없음 |
| `scripts/m2-1104-d-escpos-assertions.mjs` | 29/29 pass |
| `scripts/m2-1105-m-receipt-escpos-assertions.mjs` | 45/45 pass |
| 전체 vitest | 890/901 pass (실패 2건 = `m1-1117-e-slip-flow` · `splitview-capture` · master 기존 · 프린터 무관) |
| typecheck | 신규 에러 0 (master baseline 15건 그대로) |

## iPad dev build

- `5a73b64e-41d4-4aa4-93ba-3a25e4a60da6` (M0-1120-B · development · git `e3cd617`)
- 상태: **FINISHED** · 2026-11-20 08:36 UTC
- IPA: https://expo.dev/artifacts/eas/xWzpHIfzys8DElZ9DogGiDaBIrm2yOq7hE52xnPaoq0.ipa
- iOS 는 central MTU 자동 협상 · `requestMTU` no-op · 기존 JS 번들 그대로 Metro reload 로 반영.

## Kyu 실기 회부 (PR 본문 재명시)

OPPO / Redmi Pad 2 에서:
1. 이 PR 브랜치에서 Metro bundler 실행 (`npm start`)
2. 기존 development APK 를 흔들어 "Reload" 또는 앱 재시작
3. `/settings/printer` → `RPPO2N`/`RPP02N` 선택 → "Test print"
4. 기대: "MEROS / Test Print / 날짜 / 품목 3줄 / Subtotal / TOTAL / Payment / TEST OK / Thank you!" 전체 인쇄
5. 결제 완료 → success 화면 → 자동 인쇄 (동일 chunk 경로) 끝까지 인쇄 확인

iPad: `5a73b64e` IPA 설치 후 동일.

## /loop · 예약 금지 준수

`ScheduleWakeup` · `/loop` 미사용. 60분 상한 내 완료 (17:40 ~ 17:52 KST).
