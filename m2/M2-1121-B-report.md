M2-1121-B

멈춤 원인: setup-node `cache:'npm'` → self-hosted `~/.npm` 15GB GitHub Actions cache 업로드 → POST 단계 14분 09초 hang · 수정: `cache:'npm'` 제거 · route job 추가 (Mac busy → ubuntu · 5건 quota) · lint overflow O · PR #222

---

## 원인 확정

**job ID**: 136677491022  
**run**: #537 (master, 2026-11-21T01:20)  
**멈춘 단계**: step 9 "Post Run actions/setup-node@v4"

```
started_at:   2026-11-21T01:21:36Z
completed_at: 2026-11-21T01:35:45Z
소요:          14분 09초
```

**원인**: `lint.yml` `actions/setup-node@v4`의 `cache: 'npm'` 설정이 self-hosted 러너(`curiocity-mac-fork`)의 `~/.npm` 디렉터리를 GitHub Actions Cache Service 에 업로드.  
로컬 npm 캐시 크기: **15GB** (`~/.npm` 15G / `_cacache` 14G).  
GitHub Actions cache 는 개별 항목 업로드에 10GB 한계가 있고, self-hosted → GitHub servers 네트워크 업로드 속도 한계로 인해 14분+ hang → timeout 경계에서야 러너 해제.

**재발 패턴 확인**: run #538 (feat/M3-1120-B-cd-preview-r1 Lint, 동일 구버전 lint.yml, job 136677546426) 도 2026-11-21T01:40:39Z 부터 동일 단계에서 hang 중 (실측 당시 in_progress).

---

## 수정 내용

**파일**: `.github/workflows/lint.yml`  
**브랜치**: `ci/M2-1121-B-lint-no-cache`  
**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/222

### 변경 요약

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| `cache: 'npm'` | `actions/setup-node@v4` with 에 존재 | **제거** |
| `runs-on` | `[self-hosted, curiocity-mac-fork]` 고정 | `${{ fromJSON(needs.route.outputs.runs_on) }}` |
| `route` job | 없음 | **추가** (ci.yml 과 동일 route-fork.sh 규칙) |
| `timeout-minutes` | 15 | 5 (lint ~1분) |
| `node-version` | 22 | 20 (ci.yml 과 통일) |

**왜 `cache:'npm'` 제거**: self-hosted 러너는 `~/.npm`이 실행 간 유지(15GB 로컬). GitHub Actions cache 업로드 불필요. ubuntu 폴백 시에도 lint 전체 ~1분 → 캐시 없어도 acceptable.

**route 추가 근거**: ci.yml 과 동일한 `route-fork.sh` 사용. Mac busy + quota < 5 → ubuntu · quota 초과 시 Mac 대기. lint cloud run 은 quota 카운트에 미계상 (lint 는 ~1분 · 비용 미미 · ci.yml heavy-cloud 카운터와 별개).

---

## lint overflow

**O** (overflow 활성화)

route job 추가로 Mac busy 시 ubuntu-latest 폴백 가능.  
quota 판단: `route-fork.sh` 의 `_cloud_today()` = ci.yml heavy-cloud 카운트 기준 (5건/일 + relay extra).  
실측 route 결정 (run #540 route job 136684129810): `runner_busy=true · cloud_today=5 quota=5 → self-hosted (quota exceeded)` — 오늘 quota 이미 소진, 올바르게 Mac 대기.

---

## 실측 검증

**미검증** (작성 시점 기준)

수정 브랜치 lint job (run #540, job 136684346915) 이 Mac 러너 대기 큐에서 queued 상태 (2026-11-21T01:42:06Z).  
현재 Mac runner 는 구버전 lint job (run #538, job 136677546426) 의 POST hang 으로 점유 중 (~01:55 timeout 예상).  
run #540 가 완료되면 본 리포트를 업데이트.

---

## 추가 관찰

- run #538, #539 (구버전 lint.yml 사용 브랜치) 는 여전히 hang 패턴 재발. PR #222 머지 후 master 적용 전까지 기존 브랜치 lint는 계속 hang 가능.
- ci.yml `assertions/flow-tests/playwright` 도 `cache:'npm'` 보유 → 대기 시간이 충분하거나 cache hit 으로 현재 미발현. 추후 동일 패턴 발현 가능성 있음 (Kyu 판단 유보).
- route-fork.sh `_cloud_today()` 는 ci.yml 전용. lint.yml cloud run 별도 카운트 미구현 (리포트 목적으로만 명기).
