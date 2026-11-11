# M2-1105-AE Report

## 새 projectId
`0ed85e16-4459-4094-afc5-29e3e8d6803f`

## expo.dev 프로젝트 URL
https://expo.dev/accounts/curiocity/projects/meros-pos

## 변경 diff 요약

**app.json**
- `owner`: `agilo-com` → `curiocity`
- `extra.eas.projectId`: `2c44b68b-5c32-4031-a160-d315e6c399d4` → `0ed85e16-4459-4094-afc5-29e3e8d6803f`
- `updates.url` 제거 (옛 agilo projectId 참조)
- `extra.router` 형식 소폭 변경 (eas init 자동 기록)
- `android.permissions` bluetooth 항목 추가 (eas init 자동 기록)

**docs/runbooks/eas-dev-build.md**
- 현재 상태 요약 테이블: projectId·owner 갱신 + expo.dev 링크 추가
- ① 로그인 섹션: 예상 whoami 화면 curiocity 계정으로 교체 · agilo 예시 제거
- Apple 2단계 인증 나오는 지점(eas build 첫 실행 시) 명시
- ③ 빌드 섹션: `@agilo-com/meros-pos` → `@curiocity/meros-pos`
- ⑥ 막힐 때: `agilo-com` → `curiocity` 참조 수정

## 회귀 로그

```
# REQ-1: whoami
curiocity.mayer / curiocity.dev.ai@gmail.com
Accounts: curiocity.mayer(Owner) · curiocity(Owner) ✓

# REQ-3a: expo config
owner: curiocity ✓
projectId: 0ed85e16-4459-4094-afc5-29e3e8d6803f ✓

# REQ-3b: expo start
Starting Metro Bundler
Waiting on http://localhost:8082
(기동 확인 · 종료) ✓

# REQ-3c: bundle guard (m2-1105-q)
[guard] ✓ 정적 grep 0 건 위반
[guard] ✓ Metro iOS 번들 해석 성공 · 20.3s
[guard] ✓ 전체 통과
```

## PR 번호
#82 — https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/82
