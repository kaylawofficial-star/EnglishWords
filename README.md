# K12 英语单词速记

这是一个微信原生小程序试点骨架，当前提供“学习”和“家长”两个 Tab，并通过统一内容服务读取可配置教材。默认启用本地演示模式，无需 AppID 或云环境即可构建和查看。

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
npm run check
```

`npm run check` 会依次完成 TypeScript 类型检查、自动化测试和生产构建。构建产物位于：

- `dist/miniprogram/`：微信小程序代码；
- `dist/cloudfunctions/`：`health-check` 和 `content-service` 云函数。

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

项目目前没有可用的微信小程序 AppID 和云环境，因此已经完成自动化验证与本地构建，但尚未完成真实微信云环境的上传、调用和设备验证。
