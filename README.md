# TodayEat · 今天吃什么

一个可自行部署的双人餐厅收藏和用餐记录应用。收藏想去的餐厅，纠结时随机选一家，吃完留下评分、心情和照片，让每一次一起吃饭都有迹可循。情侣、朋友或其他希望共同记录用餐的小伙伴都可以部署自己的实例。

前端使用 React + Vite，后端使用 Go + Gin + SQLite。构建后由一个 Go 服务提供页面和 API，适合部署在自己的服务器上。

TodayEat is a self-hosted restaurant wishlist and shared dining journal for two people. It supports random restaurant selection, ratings, photos, visit history, and achievements. Anyone can run their own instance using the documented setup below. Optional location search uses AMap; the core application works without an API key.

## 功能

- **餐厅收藏**：管理餐厅分类、地址、招牌菜、标签和图片，标记想去的餐厅。
- **随机选择**：不知道吃什么时，从餐厅列表中随机挑选。
- **双人打卡**：记录日期、吃过的菜、双方评分与心情、花费、备注和照片。
- **用餐回忆**：通过历史记录、统计和照片墙回顾一起吃过的饭。
- **成就系统**：根据打卡记录自动解锁成就，保留解锁历史。
- **管理后台**：管理菜品和打卡记录，支持菜品复制、批量分类、启用与停用，以及应用名称设置。
- **照片处理**：自动压缩展示图，同时保留上传原图的备份。
- **访问保护**：应用访问密码与管理员密码分别配置，管理员使用 JWT 会话；照片需要登录后访问。
- **地点搜索**：可选接入高德地图，搜索餐厅位置。

首次启动会自动初始化 SQLite 数据库，并添加示例餐厅、菜单和成就。

## 代码与版本来源

本项目在作者自己的早期版本上继续开发。部分前端源码从作者已有部署的构建产物恢复，随后重构维护，因此有些模块保留了恢复后的变量名和兼容层。正式开发代码位于 `frontend/src/` 和 `backend/`，恢复工具、个人运行数据及本地工具链不属于发布源码。

本次整理补全了公开开发所需的部署文档、贡献说明和自动检查。照片墙支持按月份分组、月份筛选、图片预览与加载失败重试；后端包含配置、认证、上传、数据库及接口行为测试。持续检查见仓库的 Actions 页面。

## 技术栈

| 部分 | 技术 |
| --- | --- |
| 前端 | React 19、Vite 8、React Router |
| 状态与请求 | TanStack Query、Zustand、Axios |
| 动画与图标 | GSAP、Lucide |
| 后端 | Go、Gin、GORM |
| 数据库 | SQLite，纯 Go 驱动 |
| 认证 | 应用密码、管理员 JWT |

## 快速开始

### 环境要求

- Go 1.25.5 或更高版本。
- Node.js 22.12 或更高版本及 npm。
- Windows 使用 PowerShell；Linux / macOS 使用 Bash。

克隆或下载仓库后，进入项目根目录。

### 1. 配置应用

将配置模板复制到 `backend/.env`。首次配置时执行：

```powershell
# Windows PowerShell
Copy-Item .env.example backend/.env
```

```bash
# Linux / macOS
cp .env.example backend/.env
```

编辑 `backend/.env`，设置自己的 `APP_PASSWORD`、`ADMIN_PASSWORD` 和随机生成的 `JWT_SECRET`。密码至少 8 个字符，JWT 密钥至少 32 字节；缺少必需配置或使用公开占位值时服务会拒绝启动。已有配置时直接编辑现有文件。生成密钥的方法见 [部署说明](DEPLOY.md)。

### 2. 启动开发环境

在第一个终端启动后端：

```bash
cd backend
go mod download
go run ./cmd/server
```

在另一个终端，从项目根目录启动前端：

```bash
cd frontend
npm ci
npm run dev
```

打开 [http://127.0.0.1:5173](http://127.0.0.1:5173)，使用配置的应用密码进入。

开发服务器会将 `/api` 和 `/uploads` 请求代理到 `http://127.0.0.1:8080`。如果修改后端端口，也需要修改 `frontend/vite.config.js` 中的代理地址。

### Windows 一体化运行

完成上述配置后，在项目根目录执行：

```powershell
./scripts/build.ps1
./scripts/start-local.ps1
```

打开 [http://127.0.0.1:8080](http://127.0.0.1:8080)。启动脚本使用 `backend/.env`，数据库和照片默认保存在 `backend/` 下。按 `Ctrl+C` 停止服务。

## 构建与部署

### Windows 上构建

```powershell
# Windows AMD64
./scripts/build.ps1

# Linux AMD64
./scripts/build.ps1 -TargetOS linux -TargetArch amd64

# Linux ARM64
./scripts/build.ps1 -TargetOS linux -TargetArch arm64
```

如果已安装前端依赖，可添加 `-SkipInstall` 跳过 `npm ci`。

### Linux / macOS 上构建

```bash
# Linux AMD64
bash scripts/build.sh linux amd64

# Linux ARM64
bash scripts/build.sh linux arm64
```

构建结果位于 `dist/`，包含可执行文件、`static/` 前端资源、配置模板和部署说明。Windows 构建脚本生成 ZIP 或 TAR.GZ 运行包，Bash 脚本生成 TAR.GZ 运行包。

### Linux 运行

以 Linux AMD64 构建结果为例，进入运行目录并准备配置：

```bash
cd dist/todayeat-linux-amd64
cp .env.example .env
chmod +x todayeat
```

编辑该目录下的 `.env`，设置密码和 JWT 密钥后启动：

```bash
./todayeat
```

ARM64 使用对应的 `todayeat-linux-arm64` 目录。请在包含 `.env` 和 `static/` 的运行目录中启动程序。服务默认监听 `8080` 端口，可通过反向代理配置域名和 HTTPS。

服务托管、备份和更新步骤见 [部署说明](DEPLOY.md)。

## 配置

配置模板见 [.env.example](.env.example)。相对路径以程序的工作目录为基准。

| 变量 | 说明 | 默认值 / 模板值 |
| --- | --- | --- |
| `PORT` | 服务端口 | `8080` |
| `APP_PASSWORD` | 应用访问密码，至少 8 个字符 | 未设置时使用已配置的管理员密码；拒绝 `change-me` |
| `ADMIN_PASSWORD` | 管理员密码，至少 8 个字符 | 必须配置；拒绝 `change-me` |
| `JWT_SECRET` | 会话签名密钥 | 必须配置至少 32 字节的随机密钥；拒绝示例值 |
| `JWT_EXPIRE` | 管理员及照片会话有效期 | `24h` |
| `DB_PATH` | SQLite 数据库路径 | `data/todayeat.db` |
| `UPLOAD_DIR` | 展示图片目录 | `uploads` |
| `BACKUP_DIR` | 上传原图备份目录 | `uploads_backup` |
| `MAX_UPLOAD_SIZE_MB` | 单个上传文件的大小上限，MB | `20` |
| `COMPRESS_MAX_DIM` | 图片压缩后的最长边，像素 | `1200` |
| `JPEG_QUALITY` | JPEG 压缩质量 | `85` |
| `AMAP_KEY` | 高德地图 Web 服务 Key | 可选 |
| `AMAP_CITY` | 地点搜索的城市范围 | 可选 |

未配置高德 Key 时，其他功能仍可使用。

## 数据保存

默认需要保存以下内容：

```text
运行目录/
├── .env                 # 密码、密钥和运行配置
├── data/todayeat.db      # 餐厅、菜单、打卡和设置
├── uploads/             # 展示图片
└── uploads_backup/      # 上传原图
```

升级时保留这些文件和目录。备份运行中的 SQLite 数据库时，应使用 SQLite 的备份功能，例如 `.backup`；也可以停止服务后备份数据文件。

仓库及源码包不包含个人数据库、照片或实际运行密码。`.gitignore` 已排除本地配置、数据、上传文件、依赖目录和构建产物。

## 项目结构

```text
backend/
├── cmd/server/          # 服务入口
└── internal/            # 认证、配置、数据库、接口与图片处理
frontend/
├── public/              # 公共资源
└── src/
    ├── application.jsx # 主应用、路由和公共页面
    ├── components/     # 共享组件
    └── pages/          # 打卡、照片墙、成就和管理后台
scripts/                 # 构建、启动、源码打包与校验工具
.env.example             # 配置模板
DEPLOY.md                # 部署说明
```

## 开发检查

后端测试与静态检查：

```bash
cd backend
go test ./...
go vet ./...
```

前端构建检查，在项目根目录执行：

```bash
cd frontend
npm ci
npm test
npm run build
```

需要单独打包源码时，可在项目根目录运行 `./scripts/package-source.ps1`，输出为 `dist/todayeat-recovered-source.zip`。

## 参与开发与许可证

欢迎提交可复现的问题、文档修正和功能改进。开发与验证流程见 [CONTRIBUTING.md](CONTRIBUTING.md)，部署及数据保护说明见 [DEPLOY.md](DEPLOY.md)。

本项目的自有源码按 [MIT 许可证](LICENSE) 发布。第三方依赖和已有的版权声明仍适用其各自许可证；请参阅 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
