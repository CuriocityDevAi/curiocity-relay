# M1-1105-BJ Report — Xendit Admin 설정 화면: Payment integrations

## 암호화 방식

- **알고리즘**: AES-256-GCM (IV: 12B 랜덤, 인증 태그: 16B)
- **키 파생**: `sha256(COOKIE_SECRET + "\x00xendit-creds-v1")` → 32B 키
- **재사용 env**: `COOKIE_SECRET` (기존 env 재사용 — 별도 env 추가 불필요)
- COOKIE_SECRET 미설정 시 PUT 요청 거부 → HTTP 503 반환
- API 응답 · 화면 표시: 끝 4자리만 (••••abcd 형식)

## 파일 목록

### storeport-m1

| 파일 | 용도 |
|------|------|
| `src/modules/pos_settings/lib/xendit-creds.ts` | AES-256-GCM 암호화 · resolveXenditCreds · maskValue · detectMode |
| `src/api/admin/pos/settings/xendit/route.ts` | GET/PUT /admin/pos/settings/xendit |
| `src/admin/lib/xendit-settings-api.ts` | Admin UI fetch client |
| `src/admin/routes/pos-settings/page.tsx` | Payment integrations 섹션 추가 |
| `src/modules/pos_settings/__tests__/xendit-creds.unit.spec.ts` | 단위 테스트 15 cases |
| `apps/commerce-core/.env.template` | COOKIE_SECRET 용도 주석 추가 |

### pos-m1

| 파일 | 용도 |
|------|------|
| `scripts/m1-1105-bj-playwright.mjs` | Xendit Admin UI 목업 스크린샷 스크립트 |
| `docs/M1-1105-BJ-xendit-settings.png` | 스크린샷 결과물 |

## CI run & PR

- **storeport-m1 PR**: https://github.com/CuriocityDevAi/storeport/pull/233
  - 브랜치: `feat/m1-1105-bj-xendit-admin`
  - push 시 단위 테스트 48/48 통과 (새 15 cases 포함)
- **pos-m1 PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/115
  - 브랜치: `test/m1-1105-bj-xendit-playwright`

## Kyu 실기 항목 (화면에서 무엇을 보는지)

Admin > POS Settings 하단 **Payment integrations** 섹션:

1. **미설정 상태**: 회색 "Not configured" 배지
   - Xendit API 키 미입력 · env fallback 중이면 "Using server default" 배지
2. **Secret key 입력 후 Save**: 녹색 "Configured" 배지 + 주황/파랑 "Test"/"Live" 배지 표시
   - `xnd_development_` 접두어 → Test / `xnd_production_` → Live 자동 판별
   - 화면에 보이는 힌트: `Current: ••••a1b2` (실제 키 미노출)
3. **Webhook token**: 동일하게 끝 4자리 힌트 표시
4. **QR expiry**: 기본 15분, 1~60 범위 조정 가능
5. **Clear 버튼**: 저장된 자격증명 삭제 → "Using server default" 복귀

스크린샷: `docs/M1-1105-BJ-xendit-settings.png` (목업 · 가짜 키값)

## resolveXenditCreds 단위 테스트 (15 cases)

- 암호화 라운드트립 · IV 랜덤성 · 태그 변조 실패
- maskValue (끝 4자리 · ≤4자 전체 마스킹)
- detectMode (xnd_development_ → test · xnd_production_ → live)
- **store 우선**: xendit 필드 있으면 복호화 반환 (env 무시)
- **env fallback**: xendit 필드 없으면 XENDIT_API_KEY/WEBHOOK_TOKEN
- **store 우선 대 env**: env 설정돼 있어도 store 가 우선
