# M3-1105-AH Report

## 충돌 표

| 위치 | HEAD (#77 squash) | #80 커밋 (7992908) | 해소 방식 |
|---|---|---|---|
| `ReceiptCard.tsx:136-142` | `watermark = kind==='refund'\|\|'void' ? refund_watermark : ...` (void/refund 에 watermark 적용) | `watermark = kind==='reprint' ? copy_watermark : null` + 배너 변수 별도 | #80 배너 방식 채택 · watermark 는 reprint 전용 |
| `ReceiptCard.tsx:148` | (없음) | `refundBanner = kind==='void' ? 'VOID' : kind==='refund' ? 'REFUND' : null` | #77 kind 우선순위(refund→void) 보존으로 순서 변경: `kind==='refund' ? 'REFUND' : kind==='void' ? 'VOID' : null` |

## 어설션 숫자

- `m3-1105-af-assertions.mjs` — **30/30** pass
- `m3-1105-a-color-assertions.mjs` — **37/37** pass (JSX 블록 주석 오탐 수정 후)
- run-all assertions 사전 존재 실패 (내 변경 무관): m3-1105-ad 55+2f · m3-1105-ae 1f · m3-1105-d 3f · m3-1105-x 1f (master 동일)

## 스크린샷 경로

- `screenshots-m3-1105-af/01-ipad-receipt-void.png`
- `screenshots-m3-1105-af/02-ipad-receipt-refund-partial-cash.png`

## 이연 순증감

없음 (사전 존재 실패 4건은 master 기준 동일 · AH 범위 외).

## 착지 명령

```
cp /tmp/M3-1105-AH-report.md ~/projects/curiocity-relay/m3/ && cd ~/projects/curiocity-relay && git add m3/M3-1105-AH-report.md && git commit -m "m3: M3-1105-AH" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M3-1105-AH done "rebase·충돌·APPROVAL중복·JSX오탐 수정 — af 30/30 · 색검사 37/37"
```
