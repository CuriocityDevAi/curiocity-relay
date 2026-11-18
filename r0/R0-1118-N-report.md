#368 APPROVE · 포인트 복구 non-fatal 유지 O · #296 APPROVE · CI: #368 no-checks(stacked/base #367 open) · #296 feature-map-check SUCCESS · markers/changes QUEUED

## #368 — fix(imports): M1-1118-H void·return·recover-loyalty 동적 import 정적 전환

**판정: APPROVE**

### 검토 항목

**순환 의존성**
- `lib/loyalty/recover.ts` imports: `@medusajs/framework/types`, `@medusajs/framework/utils`, `modules/loyalty_negative` (index.ts → Module() + service만 로드, routes/workflows 역참조 없음) → 순환 없음 ✅
- `lib/loyalty/preview-recover.ts` imports: `node:crypto`, `@medusajs/framework/utils` → 순환 없음 ✅

**동적 import 원래 이유**
- ESM `.js` 리터럴 경로 해석 목적 (지연 로드 의도 없음). R0-1118-M 결론과 동일 ✅

**recover-loyalty.ts non-fatal catch 유지**
- `try { await recoverForOrder(...) } catch(e) { console.warn("[M0-1116-B] loyalty recover failed (non-fatal): ...") }` 구조 그대로 유지 ✅
- 함수는 항상 `new StepResponse(void 0)` 반환 → 환불 워크플로우 차단 없음 ✅
- **return/route.ts**: 동일 non-fatal 패턴 유지 (`[M0-1116-B] loyalty recover failed (non-fatal)`) ✅

**void unit mock `{ virtual: true }` 제거 — 검증 약화 여부**
- 변경 전: `jest.mock("…/preview-recover.js", …, { virtual: true })` — virtual mock은 실제 파일 존재 여부 무관
- 변경 후: `jest.mock("…/preview-recover", …)` — 실제 모듈 경로 사용, `jest.requireActual`로 실제 모듈 로드 후 `previewRecoverForOrder`만 override
- 검증 강화 (실제 파일을 mock하므로 경로 불일치 시 테스트 실패) ✅

**Unit 테스트**
```
pos-void-route.unit.spec.ts   7/7  PASS
pos-void-net.unit.spec.ts    12/12 PASS
pos-refund-workflow.unit.spec.ts 13/13 PASS
합계: 32/32 PASS
```

**CI / 베이스 브랜치**
- 베이스: `fix/M1-1118-G-refund-dynamic-import` (#367 OPEN → stacked PR)
- CI checks 없음 (non-main base 브랜치에는 CI 미발동) → 정상 상황
- **머지 순서**: #367 → main 머지 후 #368 rebase 필요 (base 자동 갱신 또는 수동 rebase)

---

## #296 — feat(test): M1-1116-H 통합 테스트 단일 진입점 (scripts/it.sh · test:integration)

**판정: APPROVE**

### R0-1118-K CHANGES 2건 반영 확인

최신 커밋: `fix(test): M3-1118-C — it.sh DB 격리·정리 추가 · feature-map M1-1116-H 등록`

**feature-map 등록** (`docs/feature-map.yaml`)
```yaml
- id: integration-runner
  name: 통합 테스트 실행 스크립트 (M1-1116-H)
  summary: 로컬과 CI 에서 pos·loyalty 통합 테스트를 한 명령으로 실행하는 단일 진입점이다.
  status: live
  files:
    - apps/commerce-core/scripts/it.sh
```
✅ 등록됨

**trap이 CREATE 직전**
```bash
_cleanup_db() { …DROP DATABASE… }
trap _cleanup_db EXIT          # ← trap 등록
psql … "CREATE DATABASE …"    # ← CREATE (trap 뒤)
```
✅ 순서 정상 (EXIT 에 drop 등록 → CREATE 실행 → 종료 시 cleanup 보장)

**bash apps/commerce-core/scripts/it.sh orders-list 실행 결과**
```
Tests:  9 passed, 9 total
Suites: 1 passed, 1 total

  ✓ #1 전화번호 가림 형식 · loyalty_earn 객체 형식 → 숫자 반환
  ✓ #2 전화번호 일부 필터 (q=2480)
  ✓ #3 주문번호(display_id) 필터
  ✓ #4 loyalty_earn 없는 주문 → null
  ✓ #5 loyalty_earn 객체 applied=false → null
  ✓ #6 loyalty_earn + loyalty_recover → 순적립(earn − recovered)
  ✓ M0-1117-B q=081…(local), q=6281…(no+), q=+6281… 3모양 반환
  ✓ M0-1117-B 마스킹 0813-****-2480 통일 · 응답 shape 불변
  ✓ M0-1117-B display_id 검색 회귀 없음

▶ [it.sh] DB 정리: storeport_ci_985800342   ← EXIT trap 정상 실행
```
✅ 9/9 + 정리 로그 확인

**CI**
- `feature-map-check`: SUCCESS ✅
- `markers-and-forbidden`: QUEUED (실행 중)
- `changes-filter`: QUEUED (실행 중)
