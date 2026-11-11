# M0-1105-AI 리포트 — storeport #209 pos-integration 안정화

## 원인

- 실패 모드: `medusa-test-utils` 는 한 jest worker 프로세스 안에서 두 spec 파일이 각자 `medusaIntegrationTestRunner` 로 Medusa app 을 boot 하면 두 번째 boot 에서 Stock_location 모듈 로더가
  `Loaders for module Stock_location failed: Method Map.prototype.set called on incompatible receiver #<Map>` 로 터짐 (`@medusajs/modules-sdk/src/loaders/utils/load-internal.ts:735`).
  뿌리 = modules-sdk 의 모듈 레지스트리가 1차 app boot 당시 realm 의 `Map` 을 캐시해두는데 (`medusa-module.ts:433 bootstrap_`), 두 번째 boot 에서는 jest/vm-modules 의 realm 이 달라져 cross-realm Map 수신자 체크에 걸림.
- CI 1차 로그 (run 42950108942): `PASS tenders.spec.ts` 뒤 `FAIL fulfill-delivery-guard.spec.ts` 의 `beforeAll` 에서 app 미기동 → `api.post is not a function` (helpers.ts:58 loginAsAdmin). 5건 전부 전파됨.
- `--runInBand` 는 이미 설정돼 있으나 "직렬"일 뿐 worker 프로세스는 공유라 회피 불가. jest `--isolatedModules` / `--workerIdleMemoryLimit` 는 vm-modules 모드에서 무력.
- 추가 노이즈: 1차에는 Map 오류, 2차에는 `Connection ended unexpectedly` (DB 세션이 1차 boot 종료 시 끊긴 채 2차에서 재사용 시도). 둘 다 "두 번째 boot" 라는 동일 뿌리.

## 수정 diff 요약

1. 새 spec `integration-tests/pos/fulfill-delivery-guard.spec.ts` (248 줄) 를 삭제, 5개 시나리오를 기존 `tenders.spec.ts` 의 외부 `describe("M0-1105-B · POS payment API integration")` 안에 **중첩 describe `M0-1105-AG · POS fulfill · delivery courier 가드`** 로 흡수 (#61~#65). `authHeader` 는 바깥 `beforeAll` 의 것을 그대로 사용 (M0-1105-AB, M0-1105-AC 와 동일 패턴).
2. 흡수 과정에서 발견된 원 spec 의 상수 버그 교정: #64 의 `delivery.phone = "+628123"` 은 #45b 의 phone 형식 검증 (`delivery.phone must be a valid phone number`) 에 걸려 `/tenders` 가 400. 시나리오 #26 과 동일한 `"+628123456789"` 로 수정.
3. 라우트 로직 (`/admin/pos/orders/[id]/fulfill/route.ts` 가드 24 줄 추가) 은 손대지 않음. docs/feature-map.yaml 은 `integration-tests/pos/**` 글로브로 커버 → 갱신 불요.
4. 브랜치 `fix/m0-1105-ag-delivery-courier-guard` 를 `origin/main` (ed2e6ab, #208 머지 후) 위로 **rebase · force-with-lease 푸시**. 커밋 1개로 압축: `033cc77`.

## CI 2회 연속 초록

- Run 1: https://github.com/CuriocityDevAi/storeport/actions/runs/42984907941 (attempt 1) · pos-integration `success` · 2m31s · `Tests: 74 passed`.
- Run 2 (rerun): https://github.com/CuriocityDevAi/storeport/actions/runs/42984907941 (attempt 2) · pos-integration `success` · 재가동 요청으로 attempt 2 로 집계 · 동일 SHA `033cc77` · 전 jobs 통과.
- 두 attempts 모두 `conclusion: success` (API 확정: `attempts/1` + `attempts/2`).

## 이연 순증감

- 추가: 없음 (코드 라우트 로직은 불변 · 테스트 구조만 교정).
- 해소: M0-1105-AI (#209 pos-integration 2회 실패) · #209 이 머지 가능 상태로 전이.

## 착지 명령

```bash
cp /tmp/M0-1105-AI-report.md ~/projects/curiocity-relay/m0/
cd ~/projects/curiocity-relay
git add m0/M0-1105-AI-report.md
git commit -m "m0: M0-1105-AI"
git pull --rebase --autostash origin main
git push
node scripts/claim.mjs M0-1105-AI done "#209 pos-integration 2회 실패 원인 = 2 spec 파일에서 Medusa 중복 boot → modules-sdk Map cross-realm 폭발; 새 spec 을 tenders.spec.ts 로 흡수 + phone 상수 교정 → CI 2회 연속 초록 (run 42984907941 attempts 1·2)"
```
