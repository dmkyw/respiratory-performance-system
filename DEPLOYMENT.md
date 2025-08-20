# 快速部署指南

## 🚀 一键部署到Render免费层

### 前置条件
- GitHub账户
- Render账户（免费）

### 部署步骤

#### 1. 准备代码仓库
```bash
# 将项目推送到GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/respiratory-performance-system.git
git push -u origin main
```

#### 2. 部署PocketBase后端

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

**手动部署步骤：**
1. 登录 [Render](https://render.com)
2. 点击 "New" → "Web Service"
3. 连接GitHub仓库
4. 配置：
   ```
   Name: performance-system-backend
   Environment: Docker
   Dockerfile Path: ./pocketbase/Dockerfile
   ```
5. 添加环境变量：
   ```
   PORT=8080
   PB_ENCRYPTION_KEY=your-32-character-random-key
   ```
6. 点击 "Create Web Service"

#### 3. 部署前端静态网站

1. 在Render控制台点击 "New" → "Static Site"
2. 选择同一个GitHub仓库
3. 配置：
   ```
   Name: performance-system-frontend
   Build Command: chmod +x build.sh && ./build.sh
   Publish Directory: dist
   ```
4. 添加环境变量：
   ```
   POCKETBASE_URL=https://your-backend-service.onrender.com
   ```
5. 点击 "Create Static Site"

#### 4. 初始化数据库

1. 等待后端部署完成（约5-10分钟）
2. 访问 `https://your-backend-service.onrender.com/_/`
3. 创建管理员账户
4. 导入schema：
   - 进入 "Settings" → "Import collections"
   - 上传 `pocketbase/pb_schema.json`

#### 5. 验证部署

1. 访问前端URL
2. 测试添加医生和数据录入功能
3. 确认数据能正常保存和读取

### 🎉 部署完成！

你的绩效分配系统现在已经在线运行：
- **前端地址**：`https://your-frontend-service.onrender.com`
- **后端管理**：`https://your-backend-service.onrender.com/_/`

### 📝 重要提醒

1. **免费层限制**：
   - 服务在无活动时会休眠
   - 每月750小时运行时间
   - 1GB持久化存储

2. **首次访问**：
   - 服务可能需要30秒启动时间
   - 建议设置定时ping保持活跃

3. **数据安全**：
   - 定期备份PocketBase数据
   - 妥善保管管理员账户信息

### 🔧 故障排除

**常见问题：**
- 部署失败 → 检查GitHub仓库权限
- 数据库连接失败 → 验证POCKETBASE_URL设置
- 前端加载异常 → 检查构建日志

**获取帮助：**
- 查看Render部署日志
- 检查浏览器开发者工具
- 参考完整README.md文档