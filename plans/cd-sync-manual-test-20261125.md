# CD ↔ POS 동기화 — 실기 테스트 준비 (2026-11-25)

정본 흐름: `ledger/decision-cd-pos-sync-flow-20261125.md`  
계약서: `plans/cd-sync-contract-20261125.md` v1.2  
대상 커밋: POS fork e5d2116 (#266) · CD storeport 7b8badf (#446) · 서버 1f2ab94 (#445, 운영 배포 완료)

---

## 1. 기기 반영 방법

### 1-1. POS 앱 (fork — agilo-medusa-pos-fork)

**판정: OTA 가능**

근거:
- `app.json` `runtimeVersion: "1.0.0"` — 고정 문자열. PR #266 변경 파일은 `.ts`/`.tsx` 전부(JS 번들)이며 `package.json`·`app.json`·`app.config.js` 무변경 → 네이티브 모듈 diff 없음.
- `expo-updates ~58.0.21` 설치됨.
- `extra.eas.projectId: "0ed85e16-4459-4094-afc5-29e3e8d6803f"` → EAS Build 시 `updates.url` 자동 주입. 기설치 바이너리는 EAS 채널을 폴링함.
- `eas.json` build.production `channel: "production"`.

```
cd ~/projects/agilo-medusa-pos-fork
git pull origin master
eas update --branch production --message "M3-1125-R customer_flow chip" --non-interactive
```

POS 기기에서: 앱 재실행 후 업데이트 적용 여부 확인 (또는 Settings → 버전 정보 git hash).

---

### 1-2. CD 앱 (storeport apps/customer-display)

CD 는 두 가지 경로로 서빙된다.

#### A. 네이티브 iPad 앱 (EAS OTA)

**판정: OTA 가능**

근거:
- `app.config.ts` `runtimeVersion: { policy: "appVersion" }`, `version: "0.1.0"` — PR #444/#446 에서 version 미변경.
- 변경 파일은 `apps/customer-display/app/`·`src/` 내 `.ts`/`.tsx` 전부; `package.json`·`app.config.ts` 무변경 → 네이티브 모듈 diff 없음.
- `expo-updates ~58.0.22` 설치됨, `updates.url: https://u.expo.dev/5b023fc6-c56a-4846-b187-ba16019e3ca3` 명시됨.
- `eas.json` build.production `channel: "production"`.

```
cd ~/projects/storeport
git pull origin main
pnpm --filter customer-display run eas:update:production
```

(또는 직접 명령으로:)

```
cd ~/projects/storeport/apps/customer-display
eas update --branch production --message "M1-1125-T/U CD sync flow" --non-interactive
```

CD iPad 에서: 앱 재실행 후 적용 확인.

#### B. 웹 버전 (commerce-core cd-builder → `/customer-display-web`)

**판정: 서버 재배포로 자동 반영 (별도 OTA 불필요)**

근거:
- `Dockerfile` Stage `cd-builder` 가 `apps/customer-display/` 를 Expo Web 빌드(`build:web`)해 `public/customer-display-web/` 에 삽입.
- 서버 PR #445 (1f2ab94) 가 이미 railway 운영 배포 완료. 해당 Docker 이미지에 CD #444/#446 소스가 포함됨.
- 웹 버전 확인: `GET https://admin.meros.id/admin/pos/customer-display/web-version` → `version.json` 반환.

별도 명령 불필요. 웹 CD 는 현재 운영 서버(`https://admin.meros.id/customer-display-web/`)에 이미 반영됨.

---

## 2. 실기 체크리스트

전제:
- POS 기기: 최신 OTA 적용 완료.
- CD (iPad): EAS OTA 적용 완료 — 또는 웹 CD (`/customer-display-web`) 사용.
- 테스트 언어 설정: 영어(기본). PB1 10%.
- 매장 `stock_location_id` 가 POS 에 설정되어 있음.

### Case 1 — 결제 완료 후 번호 입력 (경우 1, none → paid → entering)

| 단계 | Kyu 조작 | POS 화면 | CD 화면 |
|---|---|---|---|
| 1 | 상품 선택 → Checkout | IDLE | Order list (product + subtotal 크게, PB1 10%, [Enter phone number] 비활성) |
| 2 | Cash payment 선택 | Cash 결제수단 | Order list + [Enter phone number] 활성 |
| 3 | Process payment 완료 | Payment successful | 영수증 전체 (POS 와 같은 내용·서식) |
| 4 | 영수증 출력 완료 3초 | — | 영수증 좌 1/3 로 밀리고 우 2/3 에 키패드(start_entry 자동 호출) |
| 5 | 손님이 번호 입력 → 기존 번호 | — | 우 2/3 Confirm 화면 (번호 전체·현재 포인트·[Correct] 큰 버튼·[Change number]) |
| 6 | 손님이 [Correct] 탭 | 칩: "✓ 0813…480 · IDR N" | 우 2/3 Points earned · 좌 1/3 영수증 |

### Case 2 — 결제 전 번호 입력 (경우 2, entering → paid)

| 단계 | Kyu 조작 | POS 화면 | CD 화면 |
|---|---|---|---|
| 1 | Cash payment 화면 | 칩 없음(none) | Order list + [Enter phone number] 활성 |
| 2 | 손님이 [Enter phone number] 탭 | 칩: "Customer typing •••" | 좌 1/3 화면명 · 우 2/3 키패드 |
| 3 | 손님이 번호 입력 중 → POS Process payment 완료 | Payment successful · 칩 유지 | 좌 1/3 에 영수증 출력 · 우 2/3 키패드 유지 |
| 4 | 손님이 [OK] → 기존 번호 → [Correct] | 칩: "✓ 0813…480 · IDR N" | Points earned + 좌 영수증 |

### Case 3 — 결제 중 번호 입력 (tendering 중 entering)

| 단계 | Kyu 조작 | POS 화면 | CD 화면 |
|---|---|---|---|
| 1 | Cash payment 화면 | — | Order list + [Enter phone number] 활성 |
| 2 | 손님이 [Enter phone number] 탭 | 칩: "Customer typing •••" | 우 2/3 키패드 · 좌 1/3 화면명 |
| 3 | 손님이 번호 OK → confirming | 칩: "Awaiting confirm · 0813…" | 우 2/3 Confirm 카드 |
| 4 | Process payment 완료 (confirming 중) | Payment successful · 칩 유지 | 좌 1/3 영수증 · 우 2/3 Confirm 카드 유지 |
| 5 | 손님이 [Correct] | 칩: "✓ 0813…480 · IDR N" | Points earned + 좌 영수증 |

### Case 4 — 첫 방문 (first_visit)

| 단계 | Kyu 조작 | POS 화면 | CD 화면 |
|---|---|---|---|
| 1 | 손님이 번호 입력 → 미등록 번호 → [OK] | 칩: "Customer typing •••" | 우 2/3 First Visit 화면 (가입 안내) |
| 2 | 손님이 [Continue] | — | 우 2/3 Confirm 카드 (동일 번호·포인트 0·[Correct]) |
| 3 | 손님이 [Correct] → 결제 완료 상태 | 칩: "✓ 0813…480 · IDR N" | Points earned (0 → 적립 예정) |

### Case 5 — 번호 확인 (confirming → confirmed)

| 단계 | Kyu 조작 | POS 화면 | CD 화면 |
|---|---|---|---|
| 1 | CD 손님이 Confirm 화면에서 [Correct] | 칩: "✓ 0813…480 · IDR N" | confirmed: "Points will be added once payment is done" (결제 전) |
| 2 | 결제 완료 | — | Points earned (confirmed + paid 조합) |

### Case 6 — 20초 skip (entering → skipped)

| 단계 | Kyu 조작 | POS 화면 | CD 화면 |
|---|---|---|---|
| 1 | 키패드 화면에서 아무것도 안 누름 | 칩: "Customer typing •••" | 우 2/3 키패드 (20초 카운트) |
| 2 | 20초 경과 | 칩 사라짐(none, 결제 전) 또는 "Not confirmed · Link customer"(결제 후) | 처음 화면 (Order list 복귀) |

### Case 7 — 20초 confirm_timeout (confirming → unconfirmed)

| 단계 | Kyu 조작 | POS 화면 | CD 화면 |
|---|---|---|---|
| 1 | Confirm 카드에서 아무것도 안 누름 | 칩: "Awaiting confirm · 0813…" | 우 2/3 Confirm 카드 (20초 카운트) |
| 2 | 20초 경과 → confirm_timeout | "Not confirmed · Link customer" | 처음 화면 복귀 |
| 3 | 결제 완료 (unconfirmed) | "Not confirmed · Link customer" | (해당 없음 — 처음 화면) |

### Case 8 — POS Next customer 경고 후 강제 리셋

| 단계 | Kyu 조작 | POS 화면 | CD 화면 |
|---|---|---|---|
| 1 | 손님 entering/confirming 중 Kyu 가 [Next customer] 탭 | 경고 시트: "Customer is in progress" [Keep waiting] [Next customer anyway] | 우 2/3 키패드/Confirm 유지 |
| 2 | Kyu 가 [Keep waiting] | 경고 닫힘 | CD 변화 없음 |
| 3 | 다시 [Next customer] → [Next customer anyway] | 현재 주문 종료 · 새 주문 준비 | CD 즉시 처음 화면 (reset 호출) |

### Case 9 — 결제 실패 (confirmed + failed)

| 단계 | Kyu 조작 | POS 화면 | CD 화면 |
|---|---|---|---|
| 1 | 번호 confirmed 상태에서 결제 취소/실패 | 주문내역 복귀 | confirmed: "Payment was not completed" |
| 2 | 이후 POS 가 reset 또는 다음 주문 | — | 처음 화면 |

### Case 10 — QRIS 대기 중 번호 입력

| 단계 | Kyu 조작 | POS 화면 | CD 화면 |
|---|---|---|---|
| 1 | QRIS 결제 선택 | QRIS QR 화면 | 좌 1/3 QR 코드 + 금액 · 우 2/3 Order list ([Enter phone number] 활성) |
| 2 | 손님이 [Enter phone number] 탭 | 칩: "Customer typing •••" | 좌 1/3 QR 유지 · 우 2/3 키패드 |
| 3 | QR 스캔 완료 (payment paid) | Payment successful | 좌 1/3 영수증 · 우 2/3 (상태에 따라) |

---

## 3. 보조 명령 (기기 확인용)

현재 서버의 웹 CD 버전 확인:
```
curl -s https://admin.meros.id/admin/pos/customer-display/web-version
```

POS 앱 storeport 최신 main fetch:
```
cd ~/projects/storeport
git fetch origin
git log --oneline origin/main -5
```

POS fork 최신 master fetch:
```
cd ~/projects/agilo-medusa-pos-fork
git fetch origin
git log --oneline origin/master -3
```
