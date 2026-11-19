# PXLabs Terminal Home

一个使用原生 HTML、CSS 和 JavaScript 编写的极客终端风个人主页，入口为根目录的 `index.html`。

## 修改内容

在 `index.html` 中替换自我介绍、项目和联系方式占位内容。计数器只需在 `config.js` 中配置：

```js
window.SITE_CONFIG = {
  NAMESPACE: "pxlabs-home-a93f27c6d41e",
  BUTTONS: [
    { label: "Team", key: "team" },
    { label: "Outlook", key: "outlook" },
  ],
};
```

- `NAMESPACE` 建议修改为一个不易与其他站点重复的随机字符串；修改后会使用一套全新的计数器。
- `BUTTONS` 中的 `label` 是页面显示文字，`key` 是 Abacus 中的计数器标识。
- 计数器地址由 Abacus API 自动生成，仓库中不需要密钥或 token。

## GitHub Pages

1. 将代码推送到 `main` 分支。
2. 打开仓库的 **Settings → Pages**。
3. 在 **Build and deployment → Source** 中选择 **GitHub Actions**。
4. 推送后前往 **Actions** 查看部署结果，首次启用 Pages 后站点地址会显示在部署结果中。

工作流定义在 `.github/workflows/pages.yml`，支持 `main` 分支推送和手动触发。
