---
title: 架構總覽
description: 進件 API 的組成、資料流與邊界。
---

一個消費性分期「進件 → 審核 → 撥款」流程的示範服務。

它存在的目的很直接:我過去四年做的是企業內部的金融資訊系統,那些程式碼不會有人看得到。
這個 API 把同一類問題——案件狀態流轉、批次推進、報表產製——做成公開、可以直接呼叫的東西。

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

執行環境是 .NET 10 LTS 上的 ASP.NET Core Minimal API,部署在 Azure Container Apps。

## 狀態流

```
Received ──▶ UnderReview ──▶ Approved ──▶ Disbursed
    │             │
    └─────────────┴──────▶ Rejected
```

`Approved` 與 `Rejected` 之外沒有回頭路;`Disbursed` 與 `Rejected` 是終態。
轉移規則只寫在 `StateMachine` 一個地方,批次、未來的人工覆核與 webhook 都問它。

## 批次做什麼

把所有非終態案件往下推一步:

| 目前狀態 | 條件 | 下一步 |
|---|---|---|
| `Received` | — | `UnderReview` |
| `UnderReview` | 金額 > 400,000 | 不動,保留人工審核 |
| `UnderReview` | 期數 > 36 | `Rejected` |
| `UnderReview` | 其餘 | `Approved` |
| `Approved` | — | `Disbursed` |

回傳這次實際異動了哪些案件,不只是「成功」。批次最常見的除錯困難是「跑完了,但不知道它做了什麼」。

## 邊界與限制

這是**展示用的公開沙箱**,不是產品:

- 沒有資料庫。資料在記憶體,每小時重置回種子狀態([ADR-0001](/adr/0001-no-database/))
- 沒有身分驗證。所有端點公開,寫入有筆數上限
- 速率限制每個來源 IP 每分鐘 60 次,超過回 `429`
- 部署為 scale-to-zero,**閒置後第一個請求會有冷啟動延遲**

**請勿送入任何真實個人資料。** `applicantRef` 請使用代號。

## 可觀測性

每個回應都帶 `X-Trace-Id`,值為 ASP.NET Core 的 `TraceIdentifier`。回報問題時附上它,
就能對到伺服器端的同一條請求日誌。

錯誤一律走 `ProblemDetails`(RFC 9457),驗證錯誤回 `400` 並列出欄位,不是一句 `Bad Request`。
