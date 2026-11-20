# R0-1120-H 리뷰 리포트

**#216 CHANGES · #407 APPROVE · Mac 실행 O(curiocity-mac-fork) · 머지 순서: #407 먼저 → #216 버그 수정 후**

---

## #216 agilo-medusa-pos-fork — CHANGES REQUIRED

### ❌ YAML syntax error (ci.yml 파싱 실패 — CI run 미생성)

**원인**: `heavy-cloud` job step에서 YAML plain scalar 내 `: ` 시퀀스.

```yaml
# 현재 (broken):
      - run: echo "cloud routing active (combined quota: storeport+fork ≤ 5/day)"
#                                                       ↑ ': ' → YAML mapping indicator
```

```yaml
# 수정:
      - run: |
          echo "cloud routing active (combined quota: storeport+fork ≤ 5/day)"
```

**증거**:
- actionlint: `could not parse as YAML: mapping values are not allowed in this context [syntax-check]`
- CI push run 44703585226: total_count=0 jobs, "workflow file issue"
- PR의 `gh pr checks` 에 CI run 자체가 없음 (Lint만 존재)

### ✅ 나머지 항목

| 항목 | 결과 |
|------|------|
| route-fork.sh --test 17 | 17/17 ✅ |
| Mac 우선 · draft/main-push → self-hosted | 로직 정확 ✅ |
| busy → cloud (quota 미만) | 정확 ✅ |
| busy + 한도 도달 → self-hosted + 라벨+코멘트 | 정확 ✅ |
| offline/미등록 → queued 대기 (클라우드로 새지 않음) | 정확 ✅ |
| force_cloud + 한도 초과 → self-hosted | 정확 ✅ |
| API 실패 → self-hosted fallback | 정확 ✅ |
| extra 비정수 → self-hosted | 정확 ✅ |
| fork+storeport 합산 케이스 (5건) | 정확 ✅ |
| extra 는 Kyu 만 올림 (허브·오케 금지) 명문화 | ✅ |
| lint.yml / ci-summary.yml → curiocity-mac-fork | ✅ |
| macOS: ImageMagick brew · Playwright path · apt-get guard | ✅ |

---

## #407 storeport — APPROVE ✅

| 항목 | 결과 |
|------|------|
| route-heavy.sh --test 21 | 21/21 ✅ |
| CI 체크 (heavy-mac / route / changes-filter / check / markers) | 전부 pass ✅ |
| heavy-cloud | skipping (클라우드 미사용, 정상) ✅ |
| PARTNER_REPO 합산 로직 | storeport=2+fork=1=3→ubuntu, 5→blocked 정확 ✅ |
| MOCK_CLOUD_OWN / MOCK_PARTNER_CLOUD 목업 추가 | ✅ |
| ci.yml 변경 최소 (env 1줄 추가만) | ✅ |

---

## Mac 실행 확인

```
runner_name: curiocity-mac-fork
runner_group_name: Default
labels: ['self-hosted', 'curiocity-mac-fork']
```

Lint job (run 44703739125) → `in_progress` on `curiocity-mac-fork` ✅  
16:47 WIB 등록 후 큐에 대기 중이던 job이 정상 픽업됨.

---

## 머지 순서 의존성

- **한쪽만 머지된 경우**: 해당 리포는 상대방 클라우드 사용량을 카운트 못 함 → 5건 초과 가능 (permissive)
- **카운트가 깨지진 않음**: 단순히 상대방 카운트=0으로 처리되어 과소 계산
- **추천 순서**: #407 먼저 머지 → #216 YAML 버그 수정 후 머지
- 양쪽 모두 머지 완료 후 PARTNER_REPO 변수 설정해야 합산 활성화

---

## relay extra 경로 확인

`ci/cloud-quota/2026-11-19.json`: `"extra": 0` — 자동화가 올리지 않은 상태 ✅  
(note: "extra 5 → 오케가 0으로 되돌림" 사고 재발 방지 명문화 확인)

---

## 기존 실패 (macOS 추가 영향 없음)

| 실패 job | 원인 | macOS 차이 |
|----------|------|-----------|
| `m3-1105-aa-assertions.mjs` | "보조 버튼 3개 한 줄 (flex-row)" 단언 실패 | Node.js only, macOS 무관 — 동일 실패 |
| `m1-1117-e-slip-flow` Playwright | assertions 실패로 playwright skipped → 직접 확인 불가 | 현재 ubuntu-latest에서도 미실행 상태 |

macOS 차이 처리 현황:
- `brew install imagemagick` (if: runner.os == 'macOS') ✅
- `PLAYWRIGHT_BROWSERS_PATH` → `$HOME/Library/Caches/ms-playwright` on Darwin ✅
- `install-deps chromium` Linux only guard ✅

**⚠️ 주의**: self-hosted Mac에서 Playwright chromium 첫 설치 시 Gatekeeper quarantine이 바이너리를 막을 수 있음. 첫 실행 실패 시 `xattr -d com.apple.quarantine` 적용 필요.

---

## Kyu 가 할 설정 (머지 후)

1. **fork 리포** `Settings → Actions → Variables → New repository variable`:
   - `PARTNER_REPO` = `CuriocityDevAi/storeport`

2. **storeport 리포** `Settings → Actions → Variables → New repository variable`:
   - `PARTNER_REPO` = `CuriocityDevAi/agilo-medusa-pos-fork`

> 양쪽 모두 미설정이면 합산 카운트 비활성 (각자 5건 한도로 동작 — 의도한 합산 아님)

---

*R0-1120-H · 2026-11-20*
