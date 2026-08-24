# K0-0824-AC · PR 카드 [🚀 테스트 환경] 원버튼 (헬스체크 body 검증 · LAN QR)

**round_id**: K0-0824-AC
**hub**: k0 (test-portal)
**pr**: test-portal_PR#78
**branch**: feat/k0-0824-ac-pr-launcher-onebutton
**status**: PR 심리 대기 · Kyu 실기 4단계 (배포 후)
**timestamp**: 2026-08-24

## 요지

**Kyu 실측 08-24 · 뿌리 fix 완결**. 심문 게이트 통과 (10문 · 전 항목 K0 권고 채택).

**뿌리**: Todoboss 열려는데 GrowNest 화면 = 4173 (Vite preview 기본값) 공용 + 응답 body 무검증.

## 뿌리 실측 & 대응

**실측 근거** (Kyu 실 화면 실측):
| 프로젝트 | 실측 title | signature | notContains |
|----------|-----------|-----------|-------------|
| grownest | `<title>GrowNest - Family Growth Tracking</title>` | `GrowNest` | TODOBOSS/StorePort/Anchor/test-portal |
| storeport | `<title>Anchor · StorePort POS</title>` | `Anchor`·`StorePort POS` | GrowNest/TODOBOSS/test-portal |
| todoboss | `<title>TODOBOSS Admin</title>` | `TODOBOSS` | GrowNest/StorePort/Anchor/test-portal |
| test-portal | `<meta apple-mobile-web-app-title="test-portal">` | `test-portal` | GrowNest/TODOBOSS/StorePort/Anchor |

**대응 정본** (Q5): config/projects.json v3 안 signatures + **notContains** (뿌리 방어 핵심 · 2026-08-24 실측 = notContains 검사 안 함 = 뿌리).

## 착지 (14 files · +1200 insertions)

| 파일 | 역할 |
|------|------|
| `config/projects.json` v3 | AC-3 · previewPort + healthCheck 확장 · 각 signature 실측 근거 |
| `src/lib/registry.ts` | Project.healthCheck + verifyBodyMatchesProject helper |
| `tools/kyu-bridge/src/lan-address.mjs` (신설) | AC-4b · mDNS 우선 · Wi-Fi en0 IPv4 폴백 |
| `tools/kyu-bridge/src/preview-flow.mjs` (신설) | AC-1 · runPreviewFlow · verifyBody · git · lsof · fetch |
| `tools/kyu-bridge/src/server.mjs` | AC-1c · POST /preview-start endpoint |
| `src/lib/kyu-bridge-client.ts` | AC-1d · PreviewProject/Response + previewStart |
| `src/lib/LauncherButton.svelte` (신설) | AC-1e · 버튼 + modal + QR + LAN URL + 배너 |
| `src/lib/qrcode-svg.d.ts` (신설) | qrcode-svg 타입 shim |
| `src/lib/PrList.svelte` | AC-1f · 항상 노출 (Q1 a1) |
| `src/lib/github.ts` · `data-source.ts` | PortalPR.head_ref 필드 |
| `package.json` | qrcode-svg 1.1.0 (Q8 [PLAN-OSS] 승인) |
| `tools/kyu-bridge/test/lan-address.test.mjs` · `preview-flow.test.mjs` | 15 case |
| `docs/design/kyu-orchestrator-v0.3.md § 9.22` · § 9.15 AC-0 등재 | 착지 표기 |
| `docs/SPEC.md` v1.45 · `docs/requirements-tracking.md` K45 | 정본 갱신 |

## Kyu 판정 정합 (전 항목 채택)

- **Q1(a1)** 항상 노출 · flag 없음
- **Q2(b2)** runPreviewOneClick 신 flow (runOneClick 별건)
- **Q3(c1)** git checkout · dirty stash 금지 · uncommittedFiles UI
- **Q4(d2)** 자동 복원 안 함 + currentBranch 배너 항상
- **Q5** config v3 · signatures + notContains + `_signatureSource` 실측 근거
- **Q6(e1)** 데몬 안 헬스체크 · start = 헬스체크 통과까지 · 단계별 phase
- **Q7(f2)** 4173 점유 시 강제 종료 금지 · conflictingPid/Command 반환 · f1 별건
- **Q8(g2)** qrcode-svg 1.1.0 · 자작 금지
- **Q9** mDNS 우선 · en0 Wi-Fi IPv4 폴백 · en1/en2 후순위 · QR 아래 텍스트
- **Q10** AC-5 다음 라운드 분리 (규모 정본화)

## AC-0 봉인 등재

`~/.kyu-bridge/logs/session-k0-*.log` = exit=143 (SIGTERM). 실측 원인 = orchestrator `readingTimeoutMs` 45s 초과 시 session-manager `_runInvoke` 안 `setTimeout` → `child.kill('SIGTERM')`. K0 스코프 봉인 규약 적용 · 마무리 3조건 밖 · design § 9.15 스코프 밖 이연 편입.

## QC

```
pnpm check → COMPLETED 971 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
pnpm test  → Test Files  60 passed (60) · Tests  783 passed (783)
pnpm build → adapter-cloudflare ✔
```

**신설 15** = lan-address 5 + preview-flow 10.

## Kyu 실기 self-contained (배포 후)

**어디를 누르는가**: `https://test.curiocity.company/prs?repo=todoboss` PR 카드 하단 파란색 `🚀 테스트 환경` 버튼.

**정상 화면 표기 (프로젝트별)**:
- grownest = **GrowNest - Family Growth Tracking**
- storeport = **Anchor · StorePort POS**
- todoboss = **TODOBOSS Admin** ⚠ 뿌리 검증 대상
- test-portal = **test-portal**

**4단계**:
1. 데몬 재설치 (`kyu-bridge uninstall && install`)
2. PR 카드 [🚀 테스트 환경] 클릭 · modal 진행
3. QR (220px) + 폰 주소 (예: `http://kyu-macbook.local:4173/`) + signature 매치 표시
4. 아이폰 카메라 스캔 → Safari → **TODOBOSS Admin** 화면 확증 (같은 Wi-Fi)

**실패 시나리오**:
- `커밋 안 된 변경이 있어 전환 못 함` (Q3 · 자동 stash 안 함)
- `다른 프로세스가 4173 점유 중 (pid=... command=...)` (Q7 f2 · 강제 종료 안 함)
- `헬스체크 실패 · 감지된 위반: GrowNest` = **2026-08-24 뿌리 감지 확증**

## 이연 순증감

- **AC-5 다음 라운드 분리** (Kyu Q10 · PR body yaml 체크리스트 파싱)
- **AC-0 exit=143 봉인 등재만** · 착수 금지 (K0 스코프 봉인 규약)
- **todoboss 리포 4173 이동 = 별건 dispatch** (Kyu Q7 f2 만)
- **기존 이연 유지** (X · Y · Z · AA · AB 6종)

## PR

https://github.com/CuriocityDevAi/test-portal/pull/78
