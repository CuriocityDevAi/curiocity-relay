#448 CHANGES · relay#38 APPROVE

## #448 storeport (M1-1125-AB) — CHANGES
자기 PR 제한으로 COMMENT 제출.

**핵심 수정 ✓**
- `window.location.replace("/pair")` → `router.replace("/pair")`: 정확한 수정.
- 네이티브(iPad): 기존 코드도 `router.replace` 사용 → 변경 없음 ✓
- SPA fallback: commerce-core `cdwResolveFile` extension-less → `pair.html` 또는 `index.html` fallback ✓
- CI: check / heavy-mac / markers-and-forbidden / route 모두 pass ✓

**CHANGES 사유: 동일 파일 `/cd-sync` 절대경로 미수정**
`apps/customer-display/app/index.tsx` cd-sync 분기에 동일 패턴 잔존:
```tsx
if (Platform.OS === "web" && typeof window !== "undefined") {
  window.location.replace("/cd-sync" + window.location.search);  // 절대경로
} else {
  router.replace("/cd-sync");
}
```
`/cd-sync`도 baseUrl(`/customer-display-web`)을 무시 → 운영에서 `Cannot GET /cd-sync` 재현 가능.
`/pair`와 동일한 버그이므로 같은 PR에서 함께 수정 필요.

---

## relay #38 (M2-1125-AB) — APPROVE
자기 PR 제한으로 COMMENT 제출.

**dry-run 버그 수정 ✓**
1. Homebrew: `$(curl …)` 명령치환이 `_run` 전에 평가 → DRY_RUN 선 분기로 평가 자체 차단
2. nvm: `| bash`가 `_run` 밖에 있어 dry-run 출력이 bash로 파이프 → DRY_RUN 선 분기로 단락
3. postgres: `brew services list 2>/dev/null` — brew 미설치 환경 stderr 노이즈 제거

**비 dry-run 경로 변경 없음 ✓**
`_run`은 `DRY_RUN=0`일 때 `"$@"` 직접 실행 — `_run` 제거 후 직접 호출과 동일.
relay 리포 CI 미설정이나 shellcheck 0 warnings 확인(PR 본문).
