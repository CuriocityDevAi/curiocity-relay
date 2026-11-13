# M3-1105-BQ 리포트 — react-native-view-shot SDK 58 버전 맞춤

## 버전 전→후

| 패키지 | before | after |
|---|---|---|
| `react-native-view-shot` | `^3.8.0` | `6.1.1` |
| `expo-sharing` | `~58.0.2` | `~58.0.23` |

**방법**: `npx expo install react-native-view-shot expo-sharing`

## `npx expo install --check` 결과
두 패키지 모두 불일치 목록에 **없음** (pre-existing 불일치 15건은 이번 범위 밖).

## API 변경 영향 (3.x → 6.x)

- `ViewShotRef` 타입이 `React.ComponentRef<typeof View> & { capture: () => Promise<string> }` 로 명시됨 → `receipt-share.ts`의 `{ capture: () => Promise<string> }` 구조적 호환.
- `NativeModules.RNViewShot` 존재 체크 패턴 그대로 유지.
- 옛 dev client 텍스트 폴백 제거 않음 (R2 Kyu 결정 Q1).
- **`lib/receipt-share.ts` 수정 없음.**

웹 엔트리 `RNViewShot.web.js`에 `html2canvas-pro` 옵셔널 lazy import 추가됨 → optional peerDep이고 dynamic import라 번들에 영향 없음. 아래 웹 번들 가드에서 확인.

## 자기 검증

| 항목 | 결과 |
|---|---|
| `npx expo install --check` (두 패키지) | 불일치 0 |
| `npm run lint` | 0 errors, 44 warnings (기존 pre-existing) |
| `npx vitest run` | 16 files passed, 174 passed, 0 failed |
| `npx expo export -p web` | 성공 (dist/ 생성) — 번들 가드 통과 |

## head SHA
`8a97f96729e8b096bc6c403a8429f0a9dffd3f86`

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/126
