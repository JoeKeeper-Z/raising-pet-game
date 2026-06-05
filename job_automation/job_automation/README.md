# 自动求职投递系统

基于 Python + Playwright 的浏览器自动化工具，自动在 Boss直聘和智联招聘上寻找匹配职位并投递简历。

## 功能特性

- 🤖 智能职位匹配（AI分析 + 硬性条件过滤）
- 🌐 支持 Boss直聘 + 智联招聘
- 📄 简历自动解析（PDF/Word）
- 🔔 飞书/钉钉通知
- ⏰ 定时任务调度
- 🛡️ 反爬虫策略

## 快速开始

### 1. 安装依赖

```bash
cd job_automation
pip install -r requirements.txt
playwright install chromium
```

### 2. 初始化配置

```bash
python init.py
```

按提示输入个人信息和API Key。

### 3. 运行

```bash
# 手动运行
python main.py

# 定时任务（每天9点运行）
python scheduler.py
```

## 配置说明

### 环境变量

在 `config/.env` 中设置：

```
OPENAI_API_KEY=your_openai_api_key
```

### 用户资料

在 `config/user_profile.json` 中设置：

- `keywords`: 求职关键词
- `locations`: 期望工作地点
- `min_salary`/`max_salary`: 薪资范围
- `notifications`: 飞书/钉钉Webhook

## 匹配逻辑

- ≥80分：自动投递
- 50-80分：推送通知待确认
- <50分：过滤掉

## 注意事项

1. 首次运行需要手动登录（扫码或输入密码）
2. 建议不要设置过高的投递频率，避免触发反爬虫
3. 定期检查日志文件 `logs/app.log`
