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

命令成功后，小程序产物位于 `dist/miniprogram/`，内容工作台位于 `dist/admin/`，云函数产物位于 `dist/cloudfunctions/`。

## 5. 导入项目

在微信开发者工具中导入仓库根目录。`project.config.json` 会将小程序目录指向 `dist/miniprogram/`，将云函数目录指向 `dist/cloudfunctions/`。

## 6. 上传云函数

依次上传并部署以下云函数：

1. `health-check`：用于确认目标环境可调用；
2. `content-service`：为两个学生端页面提供统一教材内容；
3. `content-management`：处理管理员授权、草稿、审核、发布、下架、回滚和上传凭证。

为 `content-management` 云函数设置环境变量 `CONTENT_ADMIN_IDS`，值为允许管理内容的 OpenID，多个 ID 用英文逗号分隔。首版只配置一个管理员。网页端隐藏按钮不构成授权，所有管理动作仍由云函数白名单复核。

## 7. 配置数据库、索引与存储

创建以下集合：

- `content_assets`
- `content_asset_versions`
- `content_placements`
- `content_placement_versions`
- `content_reviews`
- `content_publications`
- `content_audits`
- `content_current_publications`

稳定记录使用业务 ID 作为文档 ID。建议为 `content_assets.normalizedWord`、`content_placements.assetId`、`content_placements.textbookId`、`content_placements.unitId`、`content_publications.requestId` 建立索引。发布、下架和回滚必须在数据库事务中更新发布记录与当前指针。

在 CloudBase Web 控制台配置网页安全域名和自定义身份验证，使内容工作台能够登录后调用 `content-management`。浏览器只向云函数申请上传意图，再直传云存储；不得把长期密钥下发到前端。

允许的素材格式为 PNG、JPEG、WebP、MP3 和 MP4 音频，单文件必须大于 0 且不超过 10 MB，并提供 SHA-256、授权来源和人工审核状态。缺少授权或未审核的素材不能发布。

## 8. 导入与验收内容

`npm run content -- import` 只生成草稿，不保留源包中的审核与发布状态。管理员需在工作台中依次完成：完整预览、提交审核、逐项审核通过、发布、学生端读取、下架、历史解析和回滚。

未来学习记录必须保存 `publicationId`、`assetVersionId` 和 `placementVersionId`，才能解释学生当时使用的内容。历史解析接口只用于解释旧记录，不会把旧版本重新设为当前发布。

## 9. 验收试点环境

至少完成以下检查：

- `health-check` 返回成功状态和有效 ISO 时间；
- “学习”和“家长”两个 Tab 显示同一教材的对应摘要；
- 在两个 Tab 间切换不会产生不必要的重复内容请求；
- 临时断网或令云函数不可用时，页面显示明确错误和“再试一次”按钮；
- 恢复网络后点击重试可以重新读取内容；
- 试点环境操作不会影响生产环境数据。
- 内容工作台只能由 `CONTENT_ADMIN_IDS` 中的管理员调用；
- 发布后学生端只看到当前版本，下架后当前查询不再返回，历史 ID 仍可解析；
- 回滚会创建新发布记录，旧版本和审计记录保持不变。

当前仍缺少真实 AppID，因此云端身份、对象存储、事务、网页安全域名、三套云函数上传和真机行为必须在取得 AppID 后按本节补做。

## 10. 后续迁移到独立腾讯云

迁移时保留页面、`ContentLoader`、共享内容契约和运行时校验，仅替换基础设施适配层：

- 用腾讯云 API 调用适配器替换微信云函数 caller；
- 用独立服务的数据访问层替换云数据库访问；
- 用对象存储适配器替换微信云存储；
- 用服务端身份适配器映射微信登录身份。

页面仍只依赖 `ContentService`，因此迁移不要求改写两个 Tab 的数据契约或视图模型。
