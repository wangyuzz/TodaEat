# 部署 TodayEat

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

首次运行前修改 `.env` 中的 `APP_PASSWORD`、`ADMIN_PASSWORD` 和 `JWT_SECRET`。配置模板的密码和密钥仅用于展示变量名；不要直接用于实际部署。可用下面的 Node.js 命令生成随机 JWT 密钥：

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Linux 从包含 `.env` 和 `static/` 的目录执行 `./todayeat`。Windows 本地启动脚本从 `backend/` 运行，因此使用 `backend/.env` 和 `backend/` 下的数据目录。

默认端口是 `8080`，服务监听所有网络接口。仅在本机使用时，用防火墙限制外部访问；对外部署时通过反向代理提供 HTTPS，不要将未经保护的服务直接暴露到互联网。

## Linux 服务托管

将构建包放在 `/opt/todayeat`，准备配置后，可使用下面的 systemd 服务模板。先创建专用的 `todayeat` 系统用户，并让它可以读写运行目录中的数据库和上传目录。

```ini
[Unit]
Description=TodayEat dining journal
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
- 当前 `/uploads/` 图片路径不经过应用密码验证。不要在公网实例中上传需要严格保密的照片；若需要私密图片访问，应在发布前实现图片鉴权或使用受限网络。
- 高德地点搜索会将搜索词发送到高德服务。该功能可选，留空 `AMAP_KEY` 时核心功能仍可使用。
- Google Fonts 字体来自外部服务。如需完全离线部署，可移除 `frontend/index.html` 中的字体链接并使用系统字体，再重新构建前端。

## 备份与更新

备份运行中的 SQLite 数据库时使用 SQLite 的备份能力，例如 `.backup`，避免只复制可能尚未合并 WAL 数据的主文件。也可以停止服务后完整备份数据目录。

更新前停止服务并备份上述持久化内容，替换二进制和 `static/` 后重新启动。若更新失败，恢复旧程序以及必要的数据备份。不要将个人运行数据放入公开源码包。
