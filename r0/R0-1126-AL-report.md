storeport#462 APPROVE
relay#54 APPROVE

---

## storeport #462 — M0-1126-O (mirror.tsx message 리스너 + origin 허용목록)

### REQ 1: localhost:8081 보안 판정

**결론: Kyu 실기 동작 ✓ · 운영 위험도 LOW · 현재 설정 그대로 OK**

구현:
```
defaults = [window.location.origin, ...LOCAL_DEV_POS_MIRROR_ORIGINS]
//           ↑ 운영 CD host 자동                ↑ ["http://localhost:8081"]
```

**Kyu 현재 플로우**: expo start → POS at `http://localhost:8081` → 운영 CD를 iframe 임베드 →
POS가 `postMessage({type:'pos-mirror', detail}, '<cd-origin>')` 전송 → CD가 origin 체크 →
`http://localhost:8081` matches defaults → **반영됨 ✓**

이 설정이 맞다. Kyu가 로컬 POS(expo start)로 운영 CD 미리보기를 하는 구조이므로
`localhost:8081`이 defaults에 없으면 postMessage가 무시되어 Loading 고착이 재현된다.

**운영 보안 위험도**:
- postMessage 공격은 CD window 참조가 필요 (window.open 또는 iframe 임베드)
- 전용 iPad/디스플레이 환경에서 외부 페이지가 CD를 임베드할 경로 없음
- 주입 가능한 데이터는 카트 표시 정보뿐 (credential/PII 아님)
- **LOW risk** — 허용 가능

**향후 완전 클라우드 배포** (POS·CD 동일 host): `window.location.origin` 하나로 충분.
이때 localhost:8081을 빼려면 `EXPO_PUBLIC_POS_MIRROR_ORIGINS=<prod-pos-origin>` 빌드 타임 설정.
(env override가 defaults를 대체하는 구조 — 문서 명시됨)

### REQ 2: 코드 구조 · e2e CI

**CustomEvent + postMessage 합류**:
```ts
function applySnapshot(detail: unknown) { ... setSnapshot(...) }
function handleCustomEvent(e) { applySnapshot((e as CustomEvent).detail) }
function handlePostMessage(e) {
  if (!isPosMirrorOriginAllowed(e.origin, allowedOrigins)) return;  // 다른 origin 무시
  if (!data || data.type !== 'pos-mirror') return;                   // 다른 type 무시
  applySnapshot(data.detail)
}
```
- 두 경로가 동일한 `applySnapshot` 으로 합류 — 코드 중복 없음 ✓
- 허용 밖 origin → early return ✓
- type 불일치 → early return ✓

**e2e 로컬 실행 (`pnpm --filter customer-display e2e --workers=4`)**:
```
143 passed / 8 skipped / 0 failed  (22.1s)
```
mirror-postmessage.spec.ts 4건 전부 pass:
- iPad native 경로: CustomEvent 그대로 동작 ✓
- 허용 origin postMessage 반영 ✓
- 다른 origin postMessage 무시 ✓
- 허용 origin이라도 type 다르면 무시 ✓

**`gh pr checks 462`**:
```
heavy-mac        pending  (CI 아직 실행 중)
heavy-cloud      skipping (fork marker — 정상)
changes-filter   pass  19s
check            pass  26s
docker-build-…   pass  7m29s
markers-and-…    pass  23s
route            pass  20s
```
heavy-mac pending이나 로컬 동급 결과(143/0)로 커버됨.

**보존 요소**:
- `specs/screens/customer-display.md` 전 요소 — posScreenToDisplay·screen 컴포넌트·snapshot 모델 무변경 ✓
- iPad native WebView(CustomEvent) 경로 — e2e test 1번이 회귀 없음 확인 ✓

---

## relay #54 — M2-1126-N (heavy-cloud fork-only 마커 · storeport 실제 잡 계산 복원)

### REQ 3-1: countRealCloud 호출 여부

테스트 파일 `scripts/test/ci-watch-w114.test.mjs`:
```js
import { isMarkerJob, isCountableJob, countRealCloud } from '../watch/ci-watch-render.mjs';

test('W114-count-sp: countRealCloud — storeport heavy-cloud 포함', () => {
  const records = [
    { runner_kind:'cloud', job:'heavy-cloud', repo:STOREPORT, conclusion:'success' }, // 포함
    { runner_kind:'cloud', job:'heavy-cloud', repo:FORK, conclusion:'success' },      // 제외
    ...
  ];
  assert.equal(countRealCloud(records), 2, ...);
});
```
실제로 `countRealCloud`를 import·호출하는 픽스처 테스트 3건(count-sp, count-fork, count-norepo) 존재 ✓

W114 10/10 pass 확인:
```
# tests 10 / # pass 10 / # fail 0
```

### REQ 3-2: P-2a·P-2c·P-3a pre-existing 확인

**main 브랜치**:
```
# tests 49 / # pass 46 / # fail 3
not ok 32 - P-2a: buildMachineState — ci.data.partial=true → offline 러너 partial 플래그
not ok 34 - P-2c: buildMachineState — repos_failed 에 fork repo → fork 풀 partial=true
not ok 35 - P-3a: renderLayout — partial=true 且 offline → ? 표시 (빨강 OFF 금지)
```

**feat/M2-1126-N 브랜치**:
```
# tests 49 / # pass 46 / # fail 3
not ok 32 - P-2a  (동일)
not ok 34 - P-2c  (동일)
not ok 35 - P-3a  (동일)
```

**판정: pre-existing confirmed** — main과 branch 동일 3건 실패. #54가 깨뜨린 것 아님 ✓

### 보존 요소

v1.13 4줄 (`ci-watch-render.mjs` line 5):
```
// v1.13: M2-1126-L — W2(cancel-on-close 마커) · W5(OFF 표시 수정) · W10(4줄 MBP/iMAC/클라우드/전체)
```
보존 ✓ — v1.14 한 줄이 line 6에 추가됨.

---

## 최종 판정

| PR | 판정 | 근거 |
|----|------|------|
| storeport #462 | **APPROVE** | localhost:8081 Kyu 플로우 필수·보안 LOW, 합류 로직 정상, e2e 143/0 로컬 확인 |
| relay #54 | **APPROVE** | countRealCloud 호출 테스트 존재, P-2a·P-2c·P-3a pre-existing(main도 동일 실패), W114 10/10 |
