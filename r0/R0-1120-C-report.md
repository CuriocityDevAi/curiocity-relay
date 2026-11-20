#405 APPROVE · 옛 id 늦은 응답 되돌림 X · tests 227/227 · CI heavy-mac pass / heavy-cloud skipping / check pass

## 검토 대상

- PR #405 `fix(customer-display): M0-1120-A — Next customer 후 CD main 복귀`
- commit `be1a53b`
- 브랜치: `fix/M0-1120-A-cd-next-customer-seq-guard`

## 변경 요약

`display-machine.ts` seq rewind guard 에 `rawSnapshot.id === prevSnapshot.id` 조건 추가.

```typescript
// 변경 전
if (
  isTick &&
  rawSnapshot &&
  prevSnapshot &&
  typeof rawSnapshot.seq === "number" &&
  typeof prevSnapshot.seq === "number" &&
  rawSnapshot.seq < prevSnapshot.seq
)

// 변경 후
if (
  isTick &&
  rawSnapshot &&
  prevSnapshot &&
  rawSnapshot.id === prevSnapshot.id &&   // ← 추가
  typeof rawSnapshot.seq === "number" &&
  typeof prevSnapshot.seq === "number" &&
  rawSnapshot.seq < prevSnapshot.seq
)
```

## TypeScript

`pnpm typecheck` → 에러/경고 0건 (clean pass).

## Vitest

`pnpm test` → **12 파일 · 227 테스트 모두 pass (0 fail).**

신규 테스트 6개 추가:
- cart / keypad / qris / receipt / done 중 Next customer → main (5개)
- 같은 id · 낮은 seq 진짜 stale drop 유지 (1개)

## Probe A — 같은 id · 늦은 응답(진짜 stale) 여전히 drop 되는가

YES, 회귀 없음.

조건 `rawSnapshot.id === prevSnapshot.id` 가 true 이면 기존 drop 로직 그대로 동작.
신규 테스트 "같은 id 로 seq 가 되돌아오는 진짜 stale 응답은 여전히 drop" 으로 검증.

## Probe B — 옛 id · 늦은 응답이 새 idle 뒤에 도착할 때 되돌아가는가

**X (되돌아가지 않는다) — 실질적으로.**

이론적 경로: id=A(옛) 응답이 guard 를 통과한 뒤 `pos_screen=cart_building` 으로 라우팅되면
"cart" 로 전환될 수 있다. 그러나 이 경로는 아래 이유로 실제 발생하지 않는다.

1. **서버가 즉시 expire**: `nextCustomerForRegister` 실행 즉시 옛 snapshot(id=A)의
   `snapshot_state` 를 `expired` 로 변경한다. 이후 모든 poll 응답에서 id=A 는
   `expired` 로 반환 → Rule I(`expired → main`) 적용. 따라서 guard 통과 후에도
   최종 screen 은 "main" 이다.

2. **순차 폴링**: `useDisplayMachine` 의 폴링은 `setInterval + async tick` 구조로
   대부분 순차적으로 동작한다. id=B(새 idle)를 받아 state.snapshot 이 갱신된 시점부터
   서버는 이미 id=A 를 expire 한 상태이므로, 그 이후 poll 에서 non-expired id=A 가
   돌아올 경로가 없다.

3. **Rule E 보호**: `currentScreen` 이 terminal flow(`receipt/done/keypad-after/consent`)
   일 때는 다른 id 의 checkout 스냅샷을 무시한다. 단 `currentScreen = "main"` 이면
   이 보호는 적용되지 않는다 — 이 점이 이론적 취약 지점이지만, 위 1·2 로 차단된다.

결론: 옛 id 늦은 응답이 화면을 되돌리는 실제 경로가 없다.

## CI 상태

| Check | 결과 |
|---|---|
| heavy-mac | pass (20m 8s) |
| heavy-cloud | skipping |
| changes-filter | pass |
| check | pass |
| markers-and-forbidden | pass |
| route | pass |

## 판정

**APPROVE**

수정 로직이 명확하고 최소 범위이다. 5개 상태 회귀 테스트 + stale drop 유지 테스트가
모두 추가됐으며 227/227 통과. CI heavy-mac pass. Probe B 이론적 취약 지점은
서버 즉시-expire 동작으로 실질적으로 차단된다.
