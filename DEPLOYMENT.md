# 部署

本站为**纯静态站点**：`pnpm build` 产出 `out/` 目录，部署时只需把该目录交给静态托管
（nginx、对象存储 + CDN 等），**运行时不需要 Node 服务**。

线上环境：`server.prod`（腾讯云轻量，Ubuntu 24.04），nginx 直接托管
`/srv/fgclibrary.cn/current`。

## 发布

```bash
pnpm install --frozen-lockfile   # 首次
scripts/deploy-prod.sh           # 构建并发布（工作区必须干净）
scripts/deploy-prod.sh --no-build  # 复用已有 out/
```

脚本会：校验工作区 → 构建 → 打包 → 上传 → 解包到
`/srv/fgclibrary.cn/releases/<commit>/` → 原子切换 `current` 软链 → 验证关键路径。
默认保留最近 5 个版本。

### 回滚

```bash
ssh server.prod 'ls -1dt /srv/fgclibrary.cn/releases/*/'
ssh server.prod 'sudo ln -sfn /srv/fgclibrary.cn/releases/<上一个版本> /srv/fgclibrary.cn/current'
```

回滚只需换软链，无需重新构建。

## 构建须知

- **构建需要联网**以安装依赖。字体已本地自托管（`geist` 包随附的 woff2），
  构建期不再请求 Google Fonts。
- **无需任何环境变量**。接口地址来自仓库内 `openapi.json` / `auth-openapi.json` 的
  `servers` 字段（现为 `https://your-forguncy-site` 占位值），调整请直接改这两个文件。
- **在 macOS 上打包务必禁用元数据**。`tar` 默认会为每个文件附加 `._*`
  AppleDouble 伴随文件（曾有 1107 个文件被打进 1395 个伴随文件）。脚本已用
  `COPYFILE_DISABLE=1` 与 `--no-xattrs` 处理，并会在服务端兜底清理。

## nginx 配置

配置位于服务器 `/etc/nginx/sites-available/fgclibrary.cn`（由 `sites-enabled` 软链启用）。
要点：

- 产物形态是 `levels.html` 这类文件而非目录索引，故 `try_files` 需优先尝试 `$uri.html`。
- `next.config.ts` 的 `redirects` 静态导出不支持，`/docs/<module> -> /<module>` 由 nginx 接管。
- 搜索索引 `/api/search` 无扩展名，需显式指定 MIME 才能被 gzip 压缩。

```nginx
server {
	listen 80;
	listen [::]:80;
	server_name fgclibrary.cn www.fgclibrary.cn;
	include /etc/nginx/snippets/acme-challenge.conf;
	location / { return 301 https://fgclibrary.cn$request_uri; }
}

server {
	listen 443 ssl http2;
	listen [::]:443 ssl http2;
	server_name fgclibrary.cn;

	ssl_certificate     /etc/letsencrypt/live/fgclibrary.cn/fullchain.pem;
	ssl_certificate_key /etc/letsencrypt/live/fgclibrary.cn/privkey.pem;

	root /srv/fgclibrary.cn/current;
	index index.html;

	# 原 next.config.ts 的 redirects
	location ~ ^/docs/(levels|solutions|standards|integrations|plugins)/?$ {
		return 301 /$1;
	}

	location = /api/search {
		default_type application/json;
		add_header Cache-Control "public, max-age=3600";
	}

	location /_next/static/ {
		add_header Cache-Control "public, max-age=31536000, immutable";
	}

	location ^~ /.well-known/ { allow all; }

	location ~ /\. { deny all; }   # 不暴露 .deploy-version 等点文件

	# 产物为 foo.html 形态，故 .html 优先于目录匹配
	location / {
		try_files $uri.html $uri $uri/index.html @strip_trailing_slash;
	}

	location @strip_trailing_slash {
		rewrite ^/(.+)/$ /$1 permanent;
		return 404;
	}

	error_page 404 /404.html;

	gzip on;
	gzip_comp_level 5;
	gzip_min_length 1024;
	gzip_vary on;
	gzip_types text/plain text/css application/javascript application/json image/svg+xml application/xml;
}

server {
	listen 443 ssl http2;
	listen [::]:443 ssl http2;
	server_name www.fgclibrary.cn;
	ssl_certificate     /etc/letsencrypt/live/fgclibrary.cn/fullchain.pem;
	ssl_certificate_key /etc/letsencrypt/live/fgclibrary.cn/privkey.pem;
	return 301 https://fgclibrary.cn$request_uri;
}
```

## 图片

`next/image` 已关闭优化，图片按 `public/` 原文件直出。新增图片后先压缩：

```bash
pnpm images:optimize            # 生成 .webp，保留原图
pnpm images:optimize -- --replace  # 确认后删除原图
```

随后把 Markdown 中的引用扩展名改为 `.webp`。

## 从 Node 服务迁移的注意点

本站此前以 Node 服务运行，静态化后有以下变化：

- **接口试调功能已移除**。OpenAPI 文档页不再提供「发送请求」，`/api/proxy` 路由与其
  `PROXY_ALLOWED_ORIGINS` 环境变量均已删除。
- **搜索改为浏览器端检索**。构建期生成索引（`/api/search`），首次搜索时加载后在本地匹配，
  不再有服务端搜索接口。
