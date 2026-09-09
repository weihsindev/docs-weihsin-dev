# CLAUDE.md — docs.weihsin.dev

架構文件與決策紀錄。全域規則仍然適用。寫作規則另見 `README.md`,
以下幾條會自動載入,是因為違反它們的代價最高。

## 寫 ADR 的硬規則

- **每一篇都必須有「代價」一節,不可省略。** 沒有代價的決定不是決定,是偏好。
- **如果一篇 ADR 不是來自實際踩過的坑,要在文中明講。**
  這條規則來自真實的失誤:原 ADR-0002 借用了作者沒有的經驗,後來整篇刪除。
  借來的權威在被追問時會當場破功,而這個站的讀者就是會追問的人。
- **發布之後不要重新編號。** 決定改變時新增一篇並標示 supersedes,舊的留著標為已取代。
  編號的價值在於它是穩定的引用點。
- **不得洩漏前雇主(和潤企業)的系統細節。** 不指名公司、不放實際資料結構、
  不描述可辨識的商業規則。寫成一般化的問題與取捨,論述強度不變,風險為零。

## 技術

- **視覺沿用 weihsin.dev 的 token**(紙感底色、墨黑、accent `#d8341f`、
  Archivo + Space Mono)。`src/styles/theme.css` 只覆寫 Starlight 的 CSS 變數,
  不改它的結構 —— Starlight 升版才不會撞。
- **Starlight 0.42 的側欄自動產生語法**是 `items: [{ autogenerate: { directory: 'adr' } }]`,
  不是在群組上直接寫 `autogenerate`。寫錯會在 build 時報錯。
- **`wrangler.jsonc` 的 `name` 是 Cloudflare Worker 的身分**,不要改。
