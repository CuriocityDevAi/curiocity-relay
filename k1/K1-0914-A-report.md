---
round: K1-0914-A
pr: https://github.com/CuriocityDevAi/test-portal/pull/94
outcome: MERGED (SHA 20de580 · K1-0914-C 충돌 해소 → squash 머지) · Kyu 프로덕션 실기 확증 대기 (아이폰 PWA 설치 → 알림 켜기 → 실 알림 1건)
kyu_checks:
  - 아이폰 Safari → test.curiocity.company → 홈 화면 추가 → PWA 아이콘 실행 → [⚙] → [알림 켜기] ON → 시스템 팝업 허용 → 조작 시 실 알림 1건 수신
  - 맥 Chrome/Safari/Firefox → 즉시 알림 허용 → 조작 시 실 알림 수신 (PWA 설치 불요)
  - 포털 홈 → agilo-medusa-pos-fork PR 상세 → [폰에서 열기] 큰 버튼 노출 → 탭 → exp://<subdomain>.exp.direct 응답 → Expo Go 앱 로드
---

## 0. K1 재정의

K1 상표 = **REG 러너 (K1-0902/0903) 완결 · K0 인수인계 완료** → **test-portal 배관 허브 (K0 소스 UI 병행)** 로 재정의 (Kyu K1-0914-B C1 판정).

파일 경계 정본:
- **K1 소유**: `src/routes/api/push/**` · `src/lib/webpush.ts` · `static/sw.js` · `src/lib/push-client.ts` · `tools/kyu-bridge/**` · `.github/**` (auto-merge.yml 포함 · C2 (c) 판정) · curiocity-relay 리포 전체
- **K0 소유**: `src/routes/**` (api 제외) · `src/lib/ui/**`

## 요지

K1-0914-A 착지 = **AR 잔여 실 확증** (Web Push 실 발송 + Expo tunnel 실 확장) + **relay checks 규약** (Kyu 실기 항목 파일) + **CI 감사 F** (5 리포 · 관찰 10건). PR #94 게시 · Kyu 프로덕션 실기 대기.

## 1. A1 · Web Push 실 발송 (자작 진입)

**심문 회신 Q2 = (나) web-push-cf → (다) 자작**. 실측 = `npm view web-push-cf` 404 (부재) → "실패 시 (다) 자작" 정본 발동.

**착지 (`src/lib/webpush.ts` · 200 라인)**:
- RFC 8291 aes128gcm payload 암호화 (crypto.subtle · HKDF · AES-128-GCM)
- RFC 8292 VAPID JWT 서명 (jose ES256 · PKCS#8 EC P-256)
- `/api/push/notify` = D1 전 subscription 순회 · Promise.all 병렬
- 410/404 자동 정리 (D1 DELETE · 심문 D1 채택)
- deps 0 (`web-push-cf` npm 부재 · jose 기존 재활용 · [PLAN-OSS] 게이트 편입)

**단위 검증 · 6 test pass (`src/lib/webpush.test.ts` · @vitest-environment node)**:
- 성공 (201) · body 구조 (salt 16 + rs 4 + keyid_len 1 + keyid 65 + ciphertext)
- VAPID JWT verify (aud/sub/exp 정합)
- 410 만료 · 400 실패 · sendPushToAll 병렬

**Workers secret 3 편입 (K1 직접 · Kyu 클릭 없음 · versions secret put)**:
- `VAPID_PUBLIC_KEY` (base64url 65B uncompressed P-256)
- `VAPID_PRIVATE_KEY` (PKCS#8 PEM · CLAUDE.md § 5.13 정본)
- `PUSH_WEBHOOK_TOKEN` (32B hex · openssl rand)

**relay Actions secret 2 편입 (K1 직접)**:
- `PORTAL_PUSH_WEBHOOK` = `https://test.curiocity.company/api/push/notify`
- `PORTAL_PUSH_TOKEN` = 동일 토큰

**부수 관측**:
- **맥 Chrome 실 알림 스샷 (K1 자기 구독)** = K1 세션 자체 브라우저 부재 (headless 없음 · Access JWT 취득 불가) → **Kyu 실기 필수** (아이폰 PWA + 맥 브라우저). K1 검증 = 코드 + 단위 + secret 편입 + curl 응답 (배포 후).

## 2. A2 · relay checks/<hub>/<ID>.md 규약 + build-index schema v2

**심문 회신 Q4 정정 정본**: `checks/<hub>/<ID>.md` = **Kyu 실기 항목 파일** (상태 원장 아님 · 상태는 D1 case_state 정본). K0-0914-AU (`checks/k0/K0-0914-AU.md`) = 정본 스키마 예시.

**착지 (`curiocity-relay/`)**:
- `scripts/build-index.mjs` `collectChecks()` 편입 · JSON 문자열 파싱 · items[] 객체화
- `index.json` `schema_version: 2` · `checks[]` 신설 · v1 호환 (옛 소비자는 checks 무시)
- `README.md` `[checks 규약]` 절 신설 (frontmatter + items[] · **정본 분리** = relay checks vs GitHub Checks API)
- `.github/workflows/build-index.yml` paths `checks/**` · `k1/**` 편입
- `HUBS` 배열 = `['k0', 'n0', 't0', 'm0', 'k1']` (k1 편입)

**실측**:
```
$ node scripts/build-index.mjs
✓ index.json · prompts=1 · reports=18 · checks=1
```

K0-0914-AU 12 items 파싱 확증 (device: phone/tablet/desktop/any · 전항 필드 정합).

**정본 분리 (D5 채택)**: relay checks = **Kyu 실기 항목** · GitHub Checks API = **kyu-gate 도장** (P3 정본).

## 3. A3 · kyu-bridge Expo tunnel 실 확장

**착지 (`tools/kyu-bridge/src/expo.mjs` · 신설)**:
- 화이트리스트 slug (`EXPO_ALLOWED_SLUGS` = `['agilo-medusa-pos-fork']`)
- **기존 tunnel adopt 정본** (idempotent) = ngrok admin API (`localhost:4040~4049`) 폴링 · `config.addr` 매치 → `public_url` → exp:// 변환 즉시 반환
- **부재 시 spawn** = `npx expo start --tunnel --port <free 8081~8099>` + "Tunnel ready" 감지 → ngrok admin 재폴링 (CI=1 stdout 부재 회수)
- `spawn(process.execPath, ...)` 정본 (CLAUDE.md § 5.16 launchd PATH gotcha 정합)
- server.mjs `POST /expo/start` 라우트 편입 · `KYU_BRIDGE_VERSION` 0.3.0 → 0.4.0
- `/health` 응답에 `expo_allowed_slugs` 추가

**단위 검증 · 6 test pass (`tools/kyu-bridge/test/expo.test.mjs`)**:
- isExpoSlug 화이트리스트 · Object.freeze · adopt 경로 · spawn 경로

**실 exp:// URL 캡처 (K1 실측)**:
```
{ "ok": true, "slug": "agilo-medusa-pos-fork",
  "exp_url": "exp://3zzfsws-curiocitymayer-8081.exp.direct",
  "log_path": "/tmp/k1-expo-test/expo-agilo-medusa-pos-fork-1789379066764.log",
  "pid": null, "adopted": true, "ngrok_admin_port": 4040,
  "elapsed_ms": 56 }
```

log 내용:
```
adopted existing tunnel: http://3zzfsws-curiocitymayer-8081.exp.direct
```

**QR SVG** = `qrcode-svg` npm 이미 편입 (K0 라운드 dependencies · 포털 UI 측 렌더 · deps 0 [PLAN-OSS] 게이트).

## 4. F · 5 리포 CI/회귀 감사 (읽기 전용 · 관찰만)

**저장** = `test-portal/docs/audits/K1-0914-A-ci-audit.md` (Kyu Q3 (b) 정본).

### 4.1 워크플로 인벤토리

| repo | wf 수 | 파일 |
| --- | ---: | --- |
| grownest | 3 | ci · dispatch-format-check · stale-deferred |
| todoboss | 1 | ci |
| test-portal | 2 | kyu-gate-auto-merge · regression |
| storeport | 3 | ci · nightly-commerce-core-smoke · stale-deferred |
| agilo-medusa-pos-fork | 1 | lint |

### 4.2 최근 30 runs 통과율

| repo | success | failure | 통과율 |
| --- | ---: | ---: | ---: |
| grownest | 24 | 5 | 80.0 % |
| todoboss | 30 | 0 | **100 %** |
| test-portal | 4 | 17 | **13.3 %** (최저) |
| storeport | 26 | 4 | 86.7 % |
| agilo | 6 | 1 | 85.7 % |

### 4.3 PR#90 unstable 정체 진단

- MERGED · `mergeStateStatus: UNKNOWN`
- `matrix-run (test-portal) · FAILURE` · `matrix-run (todoboss) · SUCCESS` · `kyu-gate · SUCCESS`
- **auto-merge 성공** (kyu-gate 별건 · REG 무력화)
- 진짜 "정체" 아님 · fail 이력 잔존 (녹색 만 나오지 않는 상태)

### 4.4 regression 실 트리거 이력

- schedule 3연속 fail (09-11 · 09-12 · 09-13) → main 어설션 stale
- 뿌리 = **al2-tabs-three-rendered** (AM 라운드 하단 탭 폐지 · AL 어설션 미갱신) · **ao4-pr-body-checklist** (default export 시그니처 결함)

### 4.5 시드 고정 판정

- **필요 없음**. 러너 정본 = 파일 grep · 순수 함수 · fixture JSON. `seed-catalog-tmp` = K0 흡수 후 폐기 예정 CLI.
- 향후 어설션이 외부 상태 참조 시 = 시드/mock 정책 부재 = 잠재 위험 (O6).

### 4.6 관찰 10건 (개선안 미포함 · 다음 라운드 입력)

- O1 test-portal main 어설션 2건 stale (al2 · ao4) → schedule 3연속 fail
- O2 어설션 정본 전환 시 파일 회수 규약 부재
- O3 러너 계약 (default export) 검증 부재
- O4 matrix fail 잔존해도 auto-merge 성공 → REG 무력화
- O5 agilo · todoboss = 어설션은 test-portal matrix 안 (한 리포에 다른 리포 REG) · 확장 병목
- O6 DB 시드 고정 부재 (현재 필요 없음 · 미래 위험)
- O7 야간 실패 알림 부재 (K48/K49 vars/secrets 대기)
- O8 agilo 회귀 인프라 전무 (lint 뿐)
- O9 storeport nightly-commerce-core-smoke 별도 · REG matrix 미편입
- O10 stale-deferred workflow 격차 (grownest · storeport 존재 · test-portal 부재)

## 5. DOC 편입

- `docs/SPEC.md § 11 v1.60` = K1 배관 절 신설 · § AR-B2 확장 (실 발송) · § AR-C 확장 (Expo tunnel) · § AR-A 확장 (checks/ 규약) · § CI 감사 F 절
- `EPIC-STATE.md` Active § K1 배관 (K1-0914-A) 편입
- `docs/requirements-tracking.md K60` 등재 (원문·구현·실기 6컬럼)
- `tools/kyu-bridge/README.md` POST /expo/start 절 신설 · v0.4.0
- `curiocity-relay/README.md` [checks 규약] 절 신설
- 심문 원본 유지 = `curiocity-relay/k1/K1-0914-A-inquiry.md`

## 6. BUILD 실측

```
$ pnpm test    →  Test Files 71 passed · Tests 960 passed (+12: webpush 6 + expo 6)
$ pnpm check   →  0 errors 0 warnings 0 files_with_problems
$ pnpm build   →  ✔ done · @sveltejs/adapter-cloudflare
```

## 7. 다음 라운드 인수 (역제안)

- **웹 화면 실 알림 스샷** = K1 자체 브라우저 부재 · Kyu 자체 구독 실기 필요 (아이폰 PWA 절차 완결 후 자동)
- **테스트 체계 v1 에픽** = O1-O10 개선안 통합 (어설션 stale 회수 규약 · 러너 계약 검증 · 야간 알림 · agilo REG 편입)
- **D2 로테이션 규약** = 별건 P3 후속 (Kyu K1-0914-B 판정)
- **D3 iOS PWA subscribe 실패 UX** = K0 회부 (파일 경계 · src/routes/**)

## 8. 결론

- **자기 검증 통과** = 960 unit + check 0 err + build done + 실 exp:// URL 캡처 + 5 secret 편입
- **Kyu 프로덕션 실기 대기** = 아이폰 PWA 설치 → 알림 켜기 → 실 알림 1건 수신 (처음 하는 사람 기준)
- **PR** = https://github.com/CuriocityDevAi/test-portal/pull/94

---

## C. 마감 (K1-0914-C · 2026-09-15)

**Kyu 지시** = PR#94 충돌 해소만 · 코드 변경 없음 · kyu-gate 자동 머지 관찰 · 안 되면 squash 머지.

### C.1 충돌 해소

`git fetch origin && git merge origin/main` → K0-0914-AV 착지 (main SHA c58d5d1) 와 K1-0914-A (본 브랜치) 병렬 진행 · **SPEC v1.61 중복 청구** 뿌리.

**충돌 파일 3건** (다른 허브 항목 삭제 없음 · 양쪽 보존):

| 파일 | 충돌 성격 | 해소 |
| --- | --- | --- |
| `docs/SPEC.md` | K0-0914-AV v1.61 · K1-0914-A v1.61 (동시 청구) | **K0-0914-AV → v1.62 (chronological 최신) · K1-0914-A → v1.61 유지** · 양쪽 절 전량 보존 |
| `docs/requirements-tracking.md` | K71 (K1-0914-A) · K80 (K0-0914-AV) 이연 요약 겹침 | K80 SPEC 참조 v1.61→v1.62 정정 · "AV · K1 병행" 후속을 K71 착지 참조로 정정 · 양쪽 행 유지 |
| `EPIC-STATE.md` | Active § K1 배관 (본 브랜치) · Active § 포털 v2 정본 AU (main) | git 자동 병합 (충돌 없음 · 양쪽 추가) |

병합 후 검증:
- `pnpm check` = 0 err · `pnpm test src/lib/webpush.test.ts tools/kyu-bridge/test/expo.test.mjs` = 12 pass
- 코드 변경 0 (문서만)

**병합 커밋** = `1c97121` (feat/k1-0914-a-push-bridge)
- 메시지 = `K1-0914-C · merge origin/main · SPEC/tracking 충돌 해소 (양쪽 보존)`
- push = `fdfbd28..1c97121  feat/k1-0914-a-push-bridge -> feat/k1-0914-a-push-bridge`

### C.2 mergeable 확증

```
$ gh pr view 94 --json mergeable,mergeStateStatus,statusCheckRollup
{
  "state": "OPEN",
  "mergeable": "MERGEABLE",
  "mergeStateStatus": "UNSTABLE",
  "statusCheckRollup": [
    {"name": "matrix-run (test-portal)", "conclusion": "FAILURE"},
    {"name": "matrix-run (todoboss)",   "conclusion": "SUCCESS"},
    {"name": "gate",                     "conclusion": "SKIPPED"},
    {"name": "Workers Builds: test-portal", "conclusion": "SUCCESS"}
  ]
}
```

- **`mergeable: MERGEABLE`** ✅ (충돌 해소 확증)
- `mergeStateStatus: UNSTABLE` = matrix-run (test-portal) FAILURE 잔존 (**F 감사 O1/O4 정본** · main 브랜치 어설션 stale al2-tabs-three-rendered + ao4-pr-body-checklist · REG 무력화 상태 유지). K0-0914-AR (K59) · K0-0914-AU (K70) 도 동일 상태로 auto-merge 통과 관행.
- **kyu-gate = 미도장** (새 SHA `1c97121` 대해 재도장 필요 · Kyu app 재트리거 대기).

### C.3 auto-merge 관찰 → 머지 갇힘 우회 규약 발동

- kyu-gate 미도장 · Workers Builds SUCCESS 만으로는 auto-merge 조건 미충족.
- Kyu 지시 = "안 되면 `gh pr merge 94 --squash`" 정본대로 즉시 진행.

**squash 머지 실행**:
```
$ gh pr merge 94 -R CuriocityDevAi/test-portal --squash --delete-branch
```

**결과 확증** (`gh pr view 94 --json state,mergeCommit,mergedAt`):
```json
{
  "state": "MERGED",
  "mergeCommit": {"oid": "20de580b9cd5e8b2b8ec4060fd34b64cda7b87b8"},
  "mergedAt": "2026-09-15T08:08:14Z"
}
```

**main SHA** = `20de580b9cd5e8b2b8ec4060fd34b64cda7b87b8`
**브랜치** = `feat/k1-0914-a-push-bridge` 자동 삭제 완료

### C.4 후속 (Cloudflare Workers Builds auto-deploy)

- main SHA `20de580` = Cloudflare Workers Builds 자동 트리거 대상 (CLAUDE.md § 9.5 정합 · 통상 1~3분).
- Workers secret 5종 (VAPID_PUBLIC/PRIVATE_KEY · PUSH_WEBHOOK_TOKEN · relay PORTAL_PUSH_WEBHOOK/TOKEN) = K1-0914-A 라운드에서 K1 직접 편입 완료 · auto-deploy 새 version 이 자동 상속 (CLAUDE.md § 5.11).
- **Kyu 실기 진입 준비 완료** (arrival 조건 = 배포 완료 후 · § kyu_checks 3항 정본).

*K1-0914-C · 2026-09-15 · PR#94 마감 · 충돌 해소 + squash 머지*

---

*K1-0914-A · 2026-09-14 · K1 배관 허브 재정의 첫 라운드 · K1-0914-C 로 마감*
