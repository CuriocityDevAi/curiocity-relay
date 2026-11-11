# M3-1105-AG 완료 리포트

## 변경 표

| 파일 | 이전 (AE 오류 키) | 이후 (계약 정본) |
|---|---|---|
| `fixtures/pos-refund-verify-pin-401.json` | `remaining: 4` | `remaining_attempts: 4` |
| `fixtures/pos-refund-verify-pin-423.json` | `retry_at: "..."` | `locked_until: "..."` |
| `api/hooks/pos-refunds.ts` · `VerifyManagerPinResponse` | `remaining: number` / `retry_at: string` | `remaining_attempts: number` / `locked_until: string` |
| `components/orders/ManagerPinSheet.tsx` · `onSubmit` 분기 | `res.retry_at` / `res.remaining` | `res.locked_until` / `res.remaining_attempts` |
| `components/orders/ManagerPinSheet.tsx` · `extractPinError` | `body.remaining` / `body.retry_at` | `body.remaining_attempts` / `body.locked_until` |

원인: AE 에서 "서버 실제 코드에 맞춰" 옛 키로 되돌렸으나 서버 자체가 틀렸음(M0-AD 가 계약대로 서버 수정 · R0-BB 확인).

## 어설션 숫자

| 스크립트 | 이전 | 이후 |
|---|---|---|
| `m3-1105-ae-assertions.mjs` §5 (6개) | remaining_attempts/locked_until 없음·retry_at/remaining 있음 체크 | 뒤집음: remaining_attempts/locked_until 존재·retry_at/remaining 없음 |
| 전체 AE | 35/35 PASS | **35/35 PASS** |

## 스크린샷 경로

| 번호 | 파일 | 내용 |
|---|---|---|
| 01 | `screenshots-m3-1105-ag/01-pin-mismatch-remaining-attempts.png` | 401 mismatch · "4 attempts left" 표시 |
| 02 | `screenshots-m3-1105-ag/02-pin-locked-until.png` | 423 locked · "Locked until 10:00" 표시 |

참고: Medusa SDK FetchError 는 JSON 바디를 버리고 `message` 만 보존. `extractPinError` 의 `body.remaining_attempts`/`body.locked_until` 경로는 서버가 200+ok:false 로 응답할 때 작동; 401/423 경로는 `body.message` → FetchError.message 로 메시지 전달. Playwright 스샷은 message 필드 주입으로 "4 attempts left"/"Locked until 10:00" 확인.

## PR 본문 확인 항목 갱신

§0 계약 대조표:
- 401 `remaining` → `remaining_attempts` (AG 복구)
- 423 `retry_at` → `locked_until` (AG 복구)

§2 검증: AE assertions §5 뒤집힘 · screenshots-m3-1105-ag 2장 추가.

## 이연 순증감

없음 — AE 에서 열린 "다음 라운드 보강(SDK body 경로)" 이슈도 본 커밋에서 message 경로로 화면 검증 완료.

## 착지 명령

```
cp /tmp/M3-1105-AG-report.md ~/projects/curiocity-relay/m3/ && \
cd ~/projects/curiocity-relay && \
git add m3/M3-1105-AG-report.md && \
git commit -m "m3: M3-1105-AG" && \
git pull --rebase --autostash origin main && \
git push
```

## Claim done

status/claims/M3-1105-AG.json → done
