fork #194 CHANGES · 타임아웃 후 정리 X(connect) · 권한 안내 O(단, 첫 거부 경로 불가) · success 화면 무변경 O

## 리뷰 대상

PR #194 `fix/M3-1118-J-printer-followup` — BLE 타임아웃 · 권한 거부 안내 · 0대 안내

## REQ-1: 연결·쓰기 타임아웃 — CHANGES

### 연결 타임아웃 후 cancelConnection 미호출 (버그)

`printBytes` 에서 `connectToDevice` 가 타임아웃되면 `device` 는 `null` 그대로 남는다.
`finally` 블록에서 `if (device)` 가 false → `cancelConnection()` 미호출.
`connectToDevice` 의 내부 Promise 는 계속 실행되어 나중에 resolve 되면 dangling 연결이 남는다.
다음 인쇄 시도가 "이미 연결됨" 상태로 막힐 수 있다.

```ts
// lib/printer/ble.ts (현재)
device = await withTimeout(mgr.connectToDevice(...), CONNECT_TIMEOUT_MS, 'connect-timeout');
// 타임아웃 → device = null → finally: cancelConnection() 미호출
```

**수정 제안**: `withTimeout` 내부 타임아웃 path 에서 `mgr.cancelDeviceConnection(printerId)` 를 호출하거나,
`finally` 에서 `printerId` 기반으로 연결 해제를 보장.

### 쓰기 타임아웃 후 연결 해제 — OK ✅

쓰기 타임아웃 시 `device` 가 non-null 이므로 `finally: cancelConnection()` 정상 호출. ✅

### printBytes false 반환 → Retry 경로 — OK ✅

`catch {}` 에서 `false` 반환. 호출 측(`lib/printer/index.ts`) 도 boolean 반환.
success 화면의 "Reprint" 버튼(P2 stub — P3 통합 예정)으로 재시도 가능. 결제 플로우 차단 없음. ✅

## REQ-2: 권한 거부 구분 — CHANGES (로직 불일치)

### 첫 거부 → unauthorized-permanent 오분류 (버그)

`scanForPrinters` 에서 `BLE_ASKED_KEY` 를 시스템 프롬프트 **이전**에 저장:

```ts
// lib/printer/ble.ts scanForPrinters
await SecureStore.setItemAsync(BLE_ASKED_KEY, '1').catch(() => {}); // ← key 먼저 설정
// ... BLE 스캔 시작 → 시스템 프롬프트 표시
```

사용자가 처음 거부하면 `BLE_ASKED_KEY` 가 이미 `'1'` → `bleAvailability()` 가 `unauthorized-permanent` 반환.
PR 설명("첫 거부: Scan 버튼 활성 + 안내 텍스트")과 실제 동작 불일치.
정상적 사용 flow 에서 `unauthorized` 상태는 사실상 도달 불가.

**수정 제안**: `BLE_ASKED_KEY` 설정 시점을 "스캔 완료 후" 또는 "`bleAvailability` 에서 Unauthorized 첫 감지 시"로 이동.

예시:
```ts
// bleAvailability 내 Unauthorized 처리
if (state === 'Unauthorized') {
  const asked = await SecureStore.getItemAsync(BLE_ASKED_KEY).catch(() => null);
  if (asked) return { ok: false, reason: 'unauthorized-permanent' };
  await SecureStore.setItemAsync(BLE_ASKED_KEY, '1').catch(() => {});
  return { ok: false, reason: 'unauthorized' };
}
```

### 영구 거부 UI — OK ✅

`isPermanentlyDenied` 분기 · "Bluetooth permission is off — Settings > Apps > Meros POS > Permissions" ·
`Linking.openSettings()` 버튼 · Scan 버튼 비활성 ✅

### Open Settings 버튼 — OK ✅

## REQ-3: 0대 안내 — OK ✅

기존 `Alert.alert('No printers found', ...)` + `list.length === 0` 로직 유지. 테스트 커버 ✅

## REQ-4: typecheck — OK ✅

`lib/printer/ble.ts`, `app/settings/printer.tsx` 에 신규 타입 에러 없음.
(`BleAvailability` 열거 exhaustive switch — 테스트 내 컴파일 타임 검증 포함.)
기존 에러(e2e Playwright, `@constants/brand`, `CustomerLinkSheet` 등)는 pre-existing; 이번 PR 범위 외.

## REQ-3: app/checkout/success/* 무변경 — OK ✅

PR 변경 파일: `lib/printer/ble.ts`, `app/settings/printer.tsx`, `tests/flows/m3-1118-j-printer.test.ts` 만.
`app/checkout/success/` 변경 없음 — M0-1118-N 충돌 없음. ✅

## 테스트 결과

```
vitest run tests/flows/m3-1118-j-printer.test.ts
Test Files  1 passed (1)
Tests  15 passed (15)
Duration  404ms
```

## 결론

**CHANGES 요청 2건:**
1. 연결 타임아웃 후 dangling BLE 연결 가능성 — `cancelConnection` 보장 필요
2. `BLE_ASKED_KEY` 설정 타이밍 버그 — 첫 거부 시 `unauthorized-permanent` 오분류
