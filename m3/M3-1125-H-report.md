PASS

# M3-1125-H — 설정 영향도 미리보기 fixup (C1–C4)

날짜: 2026-11-25  
PR: storeport #431 `feat/M3-1125-G-settings-impact-preview`  
브랜치: `feat/M3-1125-H-settings-preview-fixup` → force-with-lease → `origin/feat/M3-1125-G-settings-impact-preview`

---

## C1 — rebase origin/main (add/add 충돌 해소)

- `git rebase origin/main` 수행. #430 머지로 인한 `docs/epics/admin-settings-impact-preview.md` add/add 충돌 발생.
- main 쪽 버전(#429 머지본 전체) 보존 + 브랜치 측 "붉은 박스 규칙" 섹션(§4-7, 강조 색상·testid 테이블)을 추가 합산하여 해소.
- `--force-with-lease` push 성공.

## C2 — previewSnapshot.ts 주문번호 하이픈 공용 helper 사용

파일: `apps/commerce-core/src/admin/routes/pos-settings/lib/previewSnapshot.ts:15`

변경 전:
```ts
const orderNum = opts.nickname ? `${opts.nickname}26B1001` : "PIM26B1001";
```

변경 후:
```ts
import { needsOrderNumberHyphen } from "../../../../modules/order_number/lib/format";
// ...
const sep = opts.nickname && needsOrderNumberHyphen(opts.nickname) ? "-" : "";
const orderNum = opts.nickname ? `${opts.nickname}${sep}26B1001` : "PIM26B1001";
```

단위 테스트 추가 (`settingImpact.unit.spec.ts`):
- `PIM3(숫자 끝) → 하이픈 삽입 PIM3-26B1001` ✅
- `PIM(문자 끝) → 하이픈 없음 PIM26B1001` ✅

## C3 — NicknameEditor onDraftChange prop + page draft state lift-up

파일: `sections/NicknameEditor.tsx`, `page.tsx`

- `NicknameEditor` Props에 `onDraftChange?: (v: string) => void` 추가.
- load 완료 시 `onDraftChange?.(nick ?? "")` 호출.
- input onChange 시 `setDraft(v); onDraftChange?.(v);` 호출.
- `page.tsx`에 `nicknameDraft` state 추가, `setNicknameDraft` 를 `onDraftChange`로 전달.
- `SettingImpactChips`에 `draftValue={nicknameDraft}` · `nickname={nicknameDraft}` 연결 — 타이핑 즉시 칩/모달 오른쪽 갱신.

## C4 — 매장 선택(location mode) savedValue = 매장 override 주소

파일: `page.tsx:635`

변경 전:
```tsx
savedValue={String(brandSettings?.store_address ?? "")}
```

변경 후:
```tsx
savedValue={inLocationMode ? currAddressOverride : String(brandSettings?.store_address ?? "")}
```

`currAddressOverride`는 `locationOverrides?.store_address ?? null` 에서 파생 (기존 변수 재사용).  
override 없으면 null → 칩이 "브랜드 주소 따름" 표시.

## Playwright 추가 테스트

파일: `e2e/admin/admin-smoke.spec.ts`

- **06e**: 잠금 해제 매장 선택 → 닉네임 input에 `PIM3` 타이핑 → 칩 클릭 → 모달 오른쪽 텍스트에 `PIM3-26B` 포함 확인.
- **06f**: 매장 override `store_address: "Jl. Thamrin 55, Jakarta Pusat"` mock → 칩 클릭 → 모달 왼쪽 텍스트에 `Jl. Thamrin 55` 포함 확인.

## feature-map 등록 (CI fix)

파일: `docs/feature-map.yaml`

`packages/receipt-view-model/**` glob을 `admin-customization` feature에 추가.  
→ feature-map-check CI 실패 해소.

---

## 커밋 목록

| SHA | 메시지 |
|-----|--------|
| `95ec706` | fix(admin): M3-1125-H — 미리보기 주문번호 하이픈 · 닉네임 draft lift-up · 매장 주소 savedValue 수정 |
| `d66b674` | test(admin): M3-1125-H — Playwright PIM3 하이픈 draft · 매장 override 주소 saved 검증 |
| `230697f` | fix(feature-map): M3-1125-H — packages/receipt-view-model admin-customization 등록 |

---

## CI 결과 (run 45554156584)

| job | 결과 |
|-----|------|
| markers-and-forbidden | success ✅ |
| changes-filter | success ✅ |
| route | success ✅ |
| heavy-mac (unit + Playwright) | success ✅ |
| heavy-cloud | skipped |
| feature-map-check (45554156670) | success ✅ |

**전체: PASS**
