# M2-1125-P — Customer Display: 이미지 Apply · 이슬람 명절 프리셋 · read-only 실값

**완료일**: 2026-11-25  
**브랜치**: `feat/M2-1125-P-cd-image-islamic-readonly`  
**PR**: https://github.com/CuriocityDevAi/storeport/pull/440  
**커밋**: `4f50c8c`

---

## §1 이미지 Apply 버그 수정

**근본 원인**: `uploadStoreImage` 함수가 Medusa v1 응답 형식(`{ uploads: [...] }`)을 사용했으나,  
Medusa v2는 `{ files: [...] }`를 반환 → `url`이 빈 문자열 → `store_image_url must start with http://` 에러.

**수정 파일**:
- `apps/commerce-core/src/admin/lib/customer-display-api.ts`  
  `data.uploads?.[0]` → `(raw.files ?? raw.uploads)?.[0]` (v1/v2 호환)
- `apps/commerce-core/src/api/admin/pos/customer-display/settings/_validate.ts`  
  `store_image_file_id`도 함께 전송될 경우 URL 형식 검증 완화 (업로드 직후 draft 저장 흐름 보호)

**SVG 결정**: upload input에서 차단 (`accept="image/png,image/jpeg,image/webp"` + UI 안내 문구).  
서버 변환(sharp) 없음 — React Native `Image`는 원격 SVG URI 렌더 불가, 가장 단순한 방법 채택.

---

## §2 이슬람 명절 프리셋 버튼

**배경**: Events 탭에 "이슬람 명절 프리셋" 버튼 없음 → 매년 수동 등록 필요.

**구현**:
- `handleAddIslamicPresets()` — 현재연도 + 다음연도 Islamic suggestions API 호출 후  
  ramadan(30일) · lebaran(3일) · maulid(1일) 이벤트 직렬 생성
- 중복/overlap 에러는 silent skip (이미 등록된 연도 무시)
- `data-testid="add-islamic-presets-btn"` 버튼 Events 탭에 추가
- Toast: `이슬람 명절 N건 추가됨` / `이미 등록되어 있습니다`

**수정 파일**:
- `apps/commerce-core/src/admin/routes/pos-settings/customer-display/page.tsx`

---

## §3 Read-only 칸 실값 수정

**근본 원인**: `getDisplayConfig()`에서 `store_name: null` 하드코딩.  
preview API에서 실제 store 정보를 조회하지 않았음.

**수정**:
- `preview/route.ts`: `Modules.STORE` → `listStores({})` 로 store name 조회 후 `getDisplayConfig`에 전달
- `service.ts`: `getDisplayConfig(cdRow, nowDateStr, posRow, loyaltyRow, storeName?)` 파라미터 추가
- `page.tsx`: `fetchDraftPreview()` 응답에서 `store_name` · `tax_label` · `earn_rate` 추출 →  
  `previewStoreName` · `previewTaxLabel` · `previewEarnRate` state → read-only 칸 표시

**data-testid**: `readonly-store-name` · `readonly-tax-label` · `readonly-earn-rate`

---

## Playwright 테스트 결과

파일: `apps/commerce-core/e2e/admin/cd-image-islamic-readonly.spec.ts`  
설정: `apps/commerce-core/playwright.cd-p.config.ts`

```
Running 3 tests using 1 worker

  ✓  1 · 이미지 업로드 → Apply 성공 — PNG upload → apply-btn → [data-sonner-toast] 확인
  ✓  2 · 이슬람 명절 프리셋 추가 — preset btn → events 등록 → tab count 갱신
  ✓  3 · read-only 칸 실값 표시 — Soopsok Sweets · PB1 · 5%

  3 passed (7.3s)
```

TypeCheck: 0 errors · Unit tests: 705 pass
