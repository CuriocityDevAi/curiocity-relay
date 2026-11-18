#364 APPROVE · 해석 순서 1:1 O · pos_settings 부재 시 안전 O

## REQ 1 — 해석 순서·복호화·키 이름·테스트 모드 1:1 대조

| 항목 | 구 `pos_settings/lib/xendit-creds.ts` | 신 `payment_xendit/lib/creds.ts` | 일치 |
|---|---|---|---|
| 함수 시그니처 | `svc: PosSettingsModuleService \| null` | `reader: XenditSettingsReader \| null` | ✅ 구조적 타이핑 동등 |
| 1단계: 저장 키 | `svc.getOrCreateStoreSettings()` → settings.xendit | `reader.getOrCreateStoreSettings()` → settings.xendit | ✅ |
| 필드 조건 | `encrypted_secret_key && iv_sk && tag_sk` | 동일 | ✅ |
| 복호화 알고리즘 | AES-256-GCM, `POS_SECRETS_KEY ?? COOKIE_SECRET + "\x00xendit-creds-v1"` sha256 | 동일 | ✅ |
| 복호화 실패 처리 | `console.warn(...)` → fall through to env | 동일 | ✅ |
| webhook_token (store) | `encrypted_webhook_token && iv_wt && tag_wt` 복호화 | 동일 | ✅ |
| qr_expiry_minutes | `xendit.qr_expiry_minutes ?? 15` | 동일 | ✅ |
| env fallback key | `XENDIT_API_KEY ?? XENDIT_SECRET_KEY` | 동일 | ✅ |
| env fallback webhook | `XENDIT_WEBHOOK_TOKEN` | 동일 | ✅ |
| detectMode | `xnd_development_` → test, `xnd_production_` → live | 동일 | ✅ |
| source 필드 | `"store"` / `"env"` | 동일 | ✅ |

**결론: 완전 1:1 O**

## REQ 2 — pos_settings 부재 시 안전 여부

`xendit-qris-provider.ts` `resolveCreds()`:

```typescript
try {
  const reader = this.container_.resolve("pos_settings") as XenditSettingsReader;
  return await resolveXenditCreds(reader);
} catch {
  return await resolveXenditCreds(null);  // → env fallback
}
```

- Wing-only 배포에서 `"pos_settings"` 모듈 미등록 시 `resolve()` throw → catch에서 `resolveXenditCreds(null)` → env 경로
- 예외 전파 없음, `null` 전달 경로는 `resolveXenditCreds` 에서도 guard됨 (`if (reader !== null)` 블록 건너뜀)

**결론: 안전 O — 예외로 죽지 않고 env fallback으로 떨어짐**

## REQ 3 — XENDIT_WEBHOOK_TOKEN 경로

env fallback 반환값: `webhook_token: process.env.XENDIT_WEBHOOK_TOKEN ?? null`
신/구 동일. 웹훅 route validation 파일은 이번 diff에 미포함 → 변경 없음.

**결론: 불변 O**

## REQ 4 — lint / build / unit / CI

| 항목 | 결과 |
|---|---|
| 경계 경고 | PR 본문: 19 → 14 (payment_xendit 관련 **0**) ✅ |
| build exit 0 | PR 본문: 신규 TS 에러 0 ✅ |
| unit | PR 본문: 528/528 pass (`qris-xendit`, `qris-simulate-bk`, `xendit-creds` 포함) ✅ |
| Mac CI (`gh pr checks 364`) | changes-filter · check · markers-and-forbidden 모두 **pending** (실행 중 · failed 아님) |

CI pending: PR 발행 직후 조회 시점 미완료. 3개 job 모두 fail 없음.

## REQ 5 — §4.4 #2 · §5 R-B1 wording 정정

**§4.4 #2** (결정 셀):
> ~~env 직접 읽기로 이동~~ → **정정 (M2-1118-H · 2026-11-18)**: 자격 해석기(`resolveXenditCreds` · 저장 키 우선 → env fallback)를 `payment_xendit/lib/creds.ts` 공용 위치로 이동. **Admin 저장 키 → env fallback 해석 순서 불변**.

**§5 R-B1** (제목 셀):
> `resolveXenditCreds` 를 `payment_xendit/lib/creds.ts` 로 이동 (Admin 저장 키 우선 → env fallback 불변). ~~provider 는 env 직접 read · 표시 전용~~ 정정. **완료 M2-1118-H** (2026-11-18).

**결론: "저장 키 우선 → env fallback 유지"로 정정됨 O**

## REQ 6 — 판정

**APPROVE**

- 해석 순서 1:1 완전 일치 — 저장 키 우선, 복호화, env fallback, 모든 필드명 불변
- pos_settings 부재 시 try/catch로 env fallback, 예외 전파 없음
- XENDIT_WEBHOOK_TOKEN 경로 변경 없음
- lint 19→14 달성, unit 528 통과, CI pending (not failed)
- §4.4 #2 · §5 R-B1 "저장 키 우선 → env fallback 불변" 명시 정정 완료
- `pos_settings/lib/xendit-creds.ts` 얇은 재수출로 기존 POS 호출부 경로 변경 없음
