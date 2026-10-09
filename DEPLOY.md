# 部署 TodaEat

## 构建和启动

按照 [README](README.md) 安装 Go 和 Node.js，在项目根目录构建：

```powershell
# Windows
./scripts/build.ps1
./scripts/start-local.ps1
```

```bash
# Linux AMD64；ARM64 将 amd64 改为 arm64
bash scripts/build.sh linux amd64
cd dist/todayeat-linux-amd64
cp .env.example .env
```

首次运行前修改 `.env` 中的 `APP_PASSWORD`、`ADMIN_PASSWORD` 和 `JWT_SECRET`。两个密码至少 8 个字符，JWT 密钥至少 32 字节；缺少必需配置或使用公开示例密码、密钥时，服务会拒绝启动。应用密码留空时使用已配置的管理员密码，推荐分别设置两个强密码。可用下面的 Node.js 命令生成随机 JWT 密钥：

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Linux 从包含 `.env` 和 `static/` 的目录执行 `./todayeat`。Windows 本地启动脚本从 `backend/` 运行，因此使用 `backend/.env` 和 `backend/` 下的数据目录。

默认端口是 `8080`，服务监听所有网络接口。仅在本机使用时，用防火墙限制外部访问；对外部署时通过反向代理提供 HTTPS，不要将未经保护的服务直接暴露到互联网。

## Linux 服务托管

将构建包放在 `/opt/todayeat`，准备配置后，可使用下面的 systemd 服务模板。先创建专用的 `todayeat` 系统用户，并让它可以读写运行目录中的数据库和上传目录。

```ini
[Unit]
Description=TodaEat dining journal
After=network.target

[Service]
Type=simple
User=todayeat
WorkingDirectory=/opt/todayeat
ExecStart=/opt/todayeat/todayeat
Restart=on-failure
RestartSec=5
UMask=0077

[Install]
WantedBy=multi-user.target
```

保存为 `/etc/systemd/system/todayeat.service`，然后执行 `sudo systemctl daemon-reload` 和 `sudo systemctl enable --now todayeat`。Nginx、Caddy 等反向代理应指向本机 `127.0.0.1:8080`，并按图片上传上限配置请求大小和超时。

## 数据与访问边界

- 保存 `.env`、`data/`、`uploads/` 和 `uploads_backup/`；升级时只替换程序和 `static/`。
- 应用访问密码保护常规 API，管理员 JWT 保护管理接口；二者都应使用强密码。
- `/uploads/` 的 GET / HEAD 请求需要登录。浏览器登录或发送有效 API 凭据后，会收到仅用于读取照片的 HttpOnly、SameSite=Strict Cookie，路径为 `/uploads`，有效期由 `JWT_EXPIRE` 决定。照片 Cookie 不授予 API 或管理员权限；直接携带应用密码或管理员令牌的图片请求也可使用。
- 照片响应使用 `private, no-store`，不要在 CDN 或反向代理中绕过鉴权直接提供上传目录。修改任一密码或 JWT 密钥并重启后，旧照片会话失效；通过后续已认证 API 请求可重新获取照片会话。
- 前端页面、`/api` 与 `/uploads` 应保持同源（开发时通过 Vite 代理）。HTTPS 终止代理须覆盖客户端提供的 `X-Forwarded-Proto`，并设置为 `https`，让后端签发 Secure Cookie。公网使用 HTTPS，本机 HTTP 开发可正常使用。
- 高德地点搜索会将搜索词发送到高德服务。该功能可选，留空 `AMAP_KEY` 时核心功能仍可使用。
- Google Fonts 字体来自外部服务。如需完全离线部署，可移除 `frontend/index.html` 中的字体链接并使用系统字体，再重新构建前端。

## 备份与更新

备份运行中的 SQLite 数据库时使用 SQLite 的备份能力，例如 `.backup`，避免只复制可能尚未合并 WAL 数据的主文件。也可以停止服务后完整备份数据目录。

更新前停止服务并备份上述持久化内容，替换二进制和 `static/` 后重新启动。若更新失败，恢复旧程序以及必要的数据备份。不要将个人运行数据放入公开源码包。

从旧版本升级时，先检查密码和 JWT 密钥是否满足上述要求。使用默认密码或密钥的实例必须更换配置；如曾对外开放，应同时更换两个密码和 JWT 密钥，让旧令牌失效。已有浏览器登录在发送已认证 API 请求时会获得照片 Cookie，无需清空本地存储。直接打开旧照片链接需要先进入应用登录。
