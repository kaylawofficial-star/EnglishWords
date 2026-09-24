# K12 英语单词速记

这是一个微信原生小程序与轻量内容工作台，提供“学习”和“家长”两个小程序 Tab，以及词汇录入、预览、人工审核、发布、下架和回滚能力。默认启用本地演示模式，无需 AppID 或云环境即可构建和查看。

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
npm run check
```

`npm run check` 会依次完成 TypeScript 类型检查、自动化测试和生产构建。构建产物位于：

- `dist/miniprogram/`：微信小程序代码；
- `dist/admin/`：React 内容工作台；
- `dist/cloudfunctions/`：`health-check`、`content-service` 和 `content-management` 三个云函数。

## 本地内容工作台

运行 `npm run build:admin` 后，可用任意静态服务器打开 `dist/admin/`；开发时可运行 `npx vite --config vite.admin.config.ts`，默认地址为 `http://localhost:5173/`。

登录页中的“本地演示模式”会把内容元数据和本地素材 Data URL 保存在当前浏览器的 `localStorage`。它只适合无 AppID 的功能演示，不用于多人协作、跨设备同步或生产发布。若本地数据损坏，存储适配器会保留原始文本供导出恢复，不会自动覆盖。

内容包命令：

```bash
npm run content -- validate content-packs/demo-school.json
npm run content -- import content-packs/demo-school.json --out tmp/imported-content.json
npm run content -- export tmp/imported-content.json --out tmp/exported-content.json
```

导入永远重新创建为草稿，并移除审核、发布和当前指针；仍须在内容工作台中完成预览、人工审核和发布。

## 在微信开发者工具中查看

1. 运行 `npm run build`；
2. 在微信开发者工具中选择“导入项目”；
3. 导入本仓库根目录，而不是 `dist` 子目录；
4. 没有 AppID 时使用项目配置中的测试号继续；
5. 打开后确认“学习”和“家长”两个 Tab 显示同一套演示教材。

运行时配置位于 `miniprogram/config/runtime.ts`。默认 `contentMode` 为 `local`，会显示“本地演示模式”提示，不会初始化或访问微信云开发。

## 接入微信云开发

取得 AppID 后，复制 `project.private.config.example.json` 为 `project.private.config.json`，填入真实 AppID，并按照 [微信云开发部署说明](docs/deployment/wechat-cloud.md) 创建环境、切换运行时配置和上传云函数。

## 当前限制

项目目前没有可用的微信小程序 AppID 和云环境，因此已经完成自动化端到端验证、本地浏览器验证与联合构建，但尚未完成真实微信云环境中的身份、存储、数据库事务、云函数上传和真机验证。
