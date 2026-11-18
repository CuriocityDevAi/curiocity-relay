#377 APPROVE · 경계 의도 충족 O · 위반 은폐 X · 부팅 O

## 판정: APPROVE

---

## REQ 1 — re-export 방식이 §5 R-B2 완료 기준을 충족하는가 · 위반 은폐 여부

**경계 의도 충족 O.**

PR 이 계획서 §5 R-B2 에서 정한 `register_session/core` = 교대·현금·customer-display-device (POS 전용) / `order_snapshot` = 공용 분리 구조를 그대로 구현했다. `register_session/core/models/` 에 3개 re-export 마커를 신설하고, ESLint 패턴을 `register_session` → `register_session/core` 로 좁혔다. `order-snapshot` 은 `core/` 에 포함하지 않아 공용 승격 경로(R-B2b)를 열어 뒀다.

**위반 은폐 X.**

해소된 8건은 subscriber 3개가 `../modules/register_session`(모듈 루트 상수) 및 `../modules/register_session/service`(DI 타입)를 import 하는 경우다. 이 경로는 모델을 직접 참조하지 않으며, Medusa DI 패턴 상 subscriber 가 서비스에 접근하는 정상적인 방식이다. 패턴이 `register_session` 전체를 걸러 발생한 거짓 양성(false positive)이었다.

실제 위반 패턴(공용 파일 → `register_session/models/` 직접 import)은 grep 결과 0건이다:
```
grep -rn "register_session/models" src/subscribers/ src/lib/ src/modules/loyalty_* src/modules/receipt/ src/api/store/
# (출력 없음)
```

새 패턴 `register_session/core` 는 오직 모델 레이어 직접 접근을 차단하므로 과소 포착 위험 없다.

---

## REQ 2 — `customer-display-device` POS 전용 분류 적합성

**적합 O.**

`customer-display-device` 모델 정의:
```ts
// 계산대 1개 = iPad 1대 (unique on stock_location_id).
const CustomerDisplayDevice = model.define("customer_display_device", {
  id: ..., stock_location_id: model.text(), device_token_hash: model.text(),
});
```
`stock_location_id`(계산대)와 `device_token_hash`(물리 기기 페어링) 는 POS 하드웨어 짝짓기 개념이다. Wing(온라인 채널)에는 물리 손님 화면 기기 개념이 없으므로 `core/`(POS 전용) 분류가 맞다. 계획서 §5 R-B2 결정표(#1)에도 "customer-display-device는 POS 소유"로 명시되어 있다.

---

## REQ 3 — 검증 결과

| 항목 | 결과 |
|---|---|
| `pnpm --filter commerce-core build` | ✅ exit 0 (backend 5.53s · frontend 18.39s) |
| `pnpm --filter commerce-core test` | ✅ 539 tests · 47 suites PASS |
| `bash apps/commerce-core/scripts/it.sh checkout-handover-smoke` | ✅ PASS 2/2 (cash · qris) |
| boot-smoke | ✅ `checkout-handover-smoke` 가 Medusa full server startup 포함 · `boot-smoke` 명칭의 별도 스크립트 미존재 → smoke 경유 부팅 확인으로 대체 |

---

## 요약

re-export 방식은 "물리 이동 없이 경계 주소만 신설" 하는 적법한 우회다. Medusa DI 를 깨지 않으면서 ESLint 경계를 실질적으로 성립시켰다. 경고 감소(14→6)가 단순 숫자 압축이 아닌 과포착 제거임을 임포트 경로 검증으로 확인. 남은 6건(pos_settings 4건·xendit 2건)은 계획서 R-B1·B3 소관으로 이번 범위 밖이다.
