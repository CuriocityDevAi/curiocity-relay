# M3-1105-AD · P6 앱 1차 보고 (2026-11-10)

원장: `ledger/decision-p6-20261110.md` (Kyu 11-10 15:43). 계약: `queue/m0/M0-1105-AB.md` §0~§4 (M0 아직 작업 중 — 머지 뒤 fixture 교정 필요하면 1줄).

## 착지
- 브랜치: `feat/m3-1105-ad-refund-void-sheets` (origin/master 최신).
- PR: 아래 open 명령 뒤 URL 삽입.

## 새 파일 — 기존 파일 수정 0 (파일 주인 준수, 특히 `app/orders/[orderId].tsx` 는 #75 영역이라 건드리지 않음)
- `lib/refund-rules.ts` — 순수 함수. `OriginalTender × sameShift` → `RefundPlan { action('void'|'refund'), options[] }`. CARD = `card_terminal` 기본 + "Terminal failed — refund in cash" 보조 · CASH/QRIS = cash 전용 · PIN 필요 여부가 표의 1급 필드. `buildRefundBody` 는 서버 계약 body shape 둘(`card_terminal` + 6자리 / `cash` + 4자리 PIN) 로 좁혀 반환.
- `api/hooks/pos-refunds.ts` — `useVerifyManagerPin` · `useVoidOrder` · `useRefundOrder`. 셋 다 `onSettled` 에서 `['orders']` invalidate (성공/실패 모두).
- `components/orders/ManagerPinSheet.tsx` — 4칸 숫자 입력 · 자동 다음 칸 (backspace 역방향) · `number-pad` + `secureTextEntry` · 틀리면 reanimated shake + 빨강 테두리 + "N attempts left" · 잠금이면 "Locked until HH:MM" + 입력 비활성 · ink 결정 버튼.
- `components/orders/VoidRefundSheet.tsx` — 주문 요약 (No. · 금액 · 원거래 수단) → method OptionChip 탭 → card_terminal 6자리 승인번호 입력 or cash → PIN 시트 → ink `Void`/`Refund` 버튼 → 성공 시 `showToast.success` (open_drawer=true 면 `text2: "Open the cash drawer and give IDR X"`) · 실패 `showToast.error`.
- `fixtures/pos-refund-{verify-pin-200|-401|-423, void-card-terminal-200, void-cash-200, refund-cash-200, refund-409}.json` — M0-1105-AB §0 shape 기준. M0 정본과 다르면 머지 뒤 1줄.
- `scripts/m3-1105-ad-assertions.mjs` — 아래 어설션 셋.

## 색 하드룰
- 두 시트 소스 raw hex `0` (어설션 (3) 검증). 모든 색은 `bg-ink`, `border-line`, `border-danger`, `text-ink-subtle` 등 토큰 className 로만.
- 결정 버튼(`Verify` · `Void`/`Refund`) = 공용 `Button` default variant='solid' → `bg-ink`.
- 선택 탭(method chip) = `OptionChip variant='tab'` → 선택 시 차콜(`bg-selected` 토큰).

## 캡슐 토스트
- `components/ui/toast` 의 `showToast.success/error` 만 사용. 두 시트에서 `Toast.show(` 직접 호출 `0` (어설션 (4) 검증 · #73 표준).

## 어설션 — `scripts/m3-1105-ad-assertions.mjs` · 50/50 PASS
1. 규칙 표 전 조합 — `(cash|card|qris) × (same|next shift)` 6조합 각각 actionLabel + option 메서드 순서 일치.
2. `buildRefundBody` 결과가 계약 body 와 deep-equal (`{method:'card_terminal', terminal_approval_code}` · `{method:'cash', manager_pin}`).
3. 두 시트 raw hex `0`.
4. 두 시트 `Toast.show` 직접 호출 `0` + `showToast` import/사용 확인.
5. 새 파일 7개 존재 + 기존 `app/orders/[orderId].tsx` git diff 없음 (#75 영역 보호).
6. fixture 7개 전부 JSON 유효 + 계약 shape (200 ok/401 remaining_attempts/423 locked_until/open_drawer 토글/409 english message).

## run-all 회귀
- `node scripts/run-all.mjs assertions` → 26/26 PASS (26.7s).

## typecheck / lint
- `npx tsc --noEmit` — 내 파일 오류 0 (pre-existing `global.css` 경고만 잔존).
- `npx expo lint --fix` — 네 파일 모두 prettier 정렬 통과. `react-hooks/set-state-in-effect` 경고 3건 (useEffect 안 reset 패턴) — 저장소 다른 시트에도 동일 패턴 (수용 가능한 상태 리셋). 경고만.

## Playwright 스샷 · ⚠ 미검증
- 이번 라운드 scope = **새 파일만** · 주문 상세에서 두 시트를 여는 경로 없음 → 단독 데모 라우트/스토리북 필요. 새 route 추가는 파일 주인 범위를 벗어나 보류.
- **미검증** 명시 · 실기 검증은 다음 라운드 (`app/orders/[orderId].tsx` 연결 뒤) 때 함께 iPad 실기 + Playwright 각 3장 (카드 승인번호 · PIN 틀림 · 현금 안내).

## 다음 라운드 · 꼭 할 것
1. **주문 상세 연결** — `app/orders/[orderId].tsx` #75 머지 뒤 Void/Refund 트리거 버튼 + 시트 인스턴스 연결. 수단·교대 계산은 서버 응답에서 derive.
2. **M0-1105-AB 계약 대조** — fixture URL/필드/에러 shape 이 서버 정본과 어긋나면 fixture + 훅 request body 1~2줄 교정.
3. **iPad 실기 + Playwright 3장** — 카드 승인번호 · PIN 틀림 흔들림 · 현금 안내 토스트.

## 선택지 3줄 (PR 본문 반복)
- **① 보이드/환불 action 결정 위치** · (a) 클라에서 `sameShift` 로 분기 (채택) · (b) 서버 단일 엔드포인트 → 서버가 자동 판별. 이유 = M0 계약이 `/void` 와 `/refund` 를 분리했기에 클라가 분기해야 URL 선택 가능.
- **② PIN 시트 열림 흐름** · (a) 사용자 "Void" 누르면 PIN 시트 열림 → 성공 뒤 server call (채택) · (b) 바로 PIN 입력받는 단일 시트. 이유 = card_terminal 경로가 PIN 없이 가는데 분리해야 재사용성 + 한 번에 네트워크 1회.
- **③ 토스트/실패 shape** · (a) `showToast.*` 캡슐 통일 + `text2` 로 drawer 안내 (채택) · (b) 별도 Dialog. 이유 = #73 캡슐 토스트 기준선 + Kyu 11-10 결정 "drawer 안내도 캡슐 내".

## 착지 명령
```
cp /tmp/M3-1105-AD-report.md ~/projects/curiocity-relay/m3/ && cd ~/projects/curiocity-relay && git add m3/M3-1105-AD-report.md && git commit -m "m3: M3-1105-AD" && git pull --rebase --autostash origin main && git push
```
- claim done (relay CLI 미설치 환경 — claim 파일은 상위 환경에서 처리).
