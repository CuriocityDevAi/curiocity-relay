# K0-0824-AC · 심문 게시 (설계 갈림길 6 · 규모 큼 · 진행 정지)

**round_id**: K0-0824-AC
**hub**: k0 (test-portal)
**목적**: PR 카드 [🚀 테스트 환경] 원버튼 + 헬스체크 강화 + 포트 정본화 + QR + 체크리스트
**timestamp**: 2026-08-24

**진행 정지 근거**: Kyu 명시 "설계 갈림길이 있으면 relay에 inquiry로 게시하고 진행을 멈춰라." AC-1~AC-4 안 여러 갈림길 확증 · 심문 게이트 정본 발동 (CLAUDE.md § 8 ③-relay 4회차 정식).

---

## § ② 큐 · 원장 · 스펙 게시

### (1) dispatch 큐
- inbox (7): P2/P5/딥링크 · 무관
- active: 없음
- await-kyu (1 · STALE 28일): P2.2-0

### (2) EPIC-STATE
kyu-orchestrator v0.3 시리즈 후속 (K0-0807-X ~ K0-0824-AB) · loop 파일럿 별건. AC = P5 launcher 확장 계열 (K0-0729-A P5.1 launcher 기저).

### (3) 현행 실측

**원클릭 부품 (재사용 대상)**:
- `src/lib/kyu-bridge-client.ts:435` `runOneClick(client, opts)` — health → start → open 3단계. slug/browser/url 소비.
- `src/lib/launcher.ts` — buildLauncherCommand · 브라우저 오픈 command 문자열.
- `tools/kyu-devenv/src/registry.mjs` `DEVENV_REGISTRY` — 프로젝트별 포트 정본 (grownest 3000/3002 · todoboss 4000/**4173** · storeport-anchor 3010).
- `tools/kyu-bridge/src/hubs.mjs:52` `defaultHubs()` — hubs.json 재정 (동일 매트릭스).
- kyu-bridge 데몬 `POST /start`/`/stop` · `POST /open` endpoint.

**PR 카드 (수정 대상)**:
- `src/lib/PrList.svelte` (K0-0807-W · D1 추출) — 카드 = `<li class="card"><a href="/pr/<repo>/<id>">...</a></li>` · **버튼 슬롯 없음**.
- 카드 안 이미 있는 필드 = env chip · kyu-gate chip · `pr.preview_url` 있으면 [환경 열기 ↗] chip.

**AC-2 뿌리 실측 (Kyu 08-24 실측)**:
- **Todoboss 열려고 했는데 GrowNest 화면**: web-admin 포트 4173 = Vite preview 기본값 · Kyu 로컬에 이미 다른 서비스가 4173 열어놓았거나 `pnpm preview` 잔재 · 응답한 게 다른 프로젝트.
- **AC-3 뿌리 = 실측 위**: registry.mjs:74 = `{ port: 4173, label: 'web-admin' }` = 공용 기본값 · 위험.

**AC-4 QR 부품 실측**:
- 현재 코드베이스 = `qrcode` 라이브러리 부재. `package.json` deps 실측:
- npm registry `qrcode` (~600KB · widely used) or `qr-code-styling` · `qrcode-svg` (경량 · svg only) 후보.
- 자작 (Reed-Solomon 등) = 복잡 · CLAUDE.md § 3 자작 최소 위배.

**AC-5 PR 본문 파싱 실측**:
- `docs/relay-conventions.md` = pr-test-checklist-guide 게시 예정 안내 (K0-0729-D 부재 로컬 사본).
- 실 파일 없음: `pr-test-checklist-guide.md` = curiocity-relay 루트 (외부 리포).
- PR body 안 yaml block `\`\`\`yaml ... \`\`\`` 파싱 필요.

---

## § ③ 심문 게이트

### AC-0 원장 등재 (한 줄 · 즉시 처리 가능)

**exit=143 (SIGTERM) 원장 등재만**:
- `docs/design/kyu-orchestrator-v0.3.md` § 9.15 스코프 밖 이연 절 안에 등재.
- 관측 로그 줄 = 세션 로그에서 exit=143 = SIGTERM · 데몬 timeoutMs 도달 후 SIGTERM kill (loop-orchestrator readingTimeoutMs 45s 초과 시).
- 추정 원인 = invoke 타임아웃 의심 (Kyu 지시 정합) · claude 실 실행 45s 초과 = kill.
- **착수 금지 · 마무리 3조건 밖 · K0 스코프 봉인 규약 적용**.

**진행 결정 필요 없음** · 심문 통과 후 첫 커밋에 등재.

---

### AC-1 [🚀 테스트 환경] 버튼 배선

**Q1. 버튼 위치**

- **(a1) PR 카드 안 (PrList.svelte)** = 홈 · /hub/<slug> · /prs 카드마다 표시. **각 카드 좌하단 [🚀 테스트 환경] 별도 버튼** (기존 [환경 열기] chip 옆).
- **(a2) PR 상세 화면 (/pr/<owner>/<repo>/<id>)** = 상세 진입 후만. K0-0729-A launcher 상세 화면 확장.
- **(a3) 홈 카드 대체 + 상세 화면 모두** = UI 중복 · 유지 부담.

**K0 권고 = (a1) PR 카드 안** · Kyu 요구 문언 "PR 카드에 [🚀 테스트 환경] 버튼 배선" 명시. 상세 화면 = launcher (P5.1) 유지 · 별건.

**Kyu 판정** · (a1) 채택 시 = PrList props `showLauncherButton=true` 확장 or 항상 노출?

---

**Q2. 원클릭 흐름 (기존 runOneClick 재사용 or 새 flow?)**

Kyu 요구 문언 = "체크아웃 → 포트 정리 → dev 서버 기동 → 헬스체크 → 접속 URL과 QR 코드 표시".

기존 runOneClick = `health → start → open` (3단계 · 브라우저 open 포함). **PR 브랜치 체크아웃 · QR 표시 미포함**.

- **(b1) runOneClick 확장** = start 안에 checkout · QR 표시 → `open` 대신 QR display · 신 phase 필요.
- **(b2) 새 flow · runPreviewOneClick 신설** = 기존 runOneClick 은 launcher 상세 화면 용 · 새 흐름 = PR 카드 용.

**K0 권고 = (b2) 신 flow** · 이유:
- 브라우저 open (기존) vs QR 표시 (새) = 다른 UX 목표
- checkout (git 조작) = kyu-devenv `start` 안 편입 or 별도 endpoint?
- 계약 명료화

**Kyu 판정** · (b2) 시 = 새 endpoint 신설 (POST /start-preview or /checkout-start)?

---

**Q3. PR 브랜치 체크아웃 위치 (kyu-devenv 안 vs 데몬 안)**

Kyu 요구 문언 = "해당 PR 브랜치 체크아웃". 현재 kyu-devenv `start` = 로컬 리포 실행 · **체크아웃 자동 안 함**.

- **(c1) kyu-devenv 확장** = start 시 `--pr <ref>` 지원 · `git checkout <ref>` 편입.
- **(c2) 데몬 안 별도 함수** = handleStart 확장 or handleCheckoutStart 신설.
- **(c3) 클라이언트 사이드 지시** = 데몬에게 checkout 이후 start 순차 명령.

**K0 권고 = (c1) kyu-devenv 확장** · 이유:
- 이미 kyu-devenv = 리포 조작 담당 · 자연스러움.
- registry.mjs 확장 = 각 프로젝트별 checkout 절차 정의 가능.
- `stash` 있으면 대기 or 실패 정본?

**Kyu 판정** · (c1) 시 = 이미 dirty working tree 시 어떻게? (dirty = 실패 · Kyu 명시적 stash?)

---

**Q4. checkout 후 원 브랜치 복원 규약 (자동 롤백?)**

PR 브랜치 체크아웃 후 stop 시 원 브랜치로 자동 복원할 것인가?

- **(d1) 자동 복원** = start 前 브랜치 기록 · stop 시 자동 checkout back.
- **(d2) 명시적 지시 필요** = start 로 이동한 그대로 두기 · Kyu 수동 checkout main.
- **(d3) 매 tick 재확인** = 매번 PR 브랜치 checkout · 원 브랜치 상태 무관.

**K0 권고 = (d2) 명시적** · 이유:
- Kyu 로컬 브랜치 상태 = Kyu 의도가 있을 수 있음 (다른 개발 진행 등).
- 자동 롤백 = Kyu 의도와 충돌 위험.
- 명시적 복원 = UI 안 [원 브랜치 복원] 버튼 별건.

---

### AC-2 헬스체크 응답 문자열 검증

**Q5. 프로젝트별 signature 문자열 정의**

각 프로젝트 화면에 고유 signature 문자열 필요.

- 실측 필요: 각 프로젝트 실 화면 HTML 안에 무엇이 있는가?
  - grownest = `<title>GrowNest</title>` or 로고 텍스트?
  - todoboss = `<title>Todoboss</title>` or "Todoboss" 라벨?
  - storeport-anchor = `<title>...</title>` or "Anchor" · "Storeport" · POS 라벨?
  - test-portal = `<title>test-portal</title>` (자기)

**K0 권고 = 각 프로젝트별 signature 문자열을 config (`config/projects.json`) 확장 필드로 정의**:
```json
{
  "slug": "todoboss",
  "healthCheck": {
    "path": "/",
    "signatures": ["Todoboss", "todoboss"],
    "notContains": ["GrowNest"]  // 실측 뿌리 방어
  }
}
```

**Kyu 판정** · signature 값 각 프로젝트별 실측 필요.

---

**Q6. 헬스체크 실행 위치 (데몬 vs 브라우저)**

- **(e1) 데몬 안** = kyu-devenv `--wait-ready` 옵션 확장 · fetch 후 body 검증 · start 완료 시점 지연.
- **(e2) 브라우저 안** = 클라이언트가 start 완료 후 fetch 직접 검증.

**K0 권고 = (e1) 데몬 안** · 이유:
- 브라우저 = mixed content (LAN IP · http) 제한 · 정상 fetch 어려움.
- 데몬 (127.0.0.1) = LAN 접근 가능.
- start 완료 = 헬스체크까지 포함 = 명확한 계약.

**단**: 데몬 `POST /start` 응답 시간이 길어짐 (기존 60s + 헬스체크 대기).

---

### AC-3 포트 레지스트리 정본화

**Q7. Vite preview 기본값 4173 회수 방식**

현행 정의 (`kyu-devenv/src/registry.mjs:74`): todoboss web-admin = 4173.

- **(f1) 포트 이동** = todoboss/web-admin/vite.config.ts 안 `server.port` 를 4173 → 예: 4200 등 별도 값. **호스트 리포 수정 필요** (별건 PR).
- **(f2) 격리 검증** = kyu-devenv start 前 4173 리스닝 중이면 강제 종료 or 실패 alert.
- **(f3) 포트 고정 range 확정** = test-portal 관제 대상 프로젝트 = 3000-4000 (grownest/storeport) · 4001-5000 (todoboss) · 4000-4999 사이 그런데 4173 = **Vite 기본값 = 다른 로컬 서비스 겹칠 위험 근본적 · 이동 정본**.

**K0 권고 = (f1) 포트 이동** + (f2) 격리 검증 · 이유:
- 4173 = Vite `pnpm preview` 관행 기본값 · 다른 프로젝트 preview 실행 중이면 겹침 반복.
- 호스트 리포 vite.config 수정 = 별건 PR 필요 (todoboss 리포).
- **본 라운드 = kyu-devenv registry 안 잠정 다른 포트 (예: 4174) 정의** + todoboss 리포 dispatch 지시.

**Kyu 판정** · 새 포트 값 승인 (예: 4174) or 다른 값?

---

### AC-4 QR 코드 (LAN IP · 폰 접속)

**Q8. QR 코드 라이브러리 vs 자작**

- **(g1) `qrcode` npm** (~600KB · 표준 · widely used · Reed-Solomon 검증됨)
- **(g2) `qrcode-svg`** (~50KB · SVG 전용 · 경량)
- **(g3) 자작** = Reed-Solomon 인코딩 자작 = CLAUDE.md § 3 자작 최소 위배.

**K0 권고 = (g2) `qrcode-svg`** · 이유:
- 경량 (~50KB · 자작 최소 정합)
- SVG = 브라우저 native · 스타일링 쉬움
- deps 도입 = [PLAN-OSS] 심문 필요 (CLAUDE.md § 3 자작 최소 감사)

**단 [PLAN-OSS] 승인 필수**:
- 대안 = 자작 (~500 lines Reed-Solomon)
- 대안 = 서버 사이드 QR (kyu-devenv 안 `qrencode` CLI · macOS `brew install qrencode`)
- 대안 = 링크 텍스트만 (QR 없이 · Kyu 요구와 어긋남)

**Kyu 판정** · deps 도입 승인?

---

**Q9. LAN IP 획득 · localhost 금지 정본**

Kyu 요구 = "맥과 아이폰이 같은 네트워크일 때 폰에서 열리는 주소". localhost/127.0.0.1 = 폰에서 못 열림.

- **(h1) 데몬이 LAN IP resolve** = `os.networkInterfaces()` · 첫 non-internal IPv4 (예: `192.168.1.42`).
- **(h2) 브라우저 안 resolve** = `location.hostname` (이미 test.curiocity.company · 다른 도메인).
- **(h3) LAN 도메인 (mDNS/Bonjour)** = `<mac-hostname>.local` (예: `kyu-macbook.local`).

**K0 권고 = (h1) 데몬 os.networkInterfaces() + (h3) fallback** · 이유:
- 데몬 = 로컬 네트워크 실측 가능
- IP = DHCP 이동 시 변경 · mDNS `.local` = 안정
- fallback = mDNS 우선 · IP fallback? or 반대?

**Kyu 판정** · 우선순위? 다중 인터페이스 (Wi-Fi + Ethernet) 시 어느 것?

---

### AC-5 PR 체크리스트 파싱 (별건 분리 후보)

**Q10. AC-5 = 이번 라운드 착지 or 다음 라운드 분리?**

Kyu 명시: "규모가 과대하면 AC-1~AC-4(원버튼)만 착지시키고 AC-5는 다음 라운드 분리로 보고해라."

**K0 권고 = AC-5 다음 라운드 분리**. 이유:
- AC-1~AC-4 = 원버튼 완결 (버튼·체크아웃·헬스체크·QR)
- AC-5 = PR body yaml 파싱 · 체크박스 상태 저장 (localStorage vs Workers KV vs D1) · 별도 완결
- 규모 = AC-5 만 ~500 라인 (yaml parser + UI 컴포넌트 + 저장소)

**Kyu 판정 · AC-5 분리 승인?**

---

### 요약 판정 대기 (10 문 · 설계 갈림길 6)

1. **Q1** 버튼 위치 · K0 권고 = (a1) PR 카드 안
2. **Q2** 원클릭 흐름 = (b2) 새 flow
3. **Q3** checkout 위치 = (c1) kyu-devenv 확장
4. **Q4** 복원 규약 = (d2) 명시적
5. **Q5** signature 문자열 = config/projects.json 확장
6. **Q6** 헬스체크 위치 = (e1) 데몬 안
7. **Q7** 포트 이동 = (f1) todoboss 4173 → 4174 (or Kyu 지정) + 호스트 리포 별건 PR
8. **Q8** QR 라이브러리 = (g2) qrcode-svg [PLAN-OSS] 승인 필요
9. **Q9** LAN IP = (h1) os.networkInterfaces + (h3) mDNS fallback (우선순위 판정)
10. **Q10** AC-5 분리 = 다음 라운드

**설계 갈림길 6**: 버튼 위치·flow 구조·checkout 위치·signature 정의·포트 이동값·QR 라이브러리·LAN IP 우선순위·AC-5 분리.

**정지**: Kyu 회신 후 실행. 즉시 구현 금지.

**게시 방식**: CLAUDE.md § 8 ③-relay 정본 4회차 정식 적용 (K0-0807-U · W · X · **AC 네 번째**).

---

## PR 예정
- 브랜치: `feat/k0-0824-ac-pr-launcher-onebutton`
- Kyu 회신 대기 · 회신 후 구현 → PR → k0/K0-0824-AC-report.md push

## AC-0 등재 (심문 통과 후 첫 커밋 편입)

design § 9.15 스코프 밖 이연 절에 한 줄 등재:
> - exit=143 (SIGTERM) invoke 타임아웃 의심 (K0-0824-AC 봉인 · 착수 금지 · 마무리 3조건 밖) · 세션 로그 실측 = exit=143 = 데몬 SIGTERM kill (readingTimeoutMs 45s 초과 추정).
