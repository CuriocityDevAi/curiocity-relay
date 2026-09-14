# K1-0914-A · 심문 (§ ③ 정본)

**허브**: K1 (신 정체성 · test-portal 배관 허브 · K0 UI 병행)
**브랜치**: `feat/k1-0914-a-push-bridge` (main 기저 · fetch+merge 이미 clean · 신 커밋 0)
**CYCLE**: v1.2 § ② 큐/스펙 게시 + § ③ 심문 · 즉시 구현 금지 · Kyu 답 회수 후 실행

---

## 큐/스펙 실측 (§ ②)

### 1. 큐 (test-portal 로컬)
```
ops/dispatch/inbox/   = 7건 (P2.2/2.3/2.4/2.5/2.6, P5, deeplink-todoboss)
ops/dispatch/active/  = 0
ops/dispatch/await-kyu/ = 1 (20260727-1000-p2-2-0-access-before-real-data)
```
K1-0914-A 는 dispatch inbox 밖 · Kyu 직접 발부 라운드 (K0-0914-AR-D 인수).

### 2. EPIC-STATE
- **Active** 5건 — K0-0914-AR (부르는 포털 · **본 라운드의 뿌리** · Kyu 실기 대기) · K0-0904~0911 디자인 · P2 SUBMIT live · K33 모바일.
- **Deferred** 8건 · **STALE 없음** (전항 last_touched < 7일).
- 본 라운드 = **K0-0914-AR 잔여 (실 push 발송 · Expo tunnel 실 확장) + F 감사** 를 K1 이 인수.

### 3. 동결 스펙 인용 (SPEC 원문)
- **§ AR-B2** (v1.59): "SW = `static/sw.js` · 클라이언트 subscribe · unsubscribe · notify + VAPID public key endpoint. Webhook = relay Action → 포털 /api/push/notify. K0-0914-AR 최소본 = subscription 저장 + webhook 인증 스캐폴딩. **실 web-push 발송은 별건 라운드** (web-push 라이브러리 or Workers 호환 라이브러리 편입)"
- **§ AR-C** (v1.59): "`config/projects.json` = `agilo-medusa-pos-fork` 안 `projectType: 'expo'` 편입. API = `/api/expo/start` (POST) · 데몬 지시 스캐폴딩. **데몬 실 확장 (`npx expo start --tunnel` · exp:// URL 캡처) = 별건 라운드** (kyu-bridge `src/expo.mjs` 신설 · Kyu 클릭 doc `K0-0914-AR-C-expo.md`)"
- **CLAUDE.md § 5.3 자작 최소 원칙** — 신규 의존 도입 시 [PLAN-OSS] 게이트 필수.
- **CLAUDE.md § 3 DB 신설 금지 · 예외 K0-0807-U** — push_subscriptions D1 = K0-0914-AR-B2 편입 (migration 0005 · 정본 소비).

### 4. K1 인수 근거 재확증
`EPIC-STATE.md` Active 첫 항목 note = "**AS 인수 = kyu-bridge Expo 확장 + web-push 실 발송 + PopMenu · octicon 잔여 · 중첩 푸시 마무리 + kit 승격 + 자동 로그인**". 본 라운드 = 그 인수 중 **web-push 실 발송 + Expo tunnel** 을 K1 이 스코프 정의로 흡수. PopMenu/octicon/kit/자동 로그인 = **K0 잔여** (파일 경계 정합 · K1 침범 금지).

---

## 인증 실측 (블로킹 확증)

Kyu 원문 "전부 K1 직접 (Kyu 클릭 없음)" — 세션 실증:

| 도구 | 실측 | 판정 |
| --- | --- | --- |
| `npx wrangler whoami` | OAuth `l.youngkyu@gmail.com` · workers write · Account `34a8e5b1710f7507d8dccb640686e88b` | ✅ K1 직접 `wrangler versions secret put` 가능 |
| `gh auth status` | `CuriocityDevAi` · scopes `repo,workflow,gist,read:org` | ✅ K1 직접 `gh secret set` (curiocity-relay Actions) 가능 |
| Node | v22.23.1 (`.nvmrc` 정합) | ✅ |

**결론**: A1 secret 편입 · A2 relay secret 편입 = 세션 직접 실행. Kyu 클릭 필요 = **iOS PWA 실기** (아이폰 홈 화면 설치 + 알림 허용) 만.

---

## (a) 확인 질문 (블로킹 4건 · 답 필수)

### Q1. 이전 K1 (REG runner · K1-0903-D) 폴더 정리
- 현재 `curiocity-relay/k1/` 안 = `K1-0903-D-report.md` (K1 REG 완결 리포트 · 2026-09-03) 잔존.
- README **[청소] § 1** = "push 시 자기 허브 폴더의 기존 파일을 같은 커밋에서 삭제 (허브당 리포트 1 개 유지)".
- **K1 권고 (기본 실행)**: 이번 라운드 push 시 `K1-0903-D-report.md` 삭제 + `K1-0914-A-report.md` 게시 (README 규약 정합). 옛 REG 이력 = `git log` 정본.
- **Kyu 회신 필요 항목**: (a) 삭제 OK, (b) 병존 (예외), (c) 다른 처리.

### Q2. web-push 라이브러리 선택 (§ 5.3 [PLAN-OSS] 게이트 대상)
Workers 안 실 발송 3 옵션:
- **(가) `web-push` npm** — Node 지향 (crypto 모듈 · net · fs 소비) · Workers 미지원 · **fail 확정**.
- **(나) `web-push-cf` npm (@rocwang/web-push-cf)** — Workers 특화 · deps 0 (crypto.subtle 만) · 유지 관리 활성도 중간 (마지막 커밋 2024) · GitHub star 60±.
- **(다) 자작** — crypto.subtle 로 VAPID JWT (ECDSA P-256 서명) + payload 암호화 (aes128gcm · HKDF · ECDH) — 약 200~300 라인 · RFC 8291 준수. 유지 부담 큼.
- **K1 권고**: **(나) → 실패 시 (다)**. (나) 채택 시 CLAUDE.md § 5.3 [PLAN-OSS] 블록 편입 필수 (신규 의존 · Kyu 승인 게이트).
- **Kyu 회신 필요 항목**: (가·나·다) 선택 · 또는 다른 라이브러리 지정.

### Q3. F 감사 · 스코프 · 저장 위치
- 원문 = "grownest·todoboss·test-portal·storeport·agilo 포크의 CI 존재·PR 실행·최근 통과율 · PR#90 unstable 정체 · regression-runner 실제 자동 실행 여부·주체 · 시드 고정 여부. 수정 금지 · 표로."
- **감사 결과 저장 위치**:
  - (a) 리포트 (`k1/K1-0914-A-report.md`) 안 표로만 (Kyu 원문 기본).
  - (b) 추가로 `docs/audits/K1-0914-A-ci-audit.md` 별도 아카이브 (K0 세션 재열람 대비).
- **K1 권고**: (b) — 감사 결과 = 후속 K1 라운드 (자동 회귀 인프라 개선) 근거 · 아카이브 필요.
- **감사 깊이**:
  - workflow 파일 인벤토리 (`gh api /repos/<org>/<repo>/actions/workflows`) — 5분.
  - 최근 30 runs 통과율 (`gh run list -R <repo> -L 30`) — 5분.
  - PR#90 unstable 뿌리 = **test-portal** ("K0-0911-AQ 착지 라운드 PR" · SUBMIT live 실기 미확증 컨텍스트 관련) — 30분.
  - regression-runner 자동 실행 = `regression.yml` schedule/dispatch 트리거 실 histories — 15분.
  - 시드 고정 = migrations 0004_case_run.sql seed 데이터 · 각 리포 fixtures — 30분.
  - **총 소요 = 약 1.5시간**.
- **Kyu 회신 필요 항목**: (a·b) 저장 선택 · 감사 깊이 조정.

### Q4. relay `checks/<hub>/<ID>.md` 규약 · 신설 초안
- 원문 = "`checks/<hub>/<ID>.md` 규약(README) + build-index에 checks 집계 + 상태 전이 · Action의 Notify 스텝 실 동작"
- **현재 relay 구조 부재** — `checks/` 폴더 미존재.
- **K1 초안 (Kyu 확인 요청)**:
  - 파일: `checks/<hub>/<ID>.md` · frontmatter = `id · hub · state (pending|green|red|blocked) · updated_at · pr · summary` · 본문 = 상태 사유 (Kyu 판정 · 자동 어설션 결과).
  - 목적: kyu-gate 판정 이력 + 각 라운드 착지/blocked 상태를 relay 정본으로 집계 (포털 카드 부활 · 다중 허브 대시보드).
  - 상태 전이: `pending → green` (Kyu 실기 통과 · Kyu 회신 반영) · `pending → red` (결함 회수 필요) · `pending → blocked` (외부 대기 · 승인/인프라).
  - `build-index.mjs` 확장 = `collectChecks()` · `index.json.checks[]` (schema_version 2 · schema v1 호환).
- **Kyu 회신 필요 항목**: (a) 초안 OK · (b) 필드/상태 수정 · (c) 목적 불명 · 취소.

---

## (b) 충돌 · 중복 지적 (2건)

### C1. K1 이름 재사용 · 정체성 이질
- **옛 K1 (K1-0902/0903)** = REG 러너 워크트리 · 4단계 완결 · K0 흡수 인수인계 완료 (EPIC-STATE Deferred). tools/regression-runner/ · migrations/0003·0004.
- **신 K1 (K1-0914-A)** = test-portal 배관 (push + Expo tunnel + F 감사).
- **동명 이질** · Kyu 원장에서 K1 파싱 시 이력 혼선 (특히 relay `checks/k1/`).
- **K1 관측**: 옛 K1 이 완결 (Deferred · 워크트리 폐쇄 대기) 이므로 상표 재사용 가능. 단 **본 라운드 리포트 안에 인수 명시 필요** ("K1 상표 = REG 완결 후 test-portal 배관 허브로 재정의 · K1-0914-A 정본").
- **Kyu 판정 필요**: 상표 재사용 OK · 별도 상표 (예: K2) 발부.

### C2. `.github/**` 파일 경계 · K1 소유 vs K0 auto-merge 워크플로
- `.github/workflows/kyu-gate-auto-merge.yml` = K0-0902-AD 편입 (kyu-gate 도장 → auto-merge).
- `.github/workflows/regression.yml` = K1-0902-D 편입 (regression matrix CI).
- **파일 경계** = ".github/** = K1" 원문 그대로 = **auto-merge.yml 도 K1 소유**로 이관 (K0 은 소스 UI 만).
- **K1 관측**: 편집 필요 시점 아직 없음 (이번 라운드 수정 계획 없음) · 향후 K0 라운드에서 auto-merge.yml 편집 시 파일 경계 위배 위험.
- **Kyu 판정 필요**: (a) 원문 그대로 (auto-merge.yml 도 K1 이 관리) · (b) auto-merge 는 예외 (K0 도 편집 가능) · (c) 원장에 명시.

---

## (c) 요구사항 자체 반론 (1건)

### R1. "F 감사" 스코프 · 라운드 무게 대비 결과 활용
- F = 읽기 전용 감사 (5 리포 CI 통과율 등). 결과물 = 표 1장.
- 라운드 무게 절반 (A1/A2/A3 전량 실 구현 · web-push 자작 검토 · Expo tunnel · relay 규약) + F 감사 병행 = 시간 압박.
- **K1 반론**: F 감사 = 별건 K1 라운드 (예: K1-0916-B · **후속 회귀 인프라 개선 착수 근거**) 로 분리. 이번 라운드 = A1/A2/A3 집중 · F 는 표만 초안 (심층 분석 별건).
- **Kyu 판정 필요**: (a) F 감사 이번 라운드 병행 유지 · (b) 별건 라운드 분리 · (c) F 초안만 (표 · 심층 분석 별건).

---

## (d) 역제안 (K0-0724-H 정본 · UX/기능 능동 제기 · 5건)

### D1. web-push subscription 만료 처리
- 브라우저 subscription = 만료 가능 (endpoint 410/404). 현재 notify 경로 = 발송 실패 endpoint 남김.
- **K1 권고 (필요)**: 발송 시 410/404 응답 감지 → `push_subscriptions` DELETE (전기기 정리). 스펙 § AR-B2 미명시.

### D2. PUSH_WEBHOOK_TOKEN 로테이션 규약
- 토큰 = openssl rand -hex 32 · Kyu 클릭 시점 1회 발급 (K0-0914-AR-B2-web-push.md).
- 유출 대비 로테이션 방법 = wrangler versions secret put + gh secret set 재쌍 (수동).
- **K1 권고 (불필요)**: 이번 라운드 스코프 밖 · 별건 (P3 후속).

### D3. iOS PWA subscribe 실패 UX
- iOS 16.4+ 홈 화면 PWA 만 push 지원 · 홈 미설치 상태에서 [알림 켜기] 클릭 = 무반응 or 오류.
- 현재 `push-client.ts` = registerServiceWorker 성공 판정 만. iOS Safari 브라우저 컨텍스트 감지 부재.
- **K1 권고 (필요)**: `window.navigator.standalone === false` (iOS Safari 판정) + iOS UA 감지 시 [알림 켜기] disable + 안내 배너 ("홈 화면에 추가 후 사용"). K0 파일 경계 밖 (src/routes/**) · **K0 라운드 회부**.

### D4. QR SVG 라이브러리 (Expo tunnel 상세 [폰에서 열기])
- Kyu 원문 09-14 (K0-0914-AR-C-expo.md § 3 맥 절차) = "QR SVG 표시 (별건 라운드 편입 시)". **이번 라운드가 그 별건**.
- 옵션:
  - `qrcode-svg` npm — deps 0 · 유지 관리 활성 · 25KB.
  - `qrcode` npm — deps 5 · 유지 관리 활성 · 500KB.
  - 자작 — Reed-Solomon 인코딩 · 상당 부담.
- **K1 권고 (필요)**: `qrcode-svg` 채택 (deps 0 · [PLAN-OSS] 게이트 통과 예상). Kyu 확인 요청.

### D5. checks/ 규약 · GitHub Actions Checks API 통합 여부
- `checks/<hub>/<ID>.md` = relay 자체 규약 (K1 관측).
- **GitHub Checks API** (P3 kyu-gate) 와 별건 · 이중 정본 위험 없음? 
- **K1 권고 (필요)**: relay checks = **오케 대시보드용 요약** · GitHub Checks API = kyu-gate 도장. 정본 분리 명시 (README).

---

## 결론 · Kyu 답 요청 항목 정리

**즉답 필요 (블로킹)**:
- Q1 (옛 K1 리포트 처리) · Q2 (web-push 라이브러리) · Q3 (F 감사 저장·깊이) · Q4 (checks/ 규약 초안)
- C1 (K1 상표 재사용) · C2 (auto-merge.yml 경계)
- R1 (F 감사 별건 분리 여부)

**병행 확인 (실행 시 채택)**:
- D1 (subscription 만료 처리) · D3 (iOS PWA 안내 · K0 회부) · D4 (qrcode-svg 채택) · D5 (checks/ 정본 분리 명시)

**답 회수 후 K1 실행**: A1 → A2 → A3 → F (판정 반영) → DOC → BUILD/REPORT.
착지 = feat/k1-0914-a-push-bridge PR + relay k1/K1-0914-A-report.md.

---

*K1-0914-A · 2026-09-14 · CYCLE v1.2 § ③ 정본 심문*
