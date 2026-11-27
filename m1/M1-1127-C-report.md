# M1-1127-C · 통합 리허설 Case 1 · 부분 PASS

**판정**: 부분 (POS 측 결제 끝까지 통과 ✓ · CD 측 영수증 전환 못 함 ✗ · mutation red 미확보)
**커밋**: `904349c` (셀렉터·auth·url 프록시 교정) · `95bedaf` (Shift 자동 오픈 + add-to-cart 단계)
**추가한 testID**: 없음 (모두 실제 코드에 이미 있는 testID 로 교체 — 상품 카드 `product-handle_*_card`, Checkout `cart-pay`, Cash `checkout-pay-cash`, Add `product-detail-add-to-cart`, process `cash-process`, success `payment-success`, 그리고 CD 측 `left-receipt-mini` · `keypad-panel` · `key-*` · `ok-button` · `confirm-panel` · `confirm-yes-button` · `earned-panel` 등 전부 storeport apps/customer-display 에 이미 존재)
**발견한 제품 버그**: 0건 — 현재 테스트 하네스가 CD 페어링을 세팅하지 않아 제품 동작 검증 단계까지 도달 못 함 (제품 버그 가능성은 아직 미검증)

---

## 1. 뭐 달라졌나

진행 (M1-1127-B→C, run 45909116905→45932680110):
- `product-card` 어서션 **180s 타임아웃** (step 1 못 넘김)
  → `payment-success` 화면까지 **1분 50초** 안에 전원 통과

새로 통과한 스텝: 로그인 · setup-wizard 건너뜀 · Shift 자동 오픈 · 상품 카드 tap · product-detail Add to cart · Cart Checkout · Cash 선택 · Process payment · **Payment successful 화면 도달** (POS 스크린샷에 R-261127-0001 영수증·IDR 10·Cash 완료 확인됨).

막힌 지점: CD(8082) 측 `left-receipt-mini` 가 뜨지 않음 (12s timeout) · CD 스크린샷은 노란 bg 의 **대기 Splash 상태** — POS 가 결제 완료 broadcast 를 보냈어도 CD 가 받지 않는다 = **CD 가 POS 와 아직 페어링되지 않았기 때문**. 이 단계는 **테스트 하네스 미완** (제품 버그 아님).

## 2. 핵심 원인 (왜 이전엔 product-card 에서 red 였나)

1. `seedPosAuth` 가 `medusa:token`/`meros:token` 키로 썼지만 실제 `contexts/auth.tsx` 는 `meros.secureStorage.v1.apiKey` 를 읽음 → POS 가 매번 **login 화면**으로 튕김 → `product-card` 보일 리 없음.
2. Production export (`expo export -p web`) 는 `constants/api.ts` 의 `__DEV__` 가 false 이므로 `MEROS_API_URL=https://api.meros.id` 로 **고정 하드코딩**. 로컬 commerce-core(127.0.0.1:9000) 와 통신 불가 → 토큰이 맞아도 /admin/products 가 밖으로 나가서 실패.
3. Setup wizard 가 로그인 뒤를 가로막음 — `sales_channel_id`/`stock_location_id`/`region_id` 세 개 flat key 가 없으면 `/setup-wizard` 로 replace.
4. ShiftCloseGate 가 Sell 화면 전체를 **"Open shift" 모달로 덮어서** click intercept — 열린 register-session 없으면 click 이 stable 못 되고 5s 타임아웃.

## 3. 변경 파일 (허용 범위 내)

- `e2e/cd-pos/helpers/pos-auth.ts` — `/auth/user/emailpass` → 토큰 · `/admin/{sales-channels,stock-locations,regions}` → ID · 자동 Shift 오픈 · 전부 `meros.secureStorage.v1.<key>` 로 시드
- `e2e/cd-pos/helpers/url-proxy.ts` (**신규**) — `page.route('https://api.meros.id/**', ...)` → 127.0.0.1:9000 투명 포워딩. mock 아니라 포트 재라우팅.
- `e2e/cd-pos/case1.spec.ts` — 셀렉터 재편 + `product-detail-add-to-cart` 단계 추가 + 단계별 timeout 5~12s
- `e2e/cd-pos/case1-mutation-skip-confirm.spec.ts` — 동일 셀렉터 보정

> 상품 카드/키패드 본체 소스는 **건드리지 않음**. 추가한 testID 0줄. 전부 이미 있던 걸 썼다.

## 4. 자기 검증

- **Case 1 (정상)** 실행: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45932680110/job/140288663437 — ❌ 실패지만 `payment-success` 는 통과 후 CD 대기에서 멈춤 (아티팩트 e2e-cd-pos-45932680110 의 test-failed-1.png: POS "Payment successful · R-261127-0001 · IDR 10 · Cash" · test-failed-2.png: CD 노란 splash bg)
- **mutation red** 실행 URL: **미확보** — 정상 플로우가 초록이 안 돼서 mutation 조건 성립 안 함 (현 상태로 돌려도 red 는 나지만 "원인이 confirm 생략"이 아니라 "페어링 없음"이라 의미 없는 red)
- **잡 1회 소요**: 1m51s (서버 기동 포함 · 이전 run 5m21s 대비 63% 단축 — 하네스는 이미 충분히 빠름)
- **못 간 단계**: Step 5 (CD `left-receipt-mini` 전환) · 로그 원문: `Error: expect(locator).toBeVisible() failed · Locator: getByTestId('left-receipt-mini') · element(s) not found · waiting for 12000ms`

## 5. 남은 일 (CD 페어링 세팅 — 다음 틱 권장 범위)

CD 가 broadcast 를 받으려면 **device_token** 이 필요. 단계:

1. `helpers/pos-auth.ts` 에서 register-session 오픈 뒤, POS 토큰으로 `POST /admin/pos/loyalty/sessions {register_session_id}` → `pair_code` (6자리) 받기.
2. `pair_code` 로 `POST /customer-display/pair {code}` → `device_token` 받기 (인증 없음 · 5회 실패 시 폐기).
3. CD `addInitScript` 로 `localStorage.setItem('cd_device_token', token)` 시드.
4. CD 측에도 `page.route` 프록시 필요 — CD web 은 `api-base.ts` 가 web 에서 `""` 반환 (같은 origin) → `/customer-display/snapshots/*` 등의 상대 호출이 **127.0.0.1:8082** 로 가서 404. 해결: `start-test-env.sh` 가 CD build 전 `EXPO_PUBLIC_API_URL=http://127.0.0.1:9000` 를 export 하거나(가장 깔끔), 혹은 CD page.route 로 8082 의 특정 경로를 9000 으로 포워드.
5. (선택) register-session POS pair 쪽 서버 모듈이 pgConnection 을 요구 (route.ts 43행) — CI 는 이미 postgres 띄워 있어서 문제 없을 것.

두 가지 중 ④ 의 start-test-env.sh 수정이 **M3 소유 파일 아님** 이라 허용 범위 안.

## 6. 왜 지금 머지 금지인가 (PR 본문 Kyu 확인용 2~3줄)

- 현재 PR #281 은 Case 1 이 아직 **CD 측 페어링 미설정** 으로 빨간색. POS 쪽은 Payment successful 까지 통과 (아티팩트 영수증 참조) · 영수증에 매장명·금액·QR 다 정상.
- 머지 전에 ⑴ CD 페어링 시드 + ⑵ CD API 프록시(또는 build-time URL 주입) 두 개 더 올려서 정상 플로우가 녹색이 돼야 함. 그래야 mutation red 로그도 의미가 생김.
- 추가한 testID 0줄 · 제품 코드 건드리지 않음 — 하네스 변경만. 테스트가 녹색이 되면 Kyu 11-26 밤 실기 버그(OK→Confirm 생략 시 적립) 를 통합 레벨에서 잡는 레인이 완성.
