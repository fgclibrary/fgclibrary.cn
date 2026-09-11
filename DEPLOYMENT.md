# 部署

本站为**纯静态站点**：`next build` 产出 `out/` 目录，部署时只需把该目录交给任一静态托管
（nginx、对象存储 + CDN 等），**运行时不需要 Node 服务**。

## 构建

```bash
pnpm install --frozen-lockfile
pnpm build          # 产物在 out/
```

一个注意点：**构建需要联网**以安装依赖。字体已改为本地自托管
（`geist` 包内随附的 woff2），构建期不再请求 Google Fonts。

构建无需任何环境变量。接口地址来自仓库内的 `openapi.json` / `auth-openapi.json`
的 `servers` 字段（当前为 `https://your-forguncy-site` 占位值），如需调整请直接改这两个文件。

建议在 CI 中构建并打包 `out/` 作为制品（artifact）或镜像，服务器只负责取用与发布。

## nginx 配置

静态导出的产物形态是 `levels.html`、`docs.html` 这样的文件，而非目录索引，所以必须配置
`try_files`；同时原先由 `next.config.ts` 承担的 `/docs/<module>` 跳转需在此接管。

```nginx
server {
    listen 80;
    server_name fgclibrary.cn www.fgclibrary.cn;
    location / { return 301 https://fgclibrary.cn$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name fgclibrary.cn;

    root /srv/fgclibrary.cn/current;   # 指向 out/ 内容（当前发布版本）
    index index.html;

    ssl_certificate     /etc/letsencrypt/live/fgclibrary.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fgclibrary.cn/privkey.pem;

    # 原 next.config.ts 的 redirects：/docs/<module> -> /<module>
    location ~ ^/docs/(levels|solutions|standards|integrations|plugins)/?$ {
        return 301 /$1;
    }

    # 搜索索引无扩展名，需显式指定类型才能被 gzip 压缩（2.1 MB -> 约 415 KB）
    location = /api/search {
        default_type application/json;
        add_header Cache-Control "public, max-age=3600";
    }

    location /_next/static/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        try_files $uri $uri.html $uri/index.html =404;
    }

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
}
```

`try_files` 的三段依次尝试：原路径、同名 `.html`、目录下的 `index.html`；仍无则交给
`404.html`（静态导出会生成该文件，可另配 `error_page 404 /404.html;`）。

## 发布与回滚

静态产物可以按版本目录发布，用软链切换，回滚即换链接：

```bash
# 上传新版本后
ln -sfn /srv/fgclibrary.cn/releases/<commit-sha> /srv/fgclibrary.cn/current
nginx -s reload
```

需要回滚时把 `current` 指回上一个版本目录即可，无需重新构建。

## 从 Node 服务迁移的注意点

本站此前以 Node 服务运行，静态化后有以下变化：

- **接口试调功能已移除**。OpenAPI 文档页不再提供「发送请求」，`/api/proxy` 路由与其
  `PROXY_ALLOWED_ORIGINS` 环境变量均已删除。
- **搜索改为浏览器端检索**。构建期生成索引（`/api/search`），首次搜索时加载后在本地匹配，
  不再有服务端搜索接口。
