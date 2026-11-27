PASS storeport PR #483 · head 849709d (ci/M1-1127-K-rehearsal-dispatch)

## 완료 내역

- storeport 新브랜치 `ci/M1-1127-K-rehearsal-dispatch` → main 대상 PR #483
  - https://github.com/CuriocityDevAi/storeport/pull/483
- 파일 1개: `.github/workflows/rehearsal-dispatch.yml`
  - `FORK_DISPATCH_TOKEN` 미설정 시 `exit 0` + `::warning::` 경고로 종료 → 다른 PR CI 빨강 없음
- relay#73 · fork#293 내용 무변경

---

## 왜 다른 PR(#480)에 커밋했는지 — 재발 방지

M1-1127-J 프롬프트가 "storeport #480 브랜치에 커밋" 경로를 명시하지 않았으나, 로컬에서 `storeport-m1-480` 디렉토리(이미 `feat/M0-1127-N-cd-correct-welcome` 체크아웃)를 선택한 채 작업해 M0 소유 PR 브랜치에 파일이 들어갔다. **도구 선택 착오** — 브랜치 소유 확인 없이 디렉토리명(`storeport-m1-480`)과 태스크(`storeport rehearsal-dispatch`)를 연결했음.

---

## Kyu 할 일: FORK_DISPATCH_TOKEN 발급 (처음 하는 사람 기준)

> 토큰 값은 채팅에 붙이지 말 것. GitHub 화면에 직접 입력.

### 1. PAT 발급

1. GitHub → 오른쪽 위 프로필 아이콘 → **Settings**
2. 왼쪽 사이드바 맨 아래 → **Developer settings**
3. **Personal access tokens** → **Fine-grained tokens** 선택
4. **Generate new token** 클릭
5. 항목 입력:
   - **Token name**: `storeport-fork-dispatch` (식별용, 아무 이름 가능)
   - **Expiration**: 90일 권장 (만료 후 재발급 필요)
   - **Resource owner**: `CuriocityDevAi`
   - **Repository access**: **Only select repositories** → `agilo-medusa-pos-fork` 선택
6. **Permissions** 섹션:
   - **Actions** → `Read and write` 선택 (= `actions:write`, `repository_dispatch` 전송에 필요한 최소 권한)
   - 나머지는 `No access` 유지
7. **Generate token** 클릭 → 토큰 복사 (화면에서 한 번만 보임)

### 2. storeport Secrets에 등록

1. https://github.com/CuriocityDevAi/storeport/settings/secrets/actions 접속
2. **New repository secret** 클릭
3. **Name**: `FORK_DISPATCH_TOKEN` (대소문자 그대로)
4. **Secret** 칸에 1단계에서 복사한 토큰 붙여넣기
5. **Add secret** 클릭

등록 후 흐름 경로 파일이 변경된 PR을 열거나 push하면 `rehearsal-dispatch` 워크플로가 자동 실행됩니다.
