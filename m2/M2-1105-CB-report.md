# M2-1105-CB 리포트

PR#284 · 로컬 docker build/run = **docker 미검증**(colima 없음) · CI docker job = **재활성화됨** · Kyu 클릭 단계 = PR 본문 참조

---

## 변경 파일

| 파일 | 내용 |
|------|------|
| `apps/commerce-core/Dockerfile` | `cd-builder` stage 추가(customer-display 별도 빌드) · 모든 COPY 경로를 `apps/commerce-core/...` 로 변경 · 조건부 "없으면 건너뜀" 제거 → 없으면 빌드 실패 |
| `.dockerignore` (신규) | anchor·wing·care-agent·node_modules·.git 제외 |
| `railway.json` | `dockerfilePath: apps/commerce-core/Dockerfile` 추가 |
| `apps/commerce-core/docker-compose.smoke.yml` | `context: ../..` · `dockerfile` 명시 |
| `.github/workflows/ci.yml` | docker-smoke `if: false` 해제 · commerce_core filter 확장 |

## 로컬 셸 검증 로그

```
$ pnpm --filter customer-display run build:web
  → Exported: dist  (index.html 포함 10개 정적 라우트)

$ pnpm install --filter customer-display --frozen-lockfile
  → Done in 1.2s (lock 정합 · 0 오류)

$ python3 COPY 경로 존재 확인
  ✓ pnpm-workspace.yaml
  ✓ package.json
  ✓ pnpm-lock.yaml
  ✓ apps/customer-display/package.json
  ✓ apps/commerce-core/package.json
  ✓ apps/commerce-core/pnpm-lock.yaml
  ✓ apps/commerce-core/.npmrc
```

**docker 미검증** — 로컬에 docker/colima 없음. CI smoke job 에서 최초 검증 예정.

## CI docker job

`docker-smoke-commerce-core` 재활성화. `if: false` → `if: needs.changes-filter.outputs.commerce_core == 'true'`. commerce_core filter 에 `.dockerignore`·`pnpm-workspace.yaml`·`apps/customer-display/**` 추가.

## Kyu 클릭 단계 (머지 후)

1. railway.app → commerce-core 서비스 → **Settings**
2. Source → **Root Directory**: `apps/commerce-core` → **`.`** (또는 빈칸)
3. Source → **Dockerfile Path**: `apps/commerce-core/Dockerfile` 입력
4. **Save** → 자동 재배포
