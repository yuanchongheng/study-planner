# Notion Calendar 双向同步部署

前端已经升级为网页 ↔ Notion Calendar 双向同步，但要真正启用，还需要把新版 Supabase Edge Function 部署一次。

## 需要做的唯一手动步骤

1. 打开 Supabase Dashboard → Edge Functions → `notion-calendar-sync`。
2. 用本仓库文件 `supabase/functions/notion-calendar-sync/index.ts` 的全部内容替换旧函数代码。
3. 保持 Verify JWT 开启并 Deploy。
4. 现有 Secrets 不需要改：
   - `NOTION_TOKEN`
   - `NOTION_DATABASE_ID`
   - `NOTION_ALLOWED_USER_ID`
   - `NOTION_SITE_ORIGIN=https://yuanchongheng.github.io`
5. 回到网页，刷新后点击「立即双向同步」。

## 双向同步支持

- 网页新增 / 修改 / 删除任务 → Notion Calendar
- Notion Calendar 修改标题、学习目标、类别、时间、完成状态 → 网页
- 在 Notion Calendar 移动到其他日期 → 网页对应日期
- 跨日任务，例如 23:30—01:00
- Notion 中新建任务 → 网页
- 同一任务两边同时改动时，网页会提示选择保留网页或 Notion 版本

## 安全说明

Notion Token 仍只保存在 Supabase Secrets。GitHub 和网页中不包含令牌或 service_role 密钥。

首次启用前建议先在网页导出 JSON 备份，再只测试一天。
