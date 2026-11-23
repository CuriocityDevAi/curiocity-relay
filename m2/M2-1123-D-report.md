# M2-1123-D 판정: COMPLETE

커밋 `dfae4a3` · 배포 성공 · curl 확인 완료 (2026-11-23 08:39 UTC)

---

## 작업 내역

| 항목 | 변경 내용 |
|------|-----------|
| canonical | `<link rel="canonical" href="https://www.soopsoksweets.com/">` 추가 |
| og:url | `<meta property="og:url" content="https://www.soopsoksweets.com/">` 추가 |
| og:image | 상대경로 → 절대 URL (`https://www.soopsoksweets.com/assets/og-macaron.jpg`) |
| meta description | 한국어+영어, 마카롱·소금빵·두쫀쿠·휘낭시에, 매장 2곳 명시 (140자) |
| robots.txt | 신규 생성: 전체 허용 + `Sitemap:` 항목 |
| sitemap.xml | 신규 생성: 단일 URL, lastmod 2026-11-23 |
| JSON-LD | Bakery×2 (PIM3·Plaza Senayan): 영업시간 10:00–22:00, 전화 +6285211572101, sameAs 인스타 |

---

## curl 확인 로그

```
$ curl -s https://www.soopsoksweets.com/robots.txt
User-agent: *
Allow: /

Sitemap: https://www.soopsoksweets.com/sitemap.xml

$ curl -sI https://www.soopsoksweets.com/sitemap.xml | head -3
HTTP/1.1 200 OK
Date: Mon, 23 Nov 2026 08:39:34 GMT
Content-Type: application/xml

$ curl -s https://www.soopsoksweets.com/ | grep -o 'canonical[^>]*'
canonical" href="https://www.soopsoksweets.com/"
```

---

## www 없는 주소 → www 301 리다이렉트 절차 (Kyu 직접 클릭)

Cloudflare `_redirects` 파일로는 호스트 단위 리다이렉트 불가. Cloudflare 대시보드 **Redirect Rules** 로 설정.

**단계별 절차:**

1. [dash.cloudflare.com](https://dash.cloudflare.com) 로그인
2. 왼쪽 사이드바 "Websites" → **soopsoksweets.com** 클릭
3. 왼쪽 메뉴 **Rules** → **Redirect Rules**
4. 오른쪽 상단 **Create rule** 클릭
5. Rule name: `www redirect` (임의)
6. **When incoming requests match…** → **Custom filter expression** 선택
7. Expression 입력란에 아래 붙여넣기:
   ```
   (http.host eq "soopsoksweets.com")
   ```
8. **Then…** 섹션:
   - Type: **Dynamic**
   - URL expression:
     ```
     concat("https://www.soopsoksweets.com", http.request.uri.path)
     ```
   - Status code: **301**
   - Preserve query string: **켜기** (토글 On)
9. **Deploy** 클릭

> 적용 후 `curl -sI https://soopsoksweets.com/` 로 `Location: https://www.soopsoksweets.com/` + `301` 확인.

---

## JSON-LD 주소 주의 사항 (Kyu 확인 필요)

사이트에 각 매장의 세부 unit 번호(예: LG-XX)가 없어 `streetAddress` 를 아래와 같이 사용:
- Store 1: `"LG Floor, Pondok Indah Mall 3"`
- Store 2: `"LG Floor, Plaza Senayan"`

Google 검색 결과 카드에 더 정확한 주소가 나오길 원하면 각 매장 unit 번호를 `streetAddress` 에 추가해서 알려주면 반영.

---

## Search Console 등록 시 넣을 sitemap 주소

```
https://www.soopsoksweets.com/sitemap.xml
```

Search Console → 왼쪽 "Sitemaps" → 위 URL 입력 → **제출**.
