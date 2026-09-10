---
title: 部署方式
description: 這個 API 怎麼從原始碼變成 api.weihsin.dev 上的服務,以及每個環節為什麼這樣選。
---

一句話:**推到 `main` → GitHub Actions 建置容器映像 → 推到 `ghcr.io` →
Azure Container Apps 拉下來跑,沒有流量時關掉。**

```
git push main
      │
      ▼
GitHub Actions ──build──▶ ghcr.io/weihsindev/api-weihsin-dev:latest
                                      │
                                      ▼
                          Azure Container Apps  (minReplicas=0)
                                      │
                                      ▼
                            https://api.weihsin.dev
```

## 為什麼容器化

因為**部署的單位應該是「已經確定能跑的東西」,不是「原始碼加上一份安裝說明」**。

映像裡已經包含執行需要的一切:.NET 執行環境、編譯好的組件、設定。
平台不需要知道這是 .NET,只需要知道怎麼跑一個容器。
所以換平台的成本很低——這一點在 [ADR-0006](/adr/0006-zero-cost-hosting/)
談「綁在免費額度上」的風險時是重要的緩衝。

`Dockerfile` 是**多階段建置**:

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build    # 編譯階段,需要完整 SDK
...
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime  # 執行階段,只要 runtime
COPY --from=build /app .
USER $APP_UID                                       # 非 root
```

分兩階段的理由有兩個,而且第二個比第一個重要:

1. **映像比較小**。編譯器、SDK、還原下來的套件快取都留在第一階段,不會進到最終映像。
2. **攻擊面比較小**。最終映像裡沒有編譯器、沒有原始碼。
   萬一有人拿到容器裡的執行權限,他能用的工具少很多。

`USER $APP_UID` 讓程序以非 root 身分執行。**公開服務不該用 root 跑**——
容器逃逸的難度和你是不是 root 有直接關係。這個變數由微軟的官方基底映像提供。

還有一個細節值得注意:`Dockerfile` 先只複製 `.csproj` 做 `restore`,之後才複製原始碼。
這樣改程式碼不會讓套件還原的快取失效,建置快很多。

## 為什麼要 CI,不手動建置

手動建置的問題不是麻煩,是**你不知道你上傳的到底是哪一版**。

本機建置時,工作目錄可能有沒提交的修改、可能停在別的分支、可能套件版本和別人不同。
出問題時無法回答「線上跑的是哪個 commit」。

CI 建置的映像有兩個標籤:

- `latest` —— Container Apps 拉這個
- `<commit SHA>` —— 出問題時能指回**確切**的那一次提交

工作流程用 `GITHUB_TOKEN` 推映像,不是個人存取權杖(PAT)。
差別在於 **token 由 Actions 當場簽發、工作結束就失效**,不必在 repo 的
secrets 裡長期保管一把有效的鑰匙。少一個會外洩的東西。

## 網域與憑證

`.dev` 這個 TLD 在 **HSTS preload 名單**裡,瀏覽器對它只走 HTTPS,
沒有 http 的退路。所以憑證不是選配,是這個網域能不能用的前提。

Container Apps 提供免費的 managed certificate,自動續期。但它有一個
**會安靜失敗**的前提:

> 子網域的 CNAME 必須**直接**指向 container app 的網域。
> 指向中間的 CNAME(例如 Cloudflare 的代理)會擋掉憑證的簽發**與續期**。

所以 `api.weihsin.dev` 在 Cloudflare 的 DNS 設定必須是 **DNS only(灰雲)**,
不能開代理。這件事的麻煩之處在於:**開了代理不會立刻壞掉**,
現有憑證還能用幾個月,直到某天續期失敗,服務才突然無法連線。

## 沒有做的事

這些在營運環境是必要的,這裡刻意沒有做,理由都是同一個:
[這是展示環境,不是產品](/adr/0006-zero-cost-hosting/)。

- **沒有預備環境(staging)。** 推到 `main` 就是上線。
- **沒有自動回滾。** 出問題手動把 Container Apps 指回上一個 SHA 標籤。
- **沒有歷史日誌。** 只有即時的 log stream,不落地儲存。
- **沒有健康檢查以外的監控。** 沒有告警,掛了要自己發現。
