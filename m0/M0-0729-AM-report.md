# M0-0729-AM · AL 실기 차단 결함 fix (β 2/3 · UI)

**일자**: 2026-08-09 · **허브**: M0 storeport · **라운드**: AM (AL 후속 · 즉일 수복)

---

## 배경 (Kyu 실측 08-09)

Expo Go 접속 성공 · Login Shop URL 입력 시 검증 실패:

- 화면: `"Please enter a valid Medusa shop URL"`
- 콘솔: `Invalid response from Medusa URL: 404`
- 반증: 서버 `/health` 은 정상 (HTTP 200)

## AM-1 뿌리 실측 (2건)

1. **[결함 A · 슬래시]** Login 검증기의 URL 정규화가 뒤 슬래시를 남긴 채 `/health` 를 이어 붙임 → 실제로는 `//health` 경로로 요청 → 서버가 라우팅하지 못하고 **404** 반환.
2. **[결함 B · 응답 형식]** 슬래시 fix 후에도, 검증기는 응답 본문이 정확히 문자열 `"ok"` 여야 통과 · 실제 서버 응답은 JSON `{"ok":true,...}` → 여전히 검증 실패.

**정리**: 두 결함 모두 앱 (fork 리포 `agilo-medusa-pos-fork`) 측 · 백엔드 무결. 두 결함 모두 fix 없으면 로그인 진행 불가.

## AM-2 fix 착지

- **리포**: `CuriocityDevAi/agilo-medusa-pos-fork` · PR **#2** (`feat/m0-0729-al-register-ui`)
- **fix 커밋**: `7a37d1b` — `fix(login): shop URL 검증 · trailing slash + JSON 응답 정합 (M0-0729-AM)`
- **범위**: `app/login.tsx` 만 · 검증기 2 결함 동시 수복 · 기존 plain "ok" fallback 유지
- **검증**: TS 0 errors · lint 0 errors 0 warnings

## Kyu 실기 갱신 (요지)

- 기동: `npx expo start --tunnel` (터널 필수 · WiFi 다른 폰도 접속 가능)
- fork 리포 HEAD 확인: `7a37d1b` 이상
- 12 단계 관통 = AL 실기 승인 (개점 → 판매 → 수금 → Q4 강제 → 마감 → Z → WA 복사)

**상세 절차**: 스토어포트 리포 `docs/plans/P1a-3-register-report-round3.md` §3

## 이연 순증감

- **해소**: +1 (Login 404)
- **신설**: 0
- **유지**: 6 (AK 이월 3 + CI/Maestro/상품명 3)
- **총 이연 순증감**: **-1**

## 회부

- **fix PR**: `CuriocityDevAi/agilo-medusa-pos-fork#2`
- **원장 PR**: `CuriocityDevAi/storeport#65`
- **relay 게시**: 본 파일 (M0 relay 전환 첫 게시)
- **다음 게이트**: Kyu 12 단계 재실기 → 통과 = AM 종결 · AN (β 3/3 · 사장 뷰) 착수 심문 3건 회신 대기 (사장 뷰 부착 위치 · 필터 기본치 · e2e 상품명 확장)

---

*M0-0729-AM · 2026-08-09*
