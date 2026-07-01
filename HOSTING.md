# 🛠️ Trickcal 工具集 免費架站教學指南

本項目是一個基於 **Vue 3 + Vite** 的純前端靜態網頁應用，不含任何後端伺服器或資料庫。所有的角色編輯資料皆儲存於您個人的瀏覽器中。因此，您可以**完全免費**地將它架設在網路上，並透過專屬的網址進行瀏覽。

以下為您提供最熱門的四種免費架站平台教學，您可以選擇最適合您的一種。

---

## 📌 方案一：Vercel 部署（最推薦，最簡單）

[Vercel](https://vercel.com/) 是一個專為前端設計的雲端託管平台。它能夠自動連結您的 GitHub 儲存庫，在您推送程式碼時**自動編譯並更新網站**。

### 🚀 步驟教學：
1. **註冊並登入：** 
   - 前往 [Vercel 官網](https://vercel.com/)，點擊「Sign Up」。
   - 選擇使用 **GitHub 帳號** 註冊並綁定（這最方便，能直接讀取您的儲存庫）。
2. **匯入儲存庫：**
   - 登入後進入 Dashboard，點擊右上角的 **「Add New...」** ➡️ **「Project」**。
   - 在您的 GitHub 列表中，找到包含本項目的儲存庫，點擊 **「Import」**。
3. **配置項目資訊：**
   - **Framework Preset（框架預設）：** 平台會自動辨識並選擇 **Vite**。
   - **Root Directory（根目錄）：** 保持預設即可。
   - **Build and Output Settings（建置與輸出設定）：** 保持預設（它會自動執行 `npm run build` 並將輸出指向 `dist`）。
4. **開始部署：**
   - 點擊最下方的 **「Deploy」**。
   - 大約等待 1~2 分鐘，網站建置完成後，Vercel 會為您提供一個免費的二級網域名稱（例如：`happy-hawking.vercel.app`），即可直接點擊開啟！

> 💡 **優點：** 速度極快、支援自動建置、每次您在 GitHub 更新程式碼時，網站會自動同步更新。

---

## 📌 方案二：GitHub Pages 部署

本項目已經包含了專為 GitHub Pages SPA 路由設計的 `spa-github-pages` 轉向腳本與 `node scripts/deploy.cjs` 部署腳本。

### 🚀 步驟教學（使用 GitHub Actions 自動編譯）：
1. **建立儲存庫：**
   - 在您的 GitHub 帳號下建立一個新的儲存庫（可以是公開或私有）。
   - 將本項目的程式碼推送（Push）到該儲存庫的 `main` 分支。
2. **開啟 GitHub Pages：**
   - 前往您的儲存庫頁面，點擊 **Settings** ➡️ 左側選單的 **Pages**。
   - 在 **Build and deployment** 下方的 **Source**，選取 **GitHub Actions**。
3. **建立 Actions 腳本：**
   - 在專案根目錄下建立 `.github/workflows/deploy.yml` 檔案，內容如下：
     ```yaml
     name: Deploy to GitHub Pages
     on:
       push:
         branches:
           - main
     permissions:
       contents: read
       pages: write
       id-token: write
     concurrency:
       group: 'pages'
       cancel-in-progress: true
     jobs:
       deploy:
         environment:
           name: github-pages
           url: ${{ steps.deployment.outputs.page_url }}
         runs-on: ubuntu-latest
         steps:
           - name: Checkout
             uses: actions/checkout@v4
           - name: Set up Node
             uses: actions/setup-node@v4
             with:
               node-version: 20
               cache: npm
           - name: Install dependencies
             run: npm ci
           - name: Build
             run: npm run build
           - name: Setup Pages
             uses: actions/configure-pages@v4
           - name: Upload artifact
             uses: actions/upload-pages-artifact@v3
             with:
               path: './dist'
           - name: Deploy to GitHub Pages
             id: deployment
             uses: actions/deploy-pages@v4
     ```
4. 將此工作流檔案推送到 GitHub 後，GitHub Actions 會自動開始執行編譯並發布。發布成功後，在 Repository 的 Settings ➡️ Pages 頁面就會看到網址（例如：`https://<你的用戶名>.github.io/<儲存庫名稱>/`）。

---

## 📌 方案三：Netlify 部署

[Netlify](https://www.netlify.com/) 也是一個極受前端開發者喜愛的免費靜態網站託管平台，功能與 Vercel 相似。

### 🚀 步驟教學：
1. 登入 [Netlify](https://www.netlify.com/) 並綁定您的 GitHub 帳號。
2. 點擊 **「Add new site」** ➡️ **「Import an existing project」**。
3. 選擇 GitHub，找到您的專案。
4. 設定配置：
   - **Build command（建置指令）：** `npm run build`
   - **Publish directory（發布目錄）：** `dist`
5. 點擊 **「Deploy site」**。完成後會分配一個 `*.netlify.app` 網址。

---

## 📌 方案四：Cloudflare Pages 部署

[Cloudflare Pages](https://pages.cloudflare.com/) 擁有遍布全球的邊緣網路 CDN 加速，加載速度極快，且免費額度非常慷慨（無每月的流量上限限制）。

### 🚀 步驟教學：
1. 登入 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. 在左側導覽列中，選擇 **「Workers & Pages」**。
3. 點擊 **「Create」** ➡️ 選擇 **「Pages」** ➡️ **「Connect to Git」**。
4. 授權您的 GitHub 帳號並選擇您的儲存庫。
5. 在「Build settings」設定：
   - **Framework preset（框架預設）：** 選擇 **Vite**。
   - **Build command：** `npm run build`
   - **Build output directory：** `dist`
6. 點擊 **「Save and Deploy」**。部署完成後，會分配一個 `*.pages.dev` 網址。

---

## 💡 如何在本地無安裝 Node.js 的情況下修改與更新？
因為本專案的「角色編輯器」功能支援 **匯出與匯入資料庫**：
1. 您可以在部署完成的線上網站中，使用「角色編輯器」新增或修改角色。
2. 編輯完成後，點擊「**匯出數據**」，下載為 `trickcal_custom_db_xxxx.json`。
3. 如果您希望將這些自定義修改**永久作為預設內容**（讓其他人開啟網站時就能直接看到）：
   - 打開匯出的 JSON 檔案。
   - 將裡面的角色基本資料放入 `public/shared/characters.json`。
   - 將裡面的著色板資料放入 `public/board/data.json` 裡的 `characterBoards` 屬性。
   - 將這兩個修改後的 JSON 檔案直接在 GitHub 網頁版上進行編輯與覆蓋。
   - GitHub 會觸發自動編譯部署，您的網站隨即更新為最新預設角色！
