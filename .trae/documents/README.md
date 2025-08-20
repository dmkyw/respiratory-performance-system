# 科室内部绩效分配微信小程序系统

## 项目概述

本项目是一个专为医院科室设计的绩效分配管理系统，通过微信小程序提供便捷的移动端操作体验。系统支持基于多维度指标的自动绩效计算、人工微调和透明化审批流程，旨在解决医院科室绩效分配不透明、计算复杂、缺乏公平性监督等问题。

### 核心特性

* 🏥 **专业医疗场景**：针对医院科室绩效管理需求定制开发

* 🧮 **智能计算引擎**：基于权重的自动绩效计算，支持职称系数和小组平衡

* 👥 **多角色权限**：管理员、审核者、医生三级权限管理

* 📱 **移动端优先**：微信小程序原生开发，操作便捷

* 🔍 **透明可追溯**：完整的审批流程和操作日志记录

* ⚖️ **公平调节机制**：±5%范围内人工微调，确保分配公平性

## 1. 项目功能描述

### 1.1 核心功能模块

#### 数据管理模块

* **医生信息管理**：维护医生基本信息、职称、年资、小组分配

* **出勤记录管理**：录入月度出勤天数、请假记录、异常标记

* **绩效数据录入**：出院人数、床日数、基础工资、出勤表现评分

#### 绩效计算引擎

* **多维度权重计算**：

  * 基础月收入（工资）：50%

  * 出院人数：15%

  * 床日数：25%

  * 出勤表现得分：10%

* **职称系数调整**：

  * 住院医师：1.0

  * 主治医师：1.2

  * 副主任医师：1.5

* **小组人数动态平衡**：根据小组医生人数进行公平分摊

#### 审批管理模块

* **人工微调功能**：±5%范围内调整，记录调整依据

* **多级审批流程**：管理员提交 → 审核者审批 → 结果发布

* **审批日志追踪**：完整记录审批路径和变更历史

#### 权限控制模块

* **管理员权限**：查看编辑全部数据、设置绩效参数、审批最终结果

* **审核者权限**：确认数据准确性、提出调整建议、查看审批日志

* **医生权限**：查看个人绩效结果、提交申诉、查看个人历史记录

#### 查询统计模块

* **个人绩效查询**：个人得分详情、历史记录、趋势分析

* **科室统计报表**：整体统计、月度对比、绩效分布图表

* **数据可视化**：图表展示绩效分布和趋势变化

### 1.2 技术架构

* **前端**：微信小程序原生开发 + WeUI组件库

* **后端**：Node.js + Express.js + TypeScript

* **数据库**：Supabase (PostgreSQL)

* **缓存**：Redis

* **认证**：JWT + 微信小程序登录

* **部署**：Docker + Nginx + PM2

## 2. 项目部署方式

### 2.1 环境要求

#### 服务器环境

* **操作系统**：Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+

* **CPU**：2核心以上

* **内存**：4GB以上

* **存储**：50GB以上可用空间

* **网络**：公网IP，支持HTTPS

#### 软件依赖

* **Node.js**：18.0+

* **Docker**：20.0+

* **Docker Compose**：2.0+

* **Nginx**：1.18+

* **Redis**：6.0+

### 2.2 部署步骤

#### 步骤1：服务器准备

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 安装Nginx
sudo apt install nginx -y
```

#### 步骤2：项目代码部署

```bash
# 克隆项目代码
git clone <项目仓库地址>
cd performance-management-system

# 复制环境配置文件
cp .env.example .env

# 编辑环境配置
nano .env
```

#### 步骤3：环境配置文件

创建 `.env` 文件：

```env
# 应用配置
NODE_ENV=production
PORT=3000
APP_SECRET=your-app-secret-key

# 数据库配置
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# 微信小程序配置
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret

# JWT配置
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
```

#### 步骤4：Docker部署

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - redis
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs

  redis:
    image: redis:6.2-alpine
    ports:
      - "6379:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD}
    restart: unless-stopped
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  redis_data:
```

#### 步骤5：Nginx配置

创建 `nginx.conf` 文件：

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

#### 步骤6：启动服务

```bash
# 构建并启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app
```

### 2.3 数据库初始化

#### Supabase配置

1. 登录 [Supabase](https://supabase.com) 创建新项目
2. 获取项目URL和API密钥
3. 在SQL编辑器中执行数据库初始化脚本
4. 配置行级安全策略（RLS）

```sql
-- 执行数据库初始化脚本
-- 参考技术架构文档中的DDL语句
```

### 2.4 微信小程序配置

1. 登录微信公众平台，创建小程序
2. 获取AppID和AppSecret
3. 配置服务器域名（request合法域名）
4. 上传小程序代码并提交审核

## 3. 项目执行步骤

### 3.1 开发环境搭建

#### 本地开发环境

```bash
# 克隆项目
git clone <项目仓库地址>
cd performance-management-system

# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install

# 复制环境配置
cp .env.example .env.local
```

#### 启动开发服务

```bash
# 启动后端服务
cd backend
npm run dev

# 启动Redis（另开终端）
redis-server

# 启动微信开发者工具
# 导入frontend目录作为小程序项目
```

### 3.2 功能测试流程

#### 测试数据准备

```bash
# 执行测试数据初始化脚本
cd backend
npm run seed:test
```

#### 功能测试步骤

1. **用户登录测试**

   * 打开微信开发者工具

   * 测试微信授权登录

   * 验证角色权限分配

2. **数据录入测试**

   * 测试医生信息添加/编辑

   * 测试出勤记录录入

   * 测试绩效数据录入

3. **绩效计算测试**

   * 录入完整测试数据

   * 执行绩效计算

   * 验证计算结果准确性

4. **审批流程测试**

   * 测试人工调整功能

   * 测试审批提交和审核

   * 验证审批日志记录

5. **查询统计测试**

   * 测试个人绩效查询

   * 测试统计报表生成

   * 验证数据可视化

### 3.3 部署上线流程

#### 生产环境部署

1. **服务器准备**

   ```bash
   # 配置生产服务器
   # 安装必要软件
   # 配置防火墙和安全策略
   ```

2. **代码部署**

   ```bash
   # 构建生产版本
   npm run build

   # 部署到服务器
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **数据库迁移**

   ```bash
   # 执行生产数据库初始化
   npm run migrate:prod
   ```

4. **SSL证书配置**

   ```bash
   # 申请SSL证书
   # 配置HTTPS
   ```

#### 小程序发布

1. **代码上传**

   * 使用微信开发者工具上传代码

   * 填写版本号和更新说明

2. **提交审核**

   * 完善小程序信息

   * 提交微信审核

   * 等待审核通过

3. **发布上线**

   * 审核通过后发布

   * 通知用户更新

### 3.4 运维监控

#### 系统监控

```bash
# 查看系统状态
docker-compose ps

# 查看系统资源
top
df -h

# 查看应用日志
docker-compose logs -f app
```

#### 数据备份

```bash
# 数据库备份脚本
#!/bin/bash
BACKUP_DIR="/backup/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# 备份Supabase数据
# 使用Supabase提供的备份工具

# 备份Redis数据
docker exec redis redis-cli BGSAVE
cp /var/lib/redis/dump.rdb $BACKUP_DIR/
```

#### 性能监控

* 使用PM2监控Node.js进程

* 配置Nginx访问日志分析

* 设置系统资源告警

### 3.5 用户培训

#### 管理员培训

1. **系统管理**

   * 用户权限管理

   * 绩效参数配置

   * 数据备份恢复

2. **业务操作**

   * 数据录入流程

   * 绩效计算操作

   * 审批管理流程

#### 用户培训

1. **基础操作**

   * 小程序登录使用

   * 个人信息查看

   * 绩效结果查询

2. **申诉流程**

   * 异议提交方式

   * 申诉处理流程

## 4. 常见问题解决

### 4.1 部署问题

**Q: Docker容器启动失败**

```bash
# 检查Docker服务状态
sudo systemctl status docker

# 查看容器日志
docker-compose logs app

# 重新构建镜像
docker-compose build --no-cache
```

**Q: 数据库连接失败**

* 检查Supabase配置是否正确

* 验证网络连接

* 确认API密钥有效性

### 4.2 功能问题

**Q: 绩效计算结果不正确**

* 检查基础数据完整性

* 验证计算公式配置

* 查看计算日志

**Q: 微信登录失败**

* 检查AppID和AppSecret配置

* 验证服务器域名配置

* 确认小程序审核状态

### 4.3 性能问题

**Q: 系统响应慢**

* 检查数据库查询性能

* 优化Redis缓存配置

* 增加服务器资源

## 5. 技术支持

### 5.1 联系方式

* **技术支持邮箱**：<support@example.com>

* **项目文档**：查看 `.trae/documents/` 目录下的详细文档

* **问题反馈**：通过GitHub Issues提交

### 5.2 更新日志

* **v1.0.0** (2024-01-01)

  * 初始版本发布

  * 基础功能实现

  * 微信小程序上线

### 5.3 后续规划

* **v1.1.0** - 增加教学评分模块

* **v1.2.0** - 集成AI评估

