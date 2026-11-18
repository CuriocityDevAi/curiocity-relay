PR #371 · OK 무반응 원인 state-machine 이 paid 전에는 KEYPAD_OK 전환 규칙 없음 · 수정 O · 아이콘 교체 O · e2e 64/64 pass

# M3-1118-D — customer-display: OK 버튼 무반응 수정 + 지움 아이콘 교체

## PR
- CuriocityDevAi/storeport#371 — `fix/M3-1118-D-cd-ok-backspace` → `main`
- 커밋 `1d68a69` — 5 files, +162 -38
- 베이스는 `fix/M3-1118-B-cd-e2e-green` (#366) 위. #366 머지 후 자동 정리됨.

## 버그 ① — OK 무반응
**원인**: `apps/customer-display/src/lib/display-machine.ts` 의 `nextScreen()` 상태 머신에서 `KEYPAD_OK` 전환이 `snapshot?.snapshot_state === "paid"` 조건부로만 등록돼 있었음. 결제 완료 전(= 손님이 cart→keypad 로 들어와 번호를 입력하는 정상 흐름)에는 `KEYPAD_OK` 가 들어와도 매칭되는 규칙이 없어 `return stay(currentScreen)` 로 떨어지면서 화면이 `keypad` 에 그대로 머물러 있었음.

**현상 재구성**: 고객이 `0813-8044-2480` 입력 → OK → 아무 반응 없음. POS 쪽은 polling 으로 "Customer is entering number on display…" 상태만 보고 있었고 display 상태가 `paid` 로 flip 되기 전까지 평생 전환 불가능.

**#365 Hand-over 실패와의 관계**: 별도 버그. #365 는 cart → keypad 가 열리지 않거나 서버 contract 가 틀려 cart 가 갱신 안 되는 쪽. 이번 버그는 keypad 가 정상적으로 열린 뒤 OK 를 눌러도 다음 화면으로 못 가는 쪽. 연관은 없음(둘 다 commerce-core/POS 쪽 미해결 과제는 아님).

**수정** (`src/lib/display-machine.ts`):
- `keypad + KEYPAD_OK` → `consent` 전환 규칙 추가.
- `keypad + KEYPAD_SKIP` → `cart`(결제 중이면) 또는 `main` 전환 추가.
- `consent + KEYPAD_OK/SKIP` → `receipt`(paid) · `cart`(in-flight) · `main` 분기 추가.

**POS/commerce-core 수정 필요 없음**: 범위 내에서 완결. 애초에 이 버그는 customer-display 앱 내부 상태 머신 문제였음.

## 버그 ② — 지움 아이콘 교체
**원인**: 기존 지움 버튼은 React Native `View` 세 개(기울인 border + bar + `Text "×"`) 조합으로 그려진 composite 아이콘이었음. 폰트 베이스라인·web vs native 렌더링 차이 때문에 \< 모양처럼 보일 수 있었음.

**수정**:
- 신규 컴포넌트 `src/components/BackspaceIcon.tsx` — `react-native-svg` 두 Path 로 iOS 스타일 오각형 외곽 + 내부 × 렌더.
- `KeypadScreen.tsx` 양쪽(wide/narrow) 렌더에서 사용. 색은 `t.ink` 시맨틱 토큰. raw hex 금지.
- 기존 orphan StyleSheet (`delIconWrap`, `delChevron`, `delBar`, `delCross`) 제거.
- `react-native-svg` 는 이미 `package.json` 에 선언돼 있었고 `pnpm install` 로 node_modules 에 채워 넣음.

## 테스트 추가
- `src/lib/__tests__/display-machine.test.ts` — unit 5 개 추가 (`KEYPAD_OK before paid` describe block).
- `e2e/snapshots.spec.ts` — e2e 2 개 추가:
  - `keypad-ok advances to consent screen` — 번호 입력 → OK → `consent-screen` 노출 단언.
  - `keypad-del button renders backspace svg icon` — `svg` 안에 `path` 2개 렌더 단언.

잘못된 번호(8자리 미만 지역부분)에 대한 "안내 문구"는 UI 설계상 별도 toast/alert 가 아니라 OK 버튼이 disabled 로 떨어지는 방식임 — 이미 `keypad-ok-condition` 테스트가 해당 UX(7자리 disabled · 8자리 enabled)를 검증 중이므로 신규 테스트 추가 불필요.

## 결과 (로컬 실행)
- `pnpm test` (vitest) — **155/155 passed**
- `pnpm e2e` (playwright) — **64/64 passed, 8 skipped**(landscape viewport)
- `pnpm typecheck` — 통과
- `pnpm build` — 통과 (expo export 11 route 생성)

## 로그/스샷
- `/tmp/keypad-ok-to-consent.png` — OK 입력 후 consent 화면 전환 결과
- `/tmp/keypad-backspace-icon.png` — 새 backspace SVG 아이콘 렌더

## 범위 밖 발견
- `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts` 에 다른 작업자가 pre-staged 한 M0-1118-E 변경(items.detail.quantity 필드 누락 추가)이 있었음. **이번 PR 에는 포함하지 않음** — unstage 후 작업 디렉터리에만 남겨 둠.
- `apps/customer-display/screenshots/*.png` 은 e2e 재생성 과정에서 비트 레벨로 바뀌었으나 M3-1118-D 와 무관 → stage 하지 않음.
