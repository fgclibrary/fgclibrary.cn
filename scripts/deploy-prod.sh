#!/usr/bin/env bash
#
# 将构建产物发布到 server.prod（fgclibrary.cn 的静态站点）。
#
# 用法：
#   scripts/deploy-prod.sh             构建并发布当前 main
#   scripts/deploy-prod.sh --no-build  跳过构建，直接发布已有的 out/
#
# 发布方式：把 out/ 解包到 /srv/fgclibrary.cn/releases/<commit>/，
# 再用软链 current 指向该目录。回滚只需把 current 指回上一个版本目录。
#
# 首次部署还需安装 nginx 配置，见 DEPLOYMENT.md。

set -euo pipefail

HOST="${DEPLOY_HOST:-server.prod}"
REMOTE_ROOT="/srv/fgclibrary.cn"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
BUILD=1

for arg in "$@"; do
  case "$arg" in
    --no-build) BUILD=0 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "未知参数: $arg" >&2; exit 64 ;;
  esac
done

cd "$(dirname "$0")/.."

# 发布必须基于已提交的代码，避免线上版本无法追溯
if [ -n "$(git status --porcelain)" ]; then
  echo "错误：工作区有未提交的改动，请先提交或 stash 后再发布。" >&2
  exit 1
fi

SHA="$(git rev-parse HEAD)"
SHORT="$(git rev-parse --short HEAD)"
BRANCH="$(git branch --show-current)"
ARCHIVE="/tmp/fgclibrary-${SHORT}.tar.gz"

echo "==> 发布 ${SHORT}（分支 ${BRANCH}）"

if [ "$BUILD" -eq 1 ]; then
  echo "==> 构建"
  pnpm build
fi

if [ ! -f out/index.html ]; then
  echo "错误：未找到 out/index.html，请先执行 pnpm build。" >&2
  exit 1
fi

echo "$SHA" > out/.deploy-version

# COPYFILE_DISABLE=1 阻止 macOS 打包器写入 ._ 元数据文件
# （否则每个文件都会附带一个 AppleDouble 伴随文件，污染线上目录）
echo "==> 打包"
COPYFILE_DISABLE=1 tar -czf "$ARCHIVE" --no-xattrs -C out .
echo "    包大小: $(du -h "$ARCHIVE" | cut -f1)"

echo "==> 上传到 $HOST"
scp -q "$ARCHIVE" "$HOST:/tmp/"

echo "==> 解包并切换"
ssh "$HOST" bash -s <<REMOTE
set -euo pipefail
RELEASE="$REMOTE_ROOT/releases/$SHORT"

sudo mkdir -p "\$RELEASE"
sudo tar -xzf "/tmp/fgclibrary-$SHORT.tar.gz" -C "\$RELEASE"
# 清理可能残留的 macOS 元数据（历史包或非 COPYFILE_DISABLE 打包）
sudo find "\$RELEASE" -name '._*' -delete
sudo chown -R www-data:www-data "\$RELEASE"
sudo chmod 755 "\$RELEASE"

# 原子切换 current 软链
sudo ln -sfn "\$RELEASE" "$REMOTE_ROOT/current"

# 保留最近 \$KEEP_RELEASES 个版本，便于回滚
cd "$REMOTE_ROOT/releases"
ls -1dt */ 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) | while read -r old; do
  # 不删除 current 当前指向的版本
  target="$REMOTE_ROOT/releases/\${old%/}"
  if [ "\$(readlink -f "$REMOTE_ROOT/current")" != "\$target" ]; then
    echo "    清理旧版本: \${old%/}"
    sudo rm -rf "\$target"
  fi
done

sudo rm -f "/tmp/fgclibrary-$SHORT.tar.gz"
echo "    已切换到 \$RELEASE"
REMOTE

echo "==> 验证"
for path in "/" "/docs" "/levels" "/api/search" "/llms.txt"; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "https://fgclibrary.cn$path")"
  printf "    %-16s %s\n" "$path" "$code"
  [ "$code" = "200" ] || { echo "错误：$path 返回 $code" >&2; exit 1; }
done

rm -f "$ARCHIVE"
echo "==> 完成：$SHORT 已发布"
echo "    回滚：ssh $HOST 'cd $REMOTE_ROOT/releases && ls -1dt */ | head -3'"
echo "          ssh $HOST 'sudo ln -sfn $REMOTE_ROOT/releases/<上一个版本> $REMOTE_ROOT/current'"
