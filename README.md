# 呼吸科临床治疗小组绩效分配系统

## 项目功能描述

本系统是一个专为呼吸科临床治疗小组设计的绩效分配管理系统，主要功能包括：

### 核心功能
- **医生信息管理**：录入和管理医生基本信息（姓名、职称、职称系数）
- **工作数据录入**：记录医生月度工作数据（出勤天数、出院人数、床日数、奖罚情况）
- **绩效计算**：基于工作量和职称系数自动计算绩效分配
- **结果展示**：图表化展示绩效分配结果和统计分析
- **历史查询**：查看和管理历史绩效数据
- **数据导出**：支持Excel格式数据导出

### 技术特性
- **PWA支持**：支持离线使用和桌面安装
- **响应式设计**：适配各种设备屏幕
- **数据持久化**：使用PocketBase云数据库存储
- **实时同步**：多设备数据实时同步

## 项目部署方式

本项目采用 **PocketBase + Render 免费层** 的部署方案，包含以下组件：

### 架构组成
1. **前端**：静态HTML/CSS/JavaScript应用
2. **后端**：PocketBase数据库服务
3. **部署平台**：Render免费层托管

### 部署优势
- ✅ **完全免费**：使用Render免费层，无需付费
- ✅ **自动部署**：Git推送自动触发部署
- ✅ **HTTPS支持**：自动提供SSL证书
- ✅ **全球CDN**：快速访问体验
- ✅ **数据持久化**：PocketBase提供可靠的数据存储

## 项目执行步骤

### 第一步：准备PocketBase后端

#### 1.1 创建Render Web Service（后端）

1. 登录 [Render](https://render.com) 并创建账户
2. 点击 "New" → "Web Service"
3. 连接你的GitHub仓库
4. 配置服务设置：
   ```
   Name: performance-system-backend
   Environment: Docker
   Region: Oregon (US West)
   Branch: main
   Dockerfile Path: ./pocketbase/Dockerfile
   ```

#### 1.2 设置环境变量

在Render控制台中设置以下环境变量：
```
PORT=8080
PB_ENCRYPTION_KEY=your-32-character-encryption-key
```

#### 1.3 配置持久化存储

在Render服务设置中添加持久化磁盘：
```
Mount Path: /pb_data
Size: 1GB (免费层限制)
```

### 第二步：部署前端应用

#### 2.1 创建Render Static Site（前端）

1. 在Render控制台点击 "New" → "Static Site"
2. 连接同一个GitHub仓库
3. 配置构建设置：
   ```
   Name: performance-system-frontend
   Build Command: chmod +x build.sh && ./build.sh
   Publish Directory: dist
   ```

#### 2.2 设置环境变量

在前端服务中设置：
```
POCKETBASE_URL=https://your-backend-service.onrender.com
```

### 第三步：初始化数据库

#### 3.1 访问PocketBase管理界面

1. 等待后端服务部署完成
2. 访问 `https://your-backend-service.onrender.com/_/`
3. 创建管理员账户

#### 3.2 导入数据库Schema

1. 在PocketBase管理界面中，进入 "Settings" → "Import collections"
2. 上传 `pocketbase/pb_schema.json` 文件
3. 确认导入所有集合（表）

#### 3.3 配置API规则

确保以下集合的API规则设置正确：
- `doctors`: 允许读写访问
- `work_data`: 允许读写访问
- `performance_results`: 允许读写访问

### 第四步：验证部署

#### 4.1 测试后端API

访问以下URL验证后端服务：
```
https://your-backend-service.onrender.com/api/health
https://your-backend-service.onrender.com/api/collections
```

#### 4.2 测试前端应用

1. 访问前端应用URL
2. 测试添加医生功能
3. 测试数据录入和计算功能
4. 验证数据持久化

### 第五步：配置自定义域名（可选）

#### 5.1 前端域名配置

1. 在Render前端服务设置中点击 "Custom Domains"
2. 添加你的域名（如：performance.yourdomain.com）
3. 按照提示配置DNS记录

#### 5.2 后端域名配置

1. 为后端服务配置子域名（如：api.yourdomain.com）
2. 更新前端环境变量中的 `POCKETBASE_URL`

## 本地开发环境

### 启动本地开发服务器

```bash
# 启动前端开发服务器
python -m http.server 8080

# 或使用Node.js
npx serve .
```

### 本地PocketBase开发

```bash
# 下载PocketBase
cd pocketbase
wget https://github.com/pocketbase/pocketbase/releases/download/v0.21.1/pocketbase_0.21.1_linux_amd64.zip
unzip pocketbase_0.21.1_linux_amd64.zip

# 启动PocketBase
./pocketbase serve --http=127.0.0.1:8090
```

## 故障排除

### 常见问题

1. **部署失败**
   - 检查Dockerfile语法
   - 确认环境变量设置正确
   - 查看Render部署日志

2. **数据库连接失败**
   - 验证POCKETBASE_URL环境变量
   - 检查后端服务是否正常运行
   - 确认API规则配置

3. **前端功能异常**
   - 检查浏览器控制台错误
   - 验证PocketBase SDK加载
   - 确认网络连接

### 监控和维护

- **服务监控**：Render提供基本的服务监控
- **日志查看**：在Render控制台查看服务日志
- **数据备份**：定期导出PocketBase数据
- **更新部署**：推送代码到GitHub自动触发部署

## 技术支持

如遇到问题，请检查：
1. [Render官方文档](https://render.com/docs)
2. [PocketBase官方文档](https://pocketbase.io/docs/)
3. 项目GitHub Issues

---

**Made by Kangkai**

本项目基于MIT许可证开源，欢迎贡献代码和反馈问题。
