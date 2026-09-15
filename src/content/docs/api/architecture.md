---
title: 架構總覽
description: 進件 API 的組成、資料流與邊界。
---

一個消費性分期「進件 → 審核 → 撥款」流程的示範服務。

它存在的目的很直接：我過去四年做的是企業內部的金融資訊系統，那些程式碼不會有人看得到。
這個 API 把同一類問題——案件狀態流轉、批次推進、報表產製——做成公開、可以直接呼叫的東西。

**但它不是原系統的複製品。** 我維護的兩件事分別是：

- **進件** — 單一案件的同步操作。業務人員按儲存、呼叫 Stored Procedure、
  檢核全部通過才往另一張表插一筆，那一筆就是進件成立的依據。這裡沒有批次。
- **每日資料交換** — 系統之間的排程，基本上都用 SP 在跑。

這個 API 把兩者都改用顯式契約重新表達，並針對各自的痛點做出不同的選擇。
取捨寫在 [ADR-0002](/adr/0002-validation-in-app-not-sp/)(進件)與
[ADR-0003](/adr/0003-per-row-failure-reporting/)(交換)，兩篇都同時說明了
原本的做法在什麼條件下仍然是對的。

## 組成

```
Weihsin.Api
├── Domain/
│   ├── LoanApplication      案件與狀態異動歷程
│   ├── StateMachine         允許的狀態轉移(唯一的真相來源)
│   ├── ApplicationStore     記憶體儲存,沙箱,定期重置
│   ├── BatchRunner          批次推進,決定性運算
│   └── DailyReport          日報表彙總
└── Endpoints/
    ├── ApplicationEndpoints 進件、查詢、列表
    └── OperationsEndpoints  批次、報表、沙箱狀態
```

執行環境是 .NET 10 LTS 上的 ASP.NET Core Minimal API，部署在 Azure Container Apps。

## 狀態流

```
Received ──▶ UnderReview ──▶ Approved ──▶ Disbursed
    │             │
    └─────────────┴──────▶ Rejected
```

`Approved` 與 `Rejected` 之外沒有回頭路；`Disbursed` 與 `Rejected` 是終態。
轉移規則只寫在 `StateMachine` 一個地方，批次、未來的人工覆核與 webhook 都問它。

## 兩種批次工作

`POST /v1/exchange/run` 對應每日資料交換：接受一批原始資料，逐筆逐欄檢查，
壞的退回並說明原因，好的收下。欄位刻意全為字串，型別轉換是這一層的責任
([ADR-0003](/adr/0003-per-row-failure-reporting/))。

`POST /v1/batch/run` 把案件往下一個狀態推。**這個是這個專案的設計，不是原系統的複製品**
——它存在是為了把「使用者等不起的工作」移出請求路徑。

## 狀態推進批次做什麼

把所有非終態案件往下推一步：

| 目前狀態 | 條件 | 下一步 |
|---|---|---|
| `Received` | — | `UnderReview` |
| `UnderReview` | 金額 > 400,000 | 不動，保留人工審核 |
| `UnderReview` | 期數 > 36 | `Rejected` |
| `UnderReview` | 其餘 | `Approved` |
| `Approved` | — | `Disbursed` |

回傳這次實際異動了哪些案件，不只是「成功」。批次最常見的除錯困難是「跑完了，但不知道它做了什麼」。

## 邊界與限制

這是**展示用的公開沙箱**，不是產品：

- 沒有資料庫。資料在記憶體，每小時重置回種子狀態([ADR-0001](/adr/0001-no-database/))；
  實際上縮到零副本時狀態就會消失，所以重置間隔只是上限([ADR-0006](/adr/0006-zero-cost-hosting/))
- 沒有身分驗證。所有端點公開，寫入有筆數上限
- 速率限制每個來源 IP 每分鐘 60 次，超過回 `429`
- 部署為 scale-to-zero，**閒置後第一個請求會有冷啟動延遲**([ADR-0006](/adr/0006-zero-cost-hosting/))

**請勿送入任何真實個人資料。** `applicantRef` 請使用代號。

## 可觀測性

每個回應都帶 `X-Trace-Id`，值為 ASP.NET Core 的 `TraceIdentifier`。回報問題時附上它，
就能對到伺服器端的同一條請求日誌。

錯誤一律走 `ProblemDetails`(RFC 9457)，驗證錯誤回 `400` 並列出欄位，不是一句 `Bad Request`。
