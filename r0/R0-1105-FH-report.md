# R0-1105-FH 진단 리포트

**운영 상태코드: 503 · 원인: Railway rootDirectory=apps/commerce-core → Docker 빌드 컨텍스트에 apps/customer-display 없음 → 조건부 COPY 무음 건너뜀 · 권장안: Railway Root Directory를 "."으로 변경 + Dockerfile 빌드 단계 추가 · Kyu 클릭 필요(Railway 대시보드 1회)**

---

## 1. 운영 URL 상태코드

| URL | 상태 | 비고 |
|-----|------|------|
| `GET /customer-display-web/` | **503** | `{"message":"customer-display web not built yet"}` |
| `GET /customer-display-web/index.html` | **503** | 동일 body · 동일 etag |
| `GET /admin/pos/customer-display/web-version` | **401** | 인증 필요 · 엔드포인트 자체는 살아있음 |

서버(Express/Medusa)는 정상 동작 중. 503은 `customerDisplayWebHandler` 내 `!existsSync(CDW_BASE)` 가드가 발동한 결과 (`middlewares.ts:101-103`).

---

## 2. 코드 경로 분석: 웹 빌드가 Railway 이미지에 들어가는가

**결론: 들어가지 않는다.**

### 흐름

```
로컬/CI:
  scripts/build-customer-display-web.sh
    → apps/customer-display/ 에서 pnpm build:web
    → apps/commerce-core/public/customer-display-web/ 에 dist 복사

Dockerfile (apps/commerce-core/Dockerfile:46-52):
  RUN if [ -d public/customer-display-web ]; then
        cp -r public/customer-display-web .medusa/server/public/customer-display-web
        echo "✓ 편입 완료"
      else
        echo "⚠ public/customer-display-web 없음 (서빙 비활성 · /customer-display-web/ = 503)"
      fi

Railway 빌드:
  rootDirectory = apps/commerce-core
  → Docker build context = apps/commerce-core/ 만
  → apps/customer-display/ 접근 불가
  → public/customer-display-web/ 없음
  → 조건부 COPY 건너뜀 (echo만 출력 · 에러 없음)
  → .medusa/server/public/customer-display-web/ 비존재
  → runtime: CDW_BASE = resolve(cwd(), "public/customer-display-web") → existsSync → false → 503
```

### Dockerfile 주석에도 TODO로 명시

`apps/commerce-core/Dockerfile:45`:
```
# Railway: Root Directory 를 "." 으로 변경 후 customer-display 빌드 단계 추가 필요 (TODO)
```

PR #269 머지(a165120) 시 이 TODO를 별도 운영 작업으로 남겨두었고, 이후 배포(#281 · 8e75069)에서도 미처리된 상태로 운영됨.

### CI는 왜 잡지 못했나

- CI `customer-display` job: typecheck + test + build:web → customer-display 단독 검증, commerce-core Docker 빌드와 무관
- CI `docker-smoke-commerce-core` job: `if: false` (nightly로 이관 · PR 트리거 꺼짐 · `ci.yml:239`)
- 따라서 "Docker 빌드 컨텍스트에 public/customer-display-web 없음" 상황이 CI에서 감지되지 않음

---

## 3. 해결안 비교

### Option A (권장): Railway Root Directory를 "."으로 변경 + Dockerfile 빌드 단계 추가

| 항목 | 내용 |
|------|------|
| Railway 클릭 | Settings → Source → Root Directory: `apps/commerce-core` → `.` (비우기)<br>Dockerfile Path: `apps/commerce-core/Dockerfile` 명시 |
| 코드 수정 | Dockerfile `COPY . .` 직전에 customer-display 빌드 단계 추가 (약 5줄) |
| 장점 | 근본 해결 · railway.json watchPatterns 이미 `apps/customer-display/**` 포함 · 구조 단순 |
| 단점 | 빌드 컨텍스트가 모노레포 전체로 커짐 → `.dockerignore` 조정 필요 · 첫 빌드 약간 느림 |
| TODO 해소 | Dockerfile:45의 "Railway Root Directory 변경 필요" 그대로 이행 |

**Dockerfile 수정 예시** (기존 `COPY . .` → `RUN pnpm build` 블록 사이):
```dockerfile
# 전체 소스 복사 (apps/commerce-core 상대)
COPY apps/commerce-core/ .
# customer-display 웹 빌드 (apps/customer-display에 접근 가능)
COPY apps/customer-display/ /customer-display-src/
RUN cd /customer-display-src && pnpm install --frozen-lockfile && pnpm build:web && \
    mkdir -p /app/public/customer-display-web && cp -r dist/. /app/public/customer-display-web/
```
(정확한 경로·lock 처리는 별도 구현 태스크)

---

### Option B: CI에서 built artifact를 git에 커밋 → Railway가 그 커밋을 빌드

| 항목 | 내용 |
|------|------|
| 방식 | CI에서 `scripts/build-customer-display-web.sh` 실행 → `apps/commerce-core/public/customer-display-web/` 를 deploy 브랜치에 커밋 |
| Railway 클릭 | 없음 (rootDirectory 유지) |
| 단점 | 빌드 artifact를 git에 넣는 안티패턴 · CI 복잡도 상승 · merge conflict 위험 |
| 비추천 | -

---

### Option C: customer-display를 별도 정적 서비스로 분리

| 항목 | 내용 |
|------|------|
| 방식 | Vercel / Railway Static 서비스 / Cloudflare Pages에 customer-display 단독 배포 |
| Railway 클릭 | 별도 Railway 서비스 생성 or 외부 플랫폼 연동 |
| 장점 | commerce-core 완전 독립 · 빌드 단순화 · 각자 배포 가능 |
| 단점 | `admin.meros.id/customer-display-web/` URL 유지 필요 시 nginx 프록시 추가 · POS 앱 URL 설정 변경 필요 · 운영 복잡도 증가 |
| 추천 조건 | 미래에 customer-display 독립 도메인 분리 계획이 있을 때 |

---

## 4. 권장안 요약 및 Kyu 클릭 단계

**권장: Option A** — Dockerfile TODO 그대로 이행. Railway 클릭 1회 + 코드 작업.

### Kyu가 Railway 대시보드에서 해야 할 클릭

1. `admin.railway.app` → 해당 프로젝트 → **commerce-core 서비스** 선택
2. 상단 **Settings** 탭 클릭
3. **Source** 섹션 → **Root Directory** 필드: `apps/commerce-core` 를 지우고 **`.`** (점 하나) 또는 빈칸으로 변경
4. **Dockerfile Path** 필드: `apps/commerce-core/Dockerfile` 입력 (Root Directory가 레포 루트가 되므로 명시 필요)
5. **Save** 클릭

이후 Dockerfile에 customer-display 빌드 단계 추가 → push → Railway 자동 재배포 → 503 해소.

> **주의**: Root Directory 변경 후 `apps/commerce-core/package.json`, `pnpm-lock.yaml`, `.npmrc` 등의 `COPY` 경로가 Dockerfile 기준으로 달라지므로 `COPY package.json pnpm-lock.yaml .npmrc ./` → `COPY apps/commerce-core/package.json apps/commerce-core/pnpm-lock.yaml apps/commerce-core/.npmrc ./` 등으로 수정 필요. 이 작업은 별도 구현 태스크로 진행.
