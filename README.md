# docs-weihsin-dev

`docs.weihsin.dev` — 架構文件與決策紀錄(ADR)。

Astro + Starlight,靜態輸出,部署在 Cloudflare Workers。

## 這裡放什麼

**附屬於某個系統,而且系統改了就要跟著改**的東西:架構說明、API 參考、ADR。

想法、心得、事後回顧不放這裡。那些有時間性,過時了應該另外寫一篇,
而不是修改原文。

## 開發

```bash
npm run dev      # http://localhost:4321
npm run build
```

## 新增一篇 ADR

在 `src/content/docs/adr/` 建立 `NNNN-短標題.md`,frontmatter 的
`sidebar.order` 決定側欄順序。側欄是自動產生的,不必改設定。

ADR 的結構固定:背景 / 決定 / 理由 / 代價 / 考慮過的替代方案。
**「代價」不可以省略**——沒有代價的決定不是決定,是偏好。
