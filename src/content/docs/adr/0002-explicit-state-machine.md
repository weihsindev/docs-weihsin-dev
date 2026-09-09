---
title: ADR-0002 狀態轉移規則集中在顯式狀態機
description: 為什麼允許的狀態轉移寫在一個地方,而不是散落在各個端點。
sidebar:
  order: 2
---

<span class="adr-status">已採納</span> · 2026-09-09

## 背景

案件會經過 `Received → UnderReview → Approved → Disbursed`,中途可能 `Rejected`。
會改變案件狀態的來源不只一個:批次會推進、未來可能有人工覆核、也可能有外部系統的
回呼。

最省事的寫法是在每個入口各自判斷:批次裡寫一段 `if`,人工覆核的端點再寫一段。
一開始這樣完全能動。

## 決定

允許的轉移集中在 `StateMachine`,以字典表達,並提供 `CanTransition` 與 `IsTerminal`
兩個查詢。任何要改變狀態的程式碼都必須先問它。

```csharp
[ApplicationStatus.Received]    = [UnderReview, Rejected],
[ApplicationStatus.UnderReview] = [Approved, Rejected],
[ApplicationStatus.Approved]    = [Disbursed],
[ApplicationStatus.Rejected]    = [],
[ApplicationStatus.Disbursed]   = []
```

規則(什麼條件下該往哪走)與轉移合法性(能不能往那走)是分開的兩件事。
`BatchRunner.Decide` 決定想往哪走,`StateMachine` 決定准不准。

## 理由

**新增狀態時,漏改的地方會被發現。** 分散判斷的系統最典型的故障是這樣:
加了一個新狀態,改了三處判斷,漏掉第四處。漏掉的那處不會報錯,它只是靜靜地
讓案件卡在一個沒人預期的狀態,通常在幾週後由對帳或客訴發現。

**非法轉移會被擋下並記錄,而不是靜靜發生。** `BatchRunner` 遇到不合法的轉移時
會寫一筆 warning 並跳過,不是直接寫入。

**狀態機本身就是文件。** 上面那五行比任何一段散文都精確地說明了案件可以怎麼走。

## 代價

- **多一層間接。** 讀 `BatchRunner` 的人需要再跳到 `StateMachine` 才知道完整規則。
  對這個規模的系統,這是明顯划算的交換;對只有兩個狀態的系統則不是。
- **表格與規則可能不同步。** `Decide` 可能回傳一個 `StateMachine` 不允許的轉移。
  目前靠執行期的檢查擋下來並記錄,而不是在編譯期。用型別讓它不可能發生是可行的,
  但複雜度不值得。

## 考慮過的替代方案

**在每個端點各自判斷。** 現在最快,規則長到第三個入口時開始付利息。這個系統
已經有兩個潛在入口(批次、未來的人工覆核),不會停在一個。

**引進狀態機函式庫(如 Stateless)。** 功能更完整——支援守衛條件、進入/離開動作、
階層狀態。但這裡只需要「哪些轉移合法」這一件事,一個字典就足夠,多一個相依帶來的
理解成本高於它省下的程式碼。
