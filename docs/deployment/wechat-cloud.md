# 微信云开发部署说明

本文覆盖从本地演示切换到微信云开发试点环境的步骤。试点和生产环境必须隔离，页面始终通过 `ContentService` 访问内容，不直接读取数据库。

## 1. 取得小程序 AppID

在微信公众平台注册小程序并取得 AppID。复制根目录的 `project.private.config.example.json` 为 `project.private.config.json`，把示例 `appid` 替换为真实值。该私有文件已被 Git 忽略，不应提交。

## 2. 创建隔离的云环境

在微信开发者工具中分别创建试点和生产云环境，记录两个环境 ID。不要让试点环境和生产环境共用数据库、存储桶或身份数据。

## 3. 切换运行时配置

编辑 `miniprogram/config/runtime.ts`：

- 试点部署将 `environment` 设为 `pilot`；正式部署设为 `production`；
- 将 `contentMode` 从 `local` 改为 `cloud`；
- 将 `cloudEnvironmentId` 填为目标环境 ID；
- 保持 `textbookId` 指向该环境中已配置的教材。

本地开发时可随时切回 `local`；本地模式不会调用 `wx.cloud.init`。

## 4. 验证并构建

在仓库根目录运行：

```bash
npm install
npm run check
```

命令成功后，小程序产物位于 `dist/miniprogram/`，云函数产物位于 `dist/cloudfunctions/`。

## 5. 导入项目

在微信开发者工具中导入仓库根目录。`project.config.json` 会将小程序目录指向 `dist/miniprogram/`，将云函数目录指向 `dist/cloudfunctions/`。

## 6. 上传云函数

依次上传并部署以下云函数：

1. `health-check`：用于确认目标环境可调用；
2. `content-service`：为两个页面提供统一教材内容。

当前骨架中的内容函数使用演示 fixture。接入真实云数据库时，应在云函数内部增加数据访问适配器，并保持返回的 `ContentServiceResponse` 契约不变。

## 7. 验收试点环境

至少完成以下检查：

- `health-check` 返回成功状态和有效 ISO 时间；
- “学习”和“家长”两个 Tab 显示同一教材的对应摘要；
- 在两个 Tab 间切换不会产生不必要的重复内容请求；
- 临时断网或令云函数不可用时，页面显示明确错误和“再试一次”按钮；
- 恢复网络后点击重试可以重新读取内容；
- 试点环境操作不会影响生产环境数据。

## 8. 后续迁移到独立腾讯云

迁移时保留页面、`ContentLoader`、共享内容契约和运行时校验，仅替换基础设施适配层：

- 用腾讯云 API 调用适配器替换微信云函数 caller；
- 用独立服务的数据访问层替换云数据库访问；
- 用对象存储适配器替换微信云存储；
- 用服务端身份适配器映射微信登录身份。

页面仍只依赖 `ContentService`，因此迁移不要求改写两个 Tab 的数据契约或视图模型。
