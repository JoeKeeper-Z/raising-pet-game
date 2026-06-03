# 自动求职投递系统 - 设计文档

## 1. 项目概述

### 1.1 目标
构建一个浏览器自动化工具，能够：
- 自动扫描 Boss直聘 和 智联招聘 的职位信息
- 根据用户简历和设置智能匹配符合条件的职位
- 自动或半自动投递简历
- 通过飞书/钉钉发送通知

### 1.2 核心功能
1. **简历解析**：从PDF/Word简历提取关键信息
2. **职位爬取**：定时抓取目标网站职位列表
3. **智能匹配**：AI分析职位与简历匹配度
4. **自动投递**：高匹配职位自动投递，中等匹配需要确认
5. **通知系统**：投递结果和待确认职位推送
6. **定时任务**：支持定时运行（如每日早9点）

---

## 2. 系统架构

### 2.1 技术栈
- **语言**：Python 3.10+
- **浏览器自动化**：Playwright
- **AI分析**：OpenAI API / Claude API
- **数据存储**：SQLite
- **通知**：飞书Webhook / 钉钉Webhook
- **定时任务**：APScheduler

### 2.2 模块架构

```
job_automation/
├── config/                 # 配置文件
│   ├── settings.yaml      # 主配置
│   └── user_profile.json  # 用户资料
├── core/                  # 核心模块
│   ├── __init__.py
│   ├── browser.py         # Playwright浏览器管理
│   ├── resume_parser.py   # 简历解析器
│   └── matcher.py         # 职位匹配引擎
├── spiders/               # 爬虫模块
│   ├── __init__.py
│   ├── base.py            # 爬虫基类
│   ├── boss.py            # Boss直聘爬虫
│   └── zhaopin.py         # 智联招聘爬虫
├── storage/               # 数据存储
│   ├── __init__.py
│   ├── database.py        # SQLite操作
│   └── models.py          # 数据模型
├── notifier/              # 通知模块
│   ├── __init__.py
│   └── webhook.py         # 飞书/钉钉通知
├── utils/                 # 工具函数
│   ├── __init__.py
│   ├── logger.py          # 日志配置
│   └── helpers.py         # 辅助函数
├── main.py                # 主入口
├── scheduler.py           # 定时任务
└── requirements.txt       # 依赖
```

---

## 3. 数据模型

### 3.1 用户配置 (UserProfile)
```python
{
    "personal_info": {
        "name": "姓名",
        "phone": "手机号",
        "email": "邮箱",
        "resume_path": "简历文件路径"
    },
    "job_preferences": {
        "keywords": ["前端开发", "React", "Vue"],
        "locations": ["北京", "上海"],
        "min_salary": 25000,
        "max_salary": 40000,
        "work_years": 5,
        "company_size": ["100-499人", "500-999人"],
        "industries": ["互联网", "电子商务"]
    },
    "match_thresholds": {
        "auto_apply": 80,      # 自动投递阈值
        "need_confirm": 50     # 需要确认阈值
    },
    "rate_limits": {
        "boss": {"per_hour": 7},      # Boss直聘每小时投递数
        "zhaopin": {"per_hour": 14}   # 智联每小时投递数
    },
    "notifications": {
        "feishu_webhook": "https://open.feishu.cn/...",
        "dingtalk_webhook": "https://oapi.dingtalk.com/..."
    }
}
```

### 3.2 职位信息 (Job)
```python
{
    "id": "唯一ID",
    "source": "boss/zhaopin",
    "title": "职位名称",
    "company": "公司名称",
    "salary": "25K-40K",
    "location": "北京·朝阳区",
    "experience": "3-5年",
    "education": "本科",
    "company_size": "100-499人",
    "industry": "互联网",
    "tags": ["React", "Vue", "TypeScript"],
    "description": "职位描述...",
    "url": "职位详情页URL",
    "posted_at": "发布时间",
    "match_score": 85.5,
    "status": "pending/confirmed/applied/rejected"
}
```

### 3.3 投递记录 (Application)
```python
{
    "id": "唯一ID",
    "job_id": "关联职位ID",
    "applied_at": "投递时间",
    "status": "success/failed/pending",
    "message": "投递结果信息"
}
```

---

## 4. 核心模块设计

### 4.1 简历解析器 (ResumeParser)

**职责**：从简历文件提取结构化信息

**输入**：PDF/Word简历文件路径
**输出**：结构化用户资料

**实现方式**：
1. 使用 `pdfplumber` / `python-docx` 提取文本
2. 使用 LLM 分析提取关键信息（技能、工作年限、期望薪资等）
3. 缓存解析结果，避免重复解析

```python
class ResumeParser:
    def parse(self, file_path: str) -> UserProfile:
        """解析简历文件"""
        text = self._extract_text(file_path)
        profile = self._llm_extract(text)
        return profile
```

### 4.2 职位匹配引擎 (JobMatcher)

**职责**：计算职位与用户的匹配度

**匹配算法**：
1. **硬性条件过滤**（一票否决）
   - 薪资低于最低要求 → 0分
   - 地点不匹配 → 0分
   - 工作年限要求过高 → 0分

2. **AI智能评分**（0-100分）
   - 使用 LLM 分析职位描述与简历的匹配度
   - 考虑：技能匹配、经验匹配、行业匹配等

```python
class JobMatcher:
    def match(self, job: Job, profile: UserProfile) -> MatchResult:
        """计算匹配度"""
        # 硬性条件检查
        if not self._check_hard_constraints(job, profile):
            return MatchResult(score=0, reason="不满足硬性条件")
        
        # AI智能评分
        score = self._llm_score(job, profile)
        return MatchResult(score=score)
```

### 4.3 浏览器管理 (BrowserManager)

**职责**：管理 Playwright 浏览器实例，处理登录状态

**功能**：
- 启动/关闭浏览器
- 保存/恢复登录状态（Cookie/Storage）
- 模拟真人操作（随机延迟、鼠标轨迹）
- 反检测处理（修改 `navigator.webdriver` 等）

```python
class BrowserManager:
    async def launch(self, headless: bool = True):
        """启动浏览器"""
        
    async def save_state(self, platform: str):
        """保存登录状态"""
        
    async def restore_state(self, platform: str):
        """恢复登录状态"""
```

### 4.4 爬虫基类与实现

**爬虫基类** (BaseSpider)
```python
class BaseSpider(ABC):
    @abstractmethod
    async def login(self):
        """登录处理"""
        
    @abstractmethod
    async def search_jobs(self, keywords: List[str]) -> List[Job]:
        """搜索职位"""
        
    @abstractmethod
    async def apply_job(self, job: Job) -> bool:
        """投递简历"""
        
    @abstractmethod
    def get_rate_limit(self) -> int:
        """获取每小时投递限制"""
```

**Boss直聘爬虫** (BossSpider)
- 处理扫码登录/短信登录
- 搜索职位列表
- 自动打招呼/投递
- 注意事项：Boss直聘需要频繁互动，可能需要模拟浏览行为

**智联招聘爬虫** (ZhaopinSpider)
- 处理账号密码登录
- 搜索职位列表
- 一键投递简历

### 4.5 通知模块 (Notifier)

**职责**：发送投递结果和待确认职位通知

**支持渠道**：
- 飞书Webhook
- 钉钉Webhook
- 企业微信Webhook

**通知内容模板**：
1. **自动投递成功通知**：
   ```
   🎉 自动投递成功
   职位：前端开发工程师
   公司：XX科技有限公司
   薪资：25K-35K
   匹配度：87分
   ```

2. **待确认职位通知**：
   ```
   📋 发现 5 个待确认职位（匹配度50-80分）
   
   1. 高级前端工程师 - XX科技 - 82分 - [确认投递]
   2. React开发工程师 - XX网络 - 76分 - [确认投递]
   ...
   ```

---

## 5. 工作流程

### 5.1 主流程

```
1. 加载用户配置和简历
   ↓
2. 检查并恢复登录状态（Boss直聘、智联）
   ↓
3. 并行爬取两个平台的职位列表
   ↓
4. 对每个职位进行匹配度计算
   ↓
5. 分类处理：
   ├─ ≥80分：自动投递
   ├─ 50-80分：加入待确认列表
   └─ <50分：过滤掉
   ↓
6. 发送通知（投递结果 + 待确认列表）
   ↓
7. 保存投递记录
```

### 5.2 定时任务流程

```
scheduler.py
  │
  ├─ 每天 09:00 运行主流程
  ├─ 每 30 分钟检查待确认职位的用户反馈
  └─ 每天 18:00 发送日报（今日投递统计）
```

---

## 6. 反爬虫策略

### 6.1 浏览器层面
- 使用 Playwright 的 `stealth` 模式
- 修改 `navigator.webdriver` 属性
- 随机 User-Agent
- 模拟真实鼠标轨迹和点击

### 6.2 行为层面
- 随机延迟（2-5秒）
- 限制每小时操作次数
- 模拟页面滚动、停留
- 避免规律性的操作间隔

### 6.3 频率控制
```python
RATE_LIMITS = {
    "boss": {
        "jobs_per_hour": 50,      # 每小时浏览职位数
        "apply_per_hour": 7,       # 每小时投递数
        "min_interval": 8          # 两次投递最小间隔（分钟）
    },
    "zhaopin": {
        "jobs_per_hour": 100,
        "apply_per_hour": 14,
        "min_interval": 4
    }
}
```

---

## 7. 配置说明

### 7.1 配置文件 (settings.yaml)
```yaml
# 浏览器设置
browser:
  headless: true
  slow_mo: 100
  viewport:
    width: 1920
    height: 1080

# AI设置
ai:
  provider: "openai"  # openai / anthropic
  model: "gpt-4"
  api_key: "${OPENAI_API_KEY}"

# 数据库
database:
  path: "data/jobs.db"

# 日志
logging:
  level: INFO
  file: "logs/app.log"
```

### 7.2 用户资料 (user_profile.json)
见 3.1 用户配置

---

## 8. 错误处理

### 8.1 异常情况
1. **登录失效**：检测到登录状态失效时，发送通知并暂停该平台的爬取
2. **验证码/滑块**：暂停并发送人工处理通知
3. **IP被封**：暂停运行，24小时后重试
4. **网络超时**：重试3次，间隔指数退避

### 8.2 日志记录
- 所有操作记录到日志文件
- 投递失败记录详细错误信息
- 保留页面截图（失败时）用于调试

---

## 9. 安全与隐私

1. **敏感信息**：API Key、密码等存储在环境变量
2. **Cookie安全**：登录状态文件设置权限限制
3. **数据加密**：用户资料加密存储
4. **合规性**：遵守目标网站的 robots.txt 和服务条款

---

## 10. 扩展性设计

### 10.1 新增招聘网站
1. 继承 `BaseSpider` 基类
2. 实现登录、搜索、投递方法
3. 在配置中添加该平台设置

### 10.2 新增通知渠道
1. 实现 `Notifier` 接口
2. 在配置中添加Webhook地址

### 10.3 自定义匹配算法
1. 继承 `JobMatcher` 基类
2. 重写 `match` 方法

---

## 11. 部署与运行

### 11.1 安装依赖
```bash
pip install -r requirements.txt
playwright install
```

### 11.2 初始化配置
```bash
python main.py --init
# 按提示输入个人信息和偏好
```

### 11.3 手动运行
```bash
python main.py --run
```

### 11.4 启动定时任务
```bash
python scheduler.py
```

### 11.5 Windows 计划任务设置
```powershell
# 每天早9点运行
schtasks /create /tn "JobAutoApply" /tr "python e:\letsgo\job_automation\main.py" /sc daily /st 09:00
```

---

## 12. 验收标准

- [ ] 能够成功登录 Boss直聘 和 智联招聘
- [ ] 能够从简历正确提取关键信息
- [ ] 能够按照条件筛选职位
- [ ] 匹配度评分准确（人工抽查10个职位，误差<10%）
- [ ] 高匹配职位能够自动投递
- [ ] 能够发送飞书/钉钉通知
- [ ] 定时任务能够正常触发
- [ ] 连续运行24小时无崩溃
- [ ] 反爬虫策略有效（账号无异常）

---

**文档版本**: v1.0  
**创建日期**: 2025-01-09  
**作者**: Claude Code
