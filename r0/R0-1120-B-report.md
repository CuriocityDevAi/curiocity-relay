#213 APPROVE · pos_screen 서버 제공 O · tests 845/856(+10신규) · #212 APPROVE · neverForLocation O

## 환경

- 리포: CuriocityDevAi/agilo-medusa-pos-fork
- 검증일: 2026-11-20
- CI 결제 문제로 로컬 실행 근거

---

## PR #213 — fix(pos): M2-1120-B+C

### 코드 판독 결과

| 항목 | 결과 |
|------|------|
| "Print failed · Retry" 버튼 삭제 | O — orderId.tsx 에서 완전 제거 확인 |
| printFailed 시 `text-warning` 시맨틱 토큰 | O — `<Text className="text-sm text-warning" testID="print-failed-hint">Printer not connected</Text>` |
| Next customer 헤더 우상단 (headerRight) | O — `Stack.Screen headerRight` + `Math.floor(windowWidth / 3)` + `numberOfLines={1}` |
| Ask phone이 Hand over 아래 + 상태카드 위 | O — SuccessReceiptAnim 에서 Hand over 버튼(line 156) 바로 다음 블록(line 163~) |
| entering 판정: pos_screen=loyalty_entry AND diff≤15s | O — `snapshot.pos_screen === 'loyalty_entry'` 조건 필수화 완료 |
| offline 표시 (badge.kind==='offline') | O — `Customer display offline` (회색 `text-ink-muted`) |
| pre_entry=true → connected 즉시 표시 | O — `if (snapshot?.pre_entry)` 직접 판정 블록 추가 (pre_entry guard가 classifyCustomerDisplay 앞에 위치) |

### pos_screen 서버 제공 여부

- **O (제공됨)** — storeport-m1-U 확인
  - `serializeSnapshot()` 반환 DTO에 `pos_screen: snapshot.pos_screen ?? null` 명시 (lifecycle.ts:118)
  - 모델에 enum 컬럼으로 정의 (M0-1118-J · R1)
  - `GET /admin/pos/registers/:id/snapshot` 경로에서 DTO 그대로 반환

### 테스트 결과

- **PR #213 브랜치**: `Test Files 2 failed | 65 passed (67)` / `Tests 2 failed | 845 passed | 6 expected fail | 3 todo (856)`
- **master 베이스라인**: `Test Files 2 failed | 64 passed (66)` / `Tests 2 failed | 835 passed | 6 expected fail | 3 todo (846)`
- **신규 테스트**: +10 cases (loyalty-snapshot.test.ts M2-1120-C 블록 6건 + m2-1120-b-link-card-state.test.ts 4건)
- **신규 실패 없음**: 2 fail은 m1-1117-e (2건) + splitview-capture.spec.ts (import 오류) — master에도 동일하게 존재하는 known fail

### tsc 결과

- PR #213 변경 파일에 직접 귀속되는 신규 타입 오류 없음
- 기존 pre-existing 오류 (playwright 모듈 없음, FlashList 타입, global.css side-effect import 등) 는 master에도 존재

### 판정: APPROVE

근거:
1. 모든 필수 항목(Print failed 제거, 시맨틱 토큰, headerRight 배치, Ask phone 이동, entering 로직, offline 표시, pre_entry 직접 판정) 코드 확인 완료
2. pos_screen 서버 제공 확인 — entering 판정이 실제로 작동할 수 있음
3. 신규 테스트 10건 all pass, 신규 실패 0건

---

## PR #212 — feat(android): M1-1120-A

### 코드 판독 결과

| 항목 | 결과 |
|------|------|
| orientation landscape 변경 | O — app.json `"orientation": "landscape"` |
| BLUETOOTH_SCAN + neverForLocation | O — ble-plx 플러그인(`neverForLocation: true`)이 단독 처리 |
| AndroidManifest 중복 없음 | O — `BLUETOOTH_SCAN` 1회만 등장, `app.json` permissions 배열에는 미포함 (ble-plx 플러그인 위임) |

### prebuild 검증 (npx expo prebuild --platform android --no-install)

```
grep BLUETOOTH_SCAN android/app/src/main/AndroidManifest.xml
→ <uses-permission android:name="android.permission.BLUETOOTH_SCAN"
     android:usesPermissionFlags="neverForLocation" tools:targetApi="31"/>
count: 1
```

### 테스트 결과

- `Test Files 2 failed | 64 passed (66)` / `Tests 2 failed | 835 passed`
- master와 동일 — 신규 실패 없음 (PR #212는 app.json 1줄 변경)

### 판정: APPROVE

근거:
1. `orientation: "landscape"` 정확히 설정
2. BLUETOOTH_SCAN은 ble-plx 플러그인이 `neverForLocation: true`로 단독 처리, app.json permissions 배열에 별도 추가 없어 중복 없음
3. prebuild 후 AndroidManifest에서 `neverForLocation` 포함 1회 확인
4. 테스트 신규 실패 0건

---

## 요약

| PR | 판정 | pos_screen | tests | neverForLocation |
|----|------|------------|-------|-----------------|
| #213 | APPROVE | O (서버 제공 확인) | 845/856 (+10 신규, known fail 동일) | N/A |
| #212 | APPROVE | N/A | 835/846 (동일) | O (1회, 중복없음) |

CI 결제 문제로 로컬 실행 근거.
