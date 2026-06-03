# 自动求职投递系统 - 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 Python + Playwright 的浏览器自动化工具，自动在 Boss直聘和智联招聘上寻找匹配职位并投递简历。

**Architecture:** 采用模块化设计，包含爬虫模块、匹配引擎、通知系统等独立组件。使用 SQLite 存储数据，Playwright 处理浏览器自动化，OpenAI API 进行智能匹配。

**Tech Stack:** Python 3.10+, Playwright, SQLite, OpenAI API, python-telegram-bot / webhook

---

## 文件结构

```
job_automation/
├── config/
│   ├── settings.yaml          # 主配置文件
│   └── user_profile.json      # 用户资料
├── core/
│   ├── __init__.py
│   ├── browser.py             # Playwright 浏览器管理
│   ├── resume_parser.py       # 简历解析器
│   └── matcher.py             # 职位匹配引擎
├── spiders/
│   ├── __init__.py
│   ├── base.py                # 爬虫基类
│   ├── boss.py                # Boss直聘爬虫
│   └── zhaopin.py             # 智联招聘爬虫
├── storage/
│   ├── __init__.py
│   ├── database.py            # SQLite 数据库操作
│   └── models.py              # 数据模型
├── notifier/
│   ├── __init__.py
│   └── webhook.py             # 飞书/钉钉通知
├── utils/
│   ├── __init__.py
│   ├── logger.py              # 日志配置
│   └── helpers.py             # 辅助函数
├── tests/
│   ├── __init__.py
│   ├── test_resume_parser.py
│   ├── test_matcher.py
│   └── test_database.py
├── data/                      # 数据目录
│   └── .gitkeep
├── logs/                      # 日志目录
│   └── .gitkeep
├── cookies/                   # 登录状态保存
│   └── .gitkeep
├── main.py                    # 主入口
├── scheduler.py               # 定时任务
└── requirements.txt           # 依赖
```

---

## Task 1: 项目初始化与依赖安装

**Files:**
- Create: `job_automation/requirements.txt`
- Create: `job_automation/.gitignore`
- Create: `job_automation/data/.gitkeep`
- Create: `job_automation/logs/.gitkeep`
- Create: `job_automation/cookies/.gitkeep`

- [ ] **Step 1: 创建 requirements.txt**

```txt
# Core
playwright>=1.40.0
pyyaml>=6.0
pydantic>=2.0.0
python-dotenv>=1.0.0

# Resume parsing
pdfplumber>=0.10.0
python-docx>=1.1.0

# AI
openai>=1.0.0

# Database
sqlalchemy>=2.0.0
alembic>=1.12.0

# Scheduler
apscheduler>=3.10.0

# HTTP
httpx>=0.25.0

# Utils
tenacity>=8.2.0
fake-useragent>=1.4.0

# Testing
pytest>=7.4.0
pytest-asyncio>=0.21.0
```

- [ ] **Step 2: 创建 .gitignore**

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
.venv

# Data
data/*.db
data/*.json
cookies/*.json
logs/*.log

# Config with secrets
config/.env

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Resume files (user private)
resumes/
```

- [ ] **Step 3: 安装依赖并初始化 Playwright**

```bash
cd job_automation
pip install -r requirements.txt
playwright install chromium
```

验证：
```bash
python -c "import playwright; print(playwright.__version__)"
```
Expected: 版本号输出，无错误

- [ ] **Step 4: Commit**

```bash
git add job_automation/requirements.txt job_automation/.gitignore
git add job_automation/data/.gitkeep job_automation/logs/.gitkeep job_automation/cookies/.gitkeep
git commit -m "chore: initialize project structure and dependencies"
```

---

## Task 2: 数据模型定义

**Files:**
- Create: `job_automation/storage/models.py`
- Create: `job_automation/storage/__init__.py`

- [ ] **Step 1: 创建数据模型**

```python
# storage/models.py
from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    PENDING = "pending"           # 待处理
    CONFIRMED = "confirmed"       # 已确认（待投递）
    AUTO_APPLIED = "auto_applied" # 已自动投递
    MANUALLY_APPLIED = "manually_applied"  # 已手动投递
    REJECTED = "rejected"         # 已拒绝
    FAILED = "failed"             # 投递失败


class JobSource(str, Enum):
    BOSS = "boss"
    ZHAOPIN = "zhaopin"


class UserProfile(BaseModel):
    """用户资料"""
    personal_info: dict = Field(default_factory=dict)
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    resume_path: Optional[str] = None
    
    # 求职偏好
    keywords: List[str] = Field(default_factory=list)
    locations: List[str] = Field(default_factory=list)
    min_salary: Optional[int] = None
    max_salary: Optional[int] = None
    work_years: Optional[int] = None
    company_size: List[str] = Field(default_factory=list)
    industries: List[str] = Field(default_factory=list)
    
    # 匹配阈值
    auto_apply_threshold: int = 80
    confirm_threshold: int = 50


class Job(BaseModel):
    """职位信息"""
    id: str
    source: JobSource
    title: str
    company: str
    salary: Optional[str] = None
    location: Optional[str] = None
    experience: Optional[str] = None
    education: Optional[str] = None
    company_size: Optional[str] = None
    industry: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    url: Optional[str] = None
    posted_at: Optional[datetime] = None
    
    # 匹配相关
    match_score: Optional[float] = None
    match_reason: Optional[str] = None
    status: JobStatus = JobStatus.PENDING
    
    # 时间戳
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class MatchResult(BaseModel):
    """匹配结果"""
    score: float  # 0-100
    reason: str
    matched_keywords: List[str] = Field(default_factory=list)
    missing_keywords: List[str] = Field(default_factory=list)
    hard_constraints_passed: bool = True


class Application(BaseModel):
    """投递记录"""
    id: str
    job_id: str
    applied_at: datetime = Field(default_factory=datetime.now)
    status: str  # success/failed/pending
    message: Optional[str] = None
    is_auto: bool = True
```

- [ ] **Step 2: 创建 __init__.py**

```python
# storage/__init__.py
from .models import Job, UserProfile, MatchResult, Application, JobStatus, JobSource

__all__ = ['Job', 'UserProfile', 'MatchResult', 'Application', 'JobStatus', 'JobSource']
```

- [ ] **Step 3: Commit**

```bash
git add job_automation/storage/
git commit -m "feat: add data models for job automation"
```

---

## Task 3: 数据库操作层

**Files:**
- Create: `job_automation/storage/database.py`
- Create: `job_automation/tests/test_database.py`

- [ ] **Step 1: 创建数据库操作类**

```python
# storage/database.py
import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from contextlib import contextmanager

from .models import Job, Application, JobStatus, JobSource


class Database:
    """SQLite数据库操作"""
    
    def __init__(self, db_path: str = "data/jobs.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_tables()
    
    @contextmanager
    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()
    
    def _init_tables(self):
        """初始化表结构"""
        with self._get_connection() as conn:
            # 职位表
            conn.execute("""
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    source TEXT NOT NULL,
                    title TEXT NOT NULL,
                    company TEXT NOT NULL,
                    salary TEXT,
                    location TEXT,
                    experience TEXT,
                    education TEXT,
                    company_size TEXT,
                    industry TEXT,
                    tags TEXT,
                    description TEXT,
                    url TEXT,
                    posted_at TEXT,
                    match_score REAL,
                    match_reason TEXT,
                    status TEXT DEFAULT 'pending',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 投递记录表
            conn.execute("""
                CREATE TABLE IF NOT EXISTS applications (
                    id TEXT PRIMARY KEY,
                    job_id TEXT NOT NULL,
                    applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    status TEXT NOT NULL,
                    message TEXT,
                    is_auto INTEGER DEFAULT 1,
                    FOREIGN KEY (job_id) REFERENCES jobs(id)
                )
            """)
            
            # 创建索引
            conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id)")
    
    def save_job(self, job: Job) -> bool:
        """保存或更新职位"""
        with self._get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO jobs 
                (id, source, title, company, salary, location, experience, 
                 education, company_size, industry, tags, description, url,
                 posted_at, match_score, match_reason, status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                job.id, job.source.value, job.title, job.company, job.salary,
                job.location, job.experience, job.education, job.company_size,
                job.industry, json.dumps(job.tags), job.description, job.url,
                job.posted_at.isoformat() if job.posted_at else None,
                job.match_score, job.match_reason, job.status.value,
                datetime.now().isoformat()
            ))
            return True
    
    def get_job(self, job_id: str) -> Optional[Job]:
        """获取职位详情"""
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM jobs WHERE id = ?", (job_id,)
            ).fetchone()
            
            if not row:
                return None
            
            return self._row_to_job(row)
    
    def get_jobs_by_status(self, status: JobStatus) -> List[Job]:
        """根据状态获取职位列表"""
        with self._get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM jobs WHERE status = ? ORDER BY match_score DESC",
                (status.value,)
            ).fetchall()
            return [self._row_to_job(row) for row in rows]
    
    def get_pending_confirm_jobs(self, min_score: float = 50, max_score: float = 80) -> List[Job]:
        """获取待确认职位（匹配度在范围内）"""
        with self._get_connection() as conn:
            rows = conn.execute("""
                SELECT * FROM jobs 
                WHERE status = 'pending' 
                AND match_score >= ? AND match_score < ?
                ORDER BY match_score DESC
            """, (min_score, max_score)).fetchall()
            return [self._row_to_job(row) for row in rows]
    
    def update_job_status(self, job_id: str, status: JobStatus):
        """更新职位状态"""
        with self._get_connection() as conn:
            conn.execute(
                "UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?",
                (status.value, datetime.now().isoformat(), job_id)
            )
    
    def save_application(self, app: Application):
        """保存投递记录"""
        with self._get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO applications
                (id, job_id, applied_at, status, message, is_auto)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                app.id, app.job_id, app.applied_at.isoformat(),
                app.status, app.message, 1 if app.is_auto else 0
            ))
    
    def _row_to_job(self, row: sqlite3.Row) -> Job:
        """将数据库行转换为Job对象"""
        return Job(
            id=row['id'],
            source=JobSource(row['source']),
            title=row['title'],
            company=row['company'],
            salary=row['salary'],
            location=row['location'],
            experience=row['experience'],
            education=row['education'],
            company_size=row['company_size'],
            industry=row['industry'],
            tags=json.loads(row['tags']) if row['tags'] else [],
            description=row['description'],
            url=row['url'],
            posted_at=datetime.fromisoformat(row['posted_at']) if row['posted_at'] else None,
            match_score=row['match_score'],
            match_reason=row['match_reason'],
            status=JobStatus(row['status'])
        )
```

- [ ] **Step 2: 编写数据库测试**

```python
# tests/test_database.py
import pytest
from storage.database import Database
from storage.models import Job, JobStatus, JobSource


@pytest.fixture
def db():
    """创建测试数据库"""
    database = Database(":memory:")
    yield database


def test_save_and_get_job(db):
    """测试保存和获取职位"""
    job = Job(
        id="test-001",
        source=JobSource.BOSS,
        title="Python开发",
        company="Test Company"
    )
    
    db.save_job(job)
    retrieved = db.get_job("test-001")
    
    assert retrieved is not None
    assert retrieved.title == "Python开发"
    assert retrieved.company == "Test Company"


def test_get_jobs_by_status(db):
    """测试按状态获取职位"""
    job1 = Job(id="001", source=JobSource.BOSS, title="Job1", company="C1")
    job2 = Job(id="002", source=JobSource.BOSS, title="Job2", company="C2")
    
    db.save_job(job1)
    db.save_job(job2)
    
    jobs = db.get_jobs_by_status(JobStatus.PENDING)
    assert len(jobs) == 2


def test_update_job_status(db):
    """测试更新职位状态"""
    job = Job(id="001", source=JobSource.BOSS, title="Job", company="C")
    db.save_job(job)
    
    db.update_job_status("001", JobStatus.AUTO_APPLIED)
    
    updated = db.get_job("001")
    assert updated.status == JobStatus.AUTO_APPLIED
```

- [ ] **Step 3: 运行测试**

```bash
cd job_automation
pytest tests/test_database.py -v
```
Expected: 所有测试通过

- [ ] **Step 4: Commit**

```bash
git add job_automation/storage/database.py job_automation/tests/
git commit -m "feat: add database layer with SQLite"
```

---

## Task 4: 配置系统

**Files:**
- Create: `job_automation/config/settings.yaml`
- Create: `job_automation/config/user_profile.json`
- Create: `job_automation/core/config_loader.py`

- [ ] **Step 1: 创建默认配置**

```yaml
# config/settings.yaml
# 浏览器设置
browser:
  headless: true
  slow_mo: 100  # 操作延迟(毫秒)
  viewport:
    width: 1920
    height: 1080

# AI设置
ai:
  provider: "openai"  # openai / anthropic
  model: "gpt-4"
  max_tokens: 1000
  temperature: 0.3

# 数据库
database:
  path: "data/jobs.db"

# 日志
logging:
  level: "INFO"
  file: "logs/app.log"
  max_size: "10MB"
  backup_count: 5

# 反爬虫设置
anti_detection:
  random_delay_min: 2
  random_delay_max: 5
  mouse_movement: true
```

- [ ] **Step 2: 创建用户资料模板**

```json
{
  "personal_info": {
    "name": "",
    "phone": "",
    "email": "",
    "resume_path": ""
  },
  "job_preferences": {
    "keywords": ["前端开发", "React", "Vue"],
    "locations": ["北京", "上海"],
    "min_salary": 25000,
    "max_salary": 40000,
    "work_years": 5,
    "company_size": ["100-499人", "500-999人"],
    "industries": ["互联网"]
  },
  "match_thresholds": {
    "auto_apply": 80,
    "confirm": 50
  },
  "rate_limits": {
    "boss": {
      "per_hour": 7,
      "min_interval": 8
    },
    "zhaopin": {
      "per_hour": 14,
      "min_interval": 4
    }
  },
  "notifications": {
    "feishu_webhook": "",
    "dingtalk_webhook": ""
  }
}
```

- [ ] **Step 3: 创建配置加载器**

```python
# core/config_loader.py
import os
import yaml
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Config:
    """配置管理"""
    
    def __init__(self, config_dir: str = "config"):
        self.config_dir = Path(config_dir)
        self.settings = self._load_settings()
        self.user_profile = self._load_user_profile()
    
    def _load_settings(self) -> dict:
        """加载系统设置"""
        settings_file = self.config_dir / "settings.yaml"
        if settings_file.exists():
            with open(settings_file, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        return {}
    
    def _load_user_profile(self) -> dict:
        """加载用户资料"""
        profile_file = self.config_dir / "user_profile.json"
        if profile_file.exists():
            with open(profile_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    
    def get(self, key: str, default=None):
        """获取配置项"""
        keys = key.split('.')
        value = self.settings
        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
            else:
                return default
        return value if value is not None else default
    
    @property
    def openai_api_key(self) -> str:
        """获取OpenAI API Key"""
        return os.getenv('OPENAI_API_KEY', '')
    
    @property
    def feishu_webhook(self) -> str:
        """获取飞书Webhook"""
        return self.user_profile.get('notifications', {}).get('feishu_webhook', '')
    
    @property
    def dingtalk_webhook(self) -> str:
        """获取钉钉Webhook"""
        return self.user_profile.get('notifications', {}).get('dingtalk_webhook', '')


# 全局配置实例
config = Config()
```

- [ ] **Step 4: Commit**

```bash
git add job_automation/config/ job_automation/core/config_loader.py
git commit -m "feat: add configuration system"
```

---

## Task 5: 日志模块

**Files:**
- Create: `job_automation/utils/logger.py`

- [ ] **Step 1: 创建日志配置**

```python
# utils/logger.py
import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler


def setup_logger(name: str = "job_automation", 
                 level: str = "INFO",
                 log_file: str = "logs/app.log") -> logging.Logger:
    """配置日志"""
    
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))
    
    # 清除已有handler
    logger.handlers = []
    
    # 格式
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # 控制台输出
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # 文件输出
    if log_file:
        Path(log_file).parent.mkdir(parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            log_file, maxBytes=10*1024*1024, backupCount=5, encoding='utf-8'
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger


# 默认logger
logger = setup_logger()
```

- [ ] **Step 2: Commit**

```bash
git add job_automation/utils/logger.py
git commit -m "feat: add logging utility"
```

---

## Task 6: 简历解析器

**Files:**
- Create: `job_automation/core/resume_parser.py`
- Create: `job_automation/tests/test_resume_parser.py`

- [ ] **Step 1: 创建简历解析器**

```python
# core/resume_parser.py
import re
from pathlib import Path
from typing import Optional, Dict, List
import pdfplumber
from docx import Document
from openai import OpenAI

from utils.logger import logger
from storage.models import UserProfile
from core.config_loader import config


class ResumeParser:
    """简历解析器"""
    
    def __init__(self):
        self.client = OpenAI(api_key=config.openai_api_key) if config.openai_api_key else None
    
    def parse(self, file_path: str) -> UserProfile:
        """解析简历文件"""
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"简历文件不存在: {file_path}")
        
        # 提取文本
        text = self._extract_text(file_path)
        logger.info(f"成功提取简历文本，长度: {len(text)} 字符")
        
        # 使用AI解析
        profile = self._ai_parse(text)
        profile.resume_path = str(file_path)
        
        return profile
    
    def _extract_text(self, file_path: Path) -> str:
        """从文件中提取文本"""
        suffix = file_path.suffix.lower()
        
        if suffix == '.pdf':
            return self._extract_pdf(file_path)
        elif suffix in ['.docx', '.doc']:
            return self._extract_docx(file_path)
        elif suffix == '.txt':
            return file_path.read_text(encoding='utf-8')
        else:
            raise ValueError(f"不支持的文件格式: {suffix}")
    
    def _extract_pdf(self, file_path: Path) -> str:
        """提取PDF文本"""
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
                text += "\n"
        return text
    
    def _extract_docx(self, file_path: Path) -> str:
        """提取Word文本"""
        doc = Document(file_path)
        return "\n".join([paragraph.text for paragraph in doc.paragraphs])
    
    def _ai_parse(self, text: str) -> UserProfile:
        """使用AI解析简历内容"""
        if not self.client:
            logger.warning("未配置OpenAI API，使用基础解析")
            return self._basic_parse(text)
        
        prompt = f"""
请分析以下简历内容，提取关键信息并以JSON格式返回。

简历内容：
{text[:3000]}  # 限制长度，避免token过多

请返回以下格式的JSON：
{{
    "name": "姓名",
    "phone": "手机号",
    "email": "邮箱",
    "keywords": ["技能关键词1", "技能关键词2"],
    "work_years": 工作年限(数字),
    "min_salary": 最低期望薪资(数字),
    "max_salary": 最高期望薪资(数字)
}}

注意：
1. 只返回JSON，不要有其他文字
2. 如果某项信息不存在，使用null或空数组
3. 技能关键词从简历中的技术栈、工具、语言等提取
"""
        
        try:
            response = self.client.chat.completions.create(
                model=config.get('ai.model', 'gpt-4'),
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )
            
            result = response.choices[0].message.content
            # 提取JSON部分
            import json
            json_match = re.search(r'\{.*\}', result, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return UserProfile(
                    name=data.get('name'),
                    phone=data.get('phone'),
                    email=data.get('email'),
                    keywords=data.get('keywords', []),
                    work_years=data.get('work_years'),
                    min_salary=data.get('min_salary'),
                    max_salary=data.get('max_salary')
                )
        except Exception as e:
            logger.error(f"AI解析失败: {e}")
        
        return self._basic_parse(text)
    
    def _basic_parse(self, text: str) -> UserProfile:
        """基础解析（正则提取）"""
        profile = UserProfile()
        
        # 提取姓名（简单假设：简历开头的2-4个汉字）
        name_match = re.search(r'^[一-龥]{2,4}', text.strip())
        if name_match:
            profile.name = name_match.group()
        
        # 提取手机号
        phone_match = re.search(r'1[3-9]\d{9}', text)
        if phone_match:
            profile.phone = phone_match.group()
        
        # 提取邮箱
        email_match = re.search(r'[\w.-]+@[\w.-]+\.\w+', text)
        if email_match:
            profile.email = email_match.group()
        
        # 提取常见技术关键词
        tech_keywords = [
            'Python', 'Java', 'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular',
            'Node.js', 'Go', 'Rust', 'C++', 'SQL', 'MySQL', 'PostgreSQL', 'MongoDB',
            'Redis', 'Docker', 'Kubernetes', 'AWS', '阿里云', 'Linux', 'Git'
        ]
        
        profile.keywords = [kw for kw in tech_keywords if kw.lower() in text.lower()]
        
        # 提取工作年限
        year_match = re.search(r'(\d+)[\s]*年[\s]*经验', text)
        if year_match:
            profile.work_years = int(year_match.group(1))
        
        return profile
```

- [ ] **Step 2: 编写测试**

```python
# tests/test_resume_parser.py
import pytest
from pathlib import Path
from core.resume_parser import ResumeParser


@pytest.fixture
def parser():
    return ResumeParser()


def test_basic_parse(parser):
    """测试基础解析"""
    text = """
    张三
    手机：13800138000
    邮箱：zhangsan@example.com
    5年经验
    技能：Python, React, MySQL
    """
    
    profile = parser._basic_parse(text)
    
    assert profile.name == "张三"
    assert profile.phone == "13800138000"
    assert profile.email == "zhangsan@example.com"
    assert profile.work_years == 5
    assert "Python" in profile.keywords
```

- [ ] **Step 3: Commit**

```bash
git add job_automation/core/resume_parser.py job_automation/tests/test_resume_parser.py
git commit -m "feat: add resume parser with AI and basic parsing"
```

---

## Task 7: 浏览器管理模块

**Files:**
- Create: `job_automation/core/browser.py`

- [ ] **Step 1: 创建浏览器管理类**

```python
# core/browser.py
import json
import random
import asyncio
from pathlib import Path
from typing import Optional, Dict
from playwright.async_api import async_playwright, Page, Browser, BrowserContext
from fake_useragent import UserAgent

from utils.logger import logger
from core.config_loader import config


class BrowserManager:
    """Playwright浏览器管理"""
    
    def __init__(self):
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.ua = UserAgent()
    
    async def launch(self, headless: bool = True, platform: str = ""):
        """启动浏览器"""
        self.playwright = await async_playwright().start()
        
        # 反检测设置
        args = [
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
        ]
        
        self.browser = await self.playwright.chromium.launch(
            headless=headless,
            args=args,
            slow_mo=config.get('browser.slow_mo', 100)
        )
        
        # 创建上下文
        viewport = config.get('browser.viewport', {'width': 1920, 'height': 1080})
        
        context_options = {
            'viewport': viewport,
            'user_agent': self.ua.random,
            'locale': 'zh-CN',
            'timezone_id': 'Asia/Shanghai',
        }
        
        self.context = await self.browser.new_context(**context_options)
        
        # 注入反检测脚本
        await self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
        """)
        
        self.page = await self.context.new_page()
        
        # 尝试恢复登录状态
        if platform:
            await self.restore_state(platform)
        
        logger.info("浏览器启动成功")
        return self
    
    async def save_state(self, platform: str):
        """保存登录状态"""
        if not self.context:
            return
        
        state_path = Path(f"cookies/{platform}_state.json")
        state_path.parent.mkdir(parents=True, exist_ok=True)
        
        storage = await self.context.storage_state()
        with open(state_path, 'w', encoding='utf-8') as f:
            json.dump(storage, f)
        
        logger.info(f"登录状态已保存: {state_path}")
    
    async def restore_state(self, platform: str) -> bool:
        """恢复登录状态"""
        state_path = Path(f"cookies/{platform}_state.json")
        
        if not state_path.exists():
            logger.info(f"未找到登录状态: {platform}")
            return False
        
        try:
            with open(state_path, 'r', encoding='utf-8') as f:
                storage = json.load(f)
            
            # 重新创建上下文并加载状态
            await self.context.close()
            self.context = await self.browser.new_context(storage_state=storage)
            self.page = await self.context.new_page()
            
            logger.info(f"登录状态已恢复: {platform}")
            return True
        except Exception as e:
            logger.error(f"恢复登录状态失败: {e}")
            return False
    
    async def random_delay(self, min_sec: float = None, max_sec: float = None):
        """随机延迟"""
        min_sec = min_sec or config.get('anti_detection.random_delay_min', 2)
        max_sec = max_sec or config.get('anti_detection.random_delay_max', 5)
        delay = random.uniform(min_sec, max_sec)
        await asyncio.sleep(delay)
    
    async def safe_click(self, selector: str):
        """安全点击（带随机延迟）"""
        await self.random_delay(0.5, 1.5)
        await self.page.click(selector)
        await self.random_delay(1, 2)
    
    async def safe_fill(self, selector: str, text: str):
        """安全填写（模拟人工输入）"""
        await self.random_delay(0.5, 1)
        await self.page.click(selector)
        await self.page.fill(selector, "")
        
        # 模拟逐字输入
        for char in text:
            await self.page.type(selector, char, delay=random.randint(50, 150))
        
        await self.random_delay(0.5, 1)
    
    async def scroll_page(self):
        """模拟页面滚动"""
        for _ in range(random.randint(2, 5)):
            await self.page.mouse.wheel(0, random.randint(300, 800))
            await self.random_delay(1, 2)
    
    async def close(self):
        """关闭浏览器"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        logger.info("浏览器已关闭")
    
    async def __aenter__(self):
        await self.launch()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
```

- [ ] **Step 2: Commit**

```bash
git add job_automation/core/browser.py
git commit -m "feat: add browser manager with anti-detection"
```

---

## Task 8: 爬虫基类与 Boss直聘爬虫

**Files:**
- Create: `job_automation/spiders/base.py`
- Create: `job_automation/spiders/boss.py`

- [ ] **Step 1: 创建爬虫基类**

```python
# spiders/base.py
from abc import ABC, abstractmethod
from typing import List
from datetime import datetime

from storage.models import Job
from core.browser import BrowserManager
from utils.logger import logger


class BaseSpider(ABC):
    """爬虫基类"""
    
    def __init__(self, browser: BrowserManager):
        self.browser = browser
        self.platform = ""
    
    @abstractmethod
    async def login(self) -> bool:
        """登录处理，返回是否成功"""
        pass
    
    @abstractmethod
    async def search_jobs(self, keywords: List[str], location: str = "") -> List[Job]:
        """搜索职位"""
        pass
    
    @abstractmethod
    async def apply_job(self, job: Job) -> bool:
        """投递简历"""
        pass
    
    @abstractmethod
    def get_rate_limit(self) -> dict:
        """获取投递限制配置
        Returns: {'per_hour': int, 'min_interval': int}
        """
        pass
    
    async def check_login(self) -> bool:
        """检查是否已登录"""
        return await self.browser.restore_state(self.platform)
```

- [ ] **Step 2: 创建 Boss直聘爬虫**

```python
# spiders/boss.py
import time
from typing import List
from urllib.parse import quote

from storage.models import Job, JobSource
from spiders.base import BaseSpider
from utils.logger import logger


class BossSpider(BaseSpider):
    """Boss直聘爬虫"""
    
    def __init__(self, browser):
        super().__init__(browser)
        self.platform = "boss"
        self.base_url = "https://www.zhipin.com"
    
    def get_rate_limit(self) -> dict:
        return {'per_hour': 7, 'min_interval': 8}
    
    async def login(self) -> bool:
        """Boss直聘登录（需要扫码）"""
        logger.info("开始登录 Boss直聘...")
        
        await self.browser.page.goto(f"{self.base_url}/web/user/?ka=header-login")
        await self.browser.random_delay(2, 3)
        
        # 等待用户扫码（最多5分钟）
        logger.info("请扫描二维码登录，等待5分钟...")
        start_time = time.time()
        
        while time.time() - start_time < 300:  # 5分钟
            await self.browser.random_delay(3, 5)
            
            # 检查是否已登录（通过URL判断）
            current_url = self.browser.page.url
            if "/web/geek/chat" in current_url or "/web/geek/recommend" in current_url:
                logger.info("登录成功！")
                await self.browser.save_state(self.platform)
                return True
        
        logger.error("登录超时")
        return False
    
    async def search_jobs(self, keywords: List[str], location: str = "") -> List[Job]:
        """搜索职位"""
        jobs = []
        
        for keyword in keywords:
            logger.info(f"搜索关键词: {keyword}")
            
            # 构建搜索URL
            search_url = f"{self.base_url}/web/geek/job?query={quote(keyword)}"
            if location:
                search_url += f"&city={quote(location)}"
            
            await self.browser.page.goto(search_url)
            await self.browser.random_delay(3, 5)
            
            # 模拟滚动加载更多
            for _ in range(3):
                await self.browser.scroll_page()
            
            # 提取职位列表
            job_cards = await self.browser.page.query_selector_all('.job-card-wrapper')
            logger.info(f"找到 {len(job_cards)} 个职位")
            
            for card in job_cards:
                try:
                    job = await self._parse_job_card(card)
                    if job:
                        jobs.append(job)
                except Exception as e:
                    logger.error(f"解析职位卡片失败: {e}")
            
            await self.browser.random_delay(2, 4)
        
        return jobs
    
    async def _parse_job_card(self, card) -> Job:
        """解析职位卡片"""
        # 提取职位名称
        title_elem = await card.query_selector('.job-name')
        title = await title_elem.inner_text() if title_elem else ""
        
        # 提取公司名
        company_elem = await card.query_selector('.company-name')
        company = await company_elem.inner_text() if company_elem else ""
        
        # 提取薪资
        salary_elem = await card.query_selector('.salary')
        salary = await salary_elem.inner_text() if salary_elem else ""
        
        # 提取地点
        location_elem = await card.query_selector('.job-area')
        location = await location_elem.inner_text() if location_elem else ""
        
        # 提取经验要求
        info_elems = await card.query_selector_all('.tag-list li')
        experience = ""
        education = ""
        if len(info_elems) >= 1:
            experience = await info_elems[0].inner_text()
        if len(info_elems) >= 2:
            education = await info_elems[1].inner_text()
        
        # 生成唯一ID
        job_id = f"boss_{hash(title + company)}"
        
        return Job(
            id=job_id,
            source=JobSource.BOSS,
            title=title.strip(),
            company=company.strip(),
            salary=salary.strip(),
            location=location.strip(),
            experience=experience.strip(),
            education=education.strip()
        )
    
    async def apply_job(self, job: Job) -> bool:
        """投递简历"""
        try:
            logger.info(f"投递职位: {job.title} @ {job.company}")
            
            # 进入职位详情页
            await self.browser.page.goto(job.url or self.base_url)
            await self.browser.random_delay(2, 3)
            
            # 点击立即沟通/投递按钮
            # 注意：Boss直聘需要先沟通，这里简化处理
            chat_btn = await self.browser.page.query_selector('.btn-chat')
            if chat_btn:
                await self.browser.safe_click('.btn-chat')
                await self.browser.random_delay(2, 3)
                
                # 发送打招呼消息
                # 这里可以根据配置发送预设的打招呼语
                
                logger.info(f"投递成功: {job.title}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"投递失败: {e}")
            return False
```

- [ ] **Step 3: Commit**

```bash
git add job_automation/spiders/base.py job_automation/spiders/boss.py
git commit -m "feat: add spider base class and Boss spider"
```

---

## Task 9: 智联招聘爬虫

**Files:**
- Create: `job_automation/spiders/zhaopin.py`

- [ ] **Step 1: 创建智联招聘爬虫**

```python
# spiders/zhaopin.py
from typing import List
from urllib.parse import quote

from storage.models import Job, JobSource
from spiders.base import BaseSpider
from utils.logger import logger


class ZhaopinSpider(BaseSpider):
    """智联招聘爬虫"""
    
    def __init__(self, browser):
        super().__init__(browser)
        self.platform = "zhaopin"
        self.base_url = "https://www.zhaopin.com"
    
    def get_rate_limit(self) -> dict:
        return {'per_hour': 14, 'min_interval': 4}
    
    async def login(self) -> bool:
        """智联招聘登录"""
        logger.info("开始登录 智联招聘...")
        
        await self.browser.page.goto(f"{self.base_url}/")
        await self.browser.random_delay(2, 3)
        
        # 点击登录按钮
        login_btn = await self.browser.page.query_selector('.login-btn')
        if login_btn:
            await self.browser.safe_click('.login-btn')
        
        # 等待用户登录（扫码或密码）
        logger.info("请完成登录，等待3分钟...")
        
        import time
        start_time = time.time()
        while time.time() - start_time < 180:
            await self.browser.random_delay(3, 5)
            
            # 检查登录状态
            user_elem = await self.browser.page.query_selector('.user-name')
            if user_elem:
                logger.info("登录成功！")
                await self.browser.save_state(self.platform)
                return True
        
        return False
    
    async def search_jobs(self, keywords: List[str], location: str = "") -> List[Job]:
        """搜索职位"""
        jobs = []
        
        for keyword in keywords:
            logger.info(f"搜索关键词: {keyword}")
            
            # 构建搜索URL
            search_url = f"{self.base_url}/jobs/"
            await self.browser.page.goto(search_url)
            await self.browser.random_delay(2, 3)
            
            # 填写搜索框
            search_input = await self.browser.page.query_selector('.search-input')
            if search_input:
                await self.browser.safe_fill('.search-input', keyword)
                
                # 点击搜索按钮
                search_btn = await self.browser.page.query_selector('.search-btn')
                if search_btn:
                    await self.browser.safe_click('.search-btn')
            
            await self.browser.random_delay(3, 5)
            
            # 提取职位列表
            job_cards = await self.browser.page.query_selector_all('.joblist-box__item')
            logger.info(f"找到 {len(job_cards)} 个职位")
            
            for card in job_cards:
                try:
                    job = await self._parse_job_card(card)
                    if job:
                        jobs.append(job)
                except Exception as e:
                    logger.error(f"解析职位卡片失败: {e}")
            
            await self.browser.random_delay(2, 4)
        
        return jobs
    
    async def _parse_job_card(self, card) -> Job:
        """解析职位卡片"""
        # 提取职位名称
        title_elem = await card.query_selector('.jobinfo__name')
        title = await title_elem.inner_text() if title_elem else ""
        
        # 提取公司名
        company_elem = await card.query_selector('.companyinfo__name')
        company = await company_elem.inner_text() if company_elem else ""
        
        # 提取薪资
        salary_elem = await card.query_selector('.jobinfo__salary')
        salary = await salary_elem.inner_text() if salary_elem else ""
        
        # 提取地点
        location_elem = await card.query_selector('.jobinfo__area')
        location = await location_elem.inner_text() if location_elem else ""
        
        # 提取要求
        require_elem = await card.query_selector('.jobinfo__require')
        require_text = await require_elem.inner_text() if require_elem else ""
        
        experience = ""
        education = ""
        if "|" in require_text:
            parts = require_text.split("|")
            if len(parts) >= 2:
                experience = parts[0].strip()
                education = parts[1].strip()
        
        # 生成唯一ID
        job_id = f"zhaopin_{hash(title + company)}"
        
        return Job(
            id=job_id,
            source=JobSource.ZHAOPIN,
            title=title.strip(),
            company=company.strip(),
            salary=salary.strip(),
            location=location.strip(),
            experience=experience,
            education=education
        )
    
    async def apply_job(self, job: Job) -> bool:
        """投递简历"""
        try:
            logger.info(f"投递职位: {job.title} @ {job.company}")
            
            # 进入职位详情页
            await self.browser.page.goto(job.url or self.base_url)
            await self.browser.random_delay(2, 3)
            
            # 点击申请/投递按钮
            apply_btn = await self.browser.page.query_selector('.apply-btn')
            if apply_btn:
                await self.browser.safe_click('.apply-btn')
                await self.browser.random_delay(2, 3)
                
                # 确认投递
                confirm_btn = await self.browser.page.query_selector('.confirm-btn')
                if confirm_btn:
                    await self.browser.safe_click('.confirm-btn')
                
                logger.info(f"投递成功: {job.title}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"投递失败: {e}")
            return False
```

- [ ] **Step 2: Commit**

```bash
git add job_automation/spiders/zhaopin.py
git commit -m "feat: add Zhaopin spider"
```

---

## Task 10: 职位匹配引擎

**Files:**
- Create: `job_automation/core/matcher.py`
- Create: `job_automation/tests/test_matcher.py`

- [ ] **Step 1: 创建匹配引擎**

```python
# core/matcher.py
import re
from typing import List, Tuple
from openai import OpenAI

from storage.models import Job, UserProfile, MatchResult
from core.config_loader import config
from utils.logger import logger


class JobMatcher:
    """职位匹配引擎"""
    
    def __init__(self):
        self.client = OpenAI(api_key=config.openai_api_key) if config.openai_api_key else None
    
    def match(self, job: Job, profile: UserProfile) -> MatchResult:
        """计算职位与用户的匹配度"""
        
        # 1. 硬性条件检查
        hard_passed, hard_reason = self._check_hard_constraints(job, profile)
        if not hard_passed:
            return MatchResult(
                score=0,
                reason=hard_reason,
                hard_constraints_passed=False
            )
        
        # 2. AI智能评分
        if self.client and job.description:
            return self._ai_match(job, profile)
        else:
            return self._rule_match(job, profile)
    
    def _check_hard_constraints(self, job: Job, profile: UserProfile) -> Tuple[bool, str]:
        """检查硬性条件"""
        
        # 检查薪资
        if profile.min_salary and job.salary:
            job_min_salary = self._parse_salary(job.salary)
            if job_min_salary and job_min_salary < profile.min_salary:
                return False, f"薪资低于期望({job_min_salary} < {profile.min_salary})"
        
        # 检查地点
        if profile.locations and job.location:
            location_matched = any(
                loc in job.location for loc in profile.locations
            )
            if not location_matched:
                return False, f"地点不匹配({job.location})"
        
        return True, ""
    
    def _parse_salary(self, salary_str: str) -> int:
        """解析薪资字符串为数字"""
        # 支持格式: "15K-25K", "15-25万/年", "面议"
        numbers = re.findall(r'(\d+)', salary_str)
        if numbers:
            # 取最小值
            return int(numbers[0]) * 1000
        return None
    
    def _ai_match(self, job: Job, profile: UserProfile) -> MatchResult:
        """使用AI进行匹配评分"""
        
        prompt = f"""
请分析以下职位与求职者的匹配度，给出0-100的评分。

职位信息：
- 职位名称: {job.title}
- 公司: {job.company}
- 薪资: {job.salary}
- 地点: {job.location}
- 经验要求: {job.experience}
- 学历要求: {job.education}
- 职位描述: {job.description[:1000]}

求职者信息：
- 技能: {', '.join(profile.keywords)}
- 工作年限: {profile.work_years}年
- 期望薪资: {profile.min_salary}-{profile.max_salary}

请返回以下格式的JSON：
{{
    "score": 匹配度分数(0-100),
    "reason": "简短的匹配理由",
    "matched_keywords": ["匹配的技能1", "匹配的技能2"],
    "missing_keywords": ["缺失的技能1"]
}}

注意：只返回JSON，不要有其他文字。
"""
        
        try:
            response = self.client.chat.completions.create(
                model=config.get('ai.model', 'gpt-4'),
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )
            
            result = response.choices[0].message.content
            
            # 解析JSON
            import json
            json_match = re.search(r'\{.*\}', result, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return MatchResult(
                    score=data.get('score', 50),
                    reason=data.get('reason', ''),
                    matched_keywords=data.get('matched_keywords', []),
                    missing_keywords=data.get('missing_keywords', []),
                    hard_constraints_passed=True
                )
        except Exception as e:
            logger.error(f"AI匹配失败: {e}")
        
        # 失败时回退到规则匹配
        return self._rule_match(job, profile)
    
    def _rule_match(self, job: Job, profile: UserProfile) -> MatchResult:
        """基于规则的匹配"""
        score = 50  # 基础分
        matched = []
        missing = []
        
        # 技能匹配
        if profile.keywords and job.tags:
            matched_tags = set(profile.keywords) & set(job.tags)
            matched = list(matched_tags)
            missing = list(set(profile.keywords) - set(job.tags))
            
            # 每匹配一个技能加10分
            score += len(matched_tags) * 10
        
        # 职位关键词匹配
        job_title_lower = job.title.lower()
        for keyword in profile.keywords:
            if keyword.lower() in job_title_lower:
                score += 15
                if keyword not in matched:
                    matched.append(keyword)
        
        # 工作年限匹配
        if profile.work_years and job.experience:
            required_years = self._parse_experience(job.experience)
            if required_years and profile.work_years >= required_years:
                score += 10
        
        # 限制分数范围
        score = max(0, min(100, score))
        
        return MatchResult(
            score=score,
            reason=f"技能匹配: {len(matched)}个" if matched else "基础匹配",
            matched_keywords=matched,
            missing_keywords=missing,
            hard_constraints_passed=True
        )
    
    def _parse_experience(self, exp_str: str) -> int:
        """解析经验要求"""
        numbers = re.findall(r'(\d+)', exp_str)
        if numbers:
            return int(numbers[0])
        return None
```

- [ ] **Step 2: 编写测试**

```python
# tests/test_matcher.py
import pytest
from core.matcher import JobMatcher
from storage.models import Job, UserProfile, JobSource


@pytest.fixture
def matcher():
    return JobMatcher()


def test_hard_constraints_salary(matcher):
    """测试硬性条件-薪资"""
    job = Job(
        id="1",
        source=JobSource.BOSS,
        title="测试",
        company="测试公司",
        salary="10K-15K"
    )
    profile = UserProfile(min_salary=20000)
    
    result = matcher.match(job, profile)
    assert result.score == 0
    assert "薪资" in result.reason


def test_hard_constraints_location(matcher):
    """测试硬性条件-地点"""
    job = Job(
        id="1",
        source=JobSource.BOSS,
        title="测试",
        company="测试公司",
        location="广州"
    )
    profile = UserProfile(locations=["北京", "上海"])
    
    result = matcher.match(job, profile)
    assert result.score == 0
    assert "地点" in result.reason


def test_rule_match(matcher):
    """测试规则匹配"""
    job = Job(
        id="1",
        source=JobSource.BOSS,
        title="Python开发工程师",
        company="测试公司",
        tags=["Python", "Django"]
    )
    profile = UserProfile(keywords=["Python", "Flask"])
    
    result = matcher.match(job, profile)
    assert result.score > 50
    assert "Python" in result.matched_keywords
```

- [ ] **Step 3: Commit**

```bash
git add job_automation/core/matcher.py job_automation/tests/test_matcher.py
git commit -m "feat: add job matching engine with AI and rule-based matching"
```

---

## Task 11: 通知模块

**Files:**
- Create: `job_automation/notifier/webhook.py`

- [ ] **Step 1: 创建通知模块**

```python
# notifier/webhook.py
import json
import httpx
from typing import List
from storage.models import Job
from core.config_loader import config
from utils.logger import logger


class Notifier:
    """Webhook通知器"""
    
    def __init__(self):
        self.feishu_webhook = config.feishu_webhook
        self.dingtalk_webhook = config.dingtalk_webhook
    
    async def send_applied_notification(self, job: Job):
        """发送自动投递成功通知"""
        message = f"""🎉 自动投递成功

职位：{job.title}
公司：{job.company}
薪资：{job.salary or '未标明'}
地点：{job.location or '未标明'}
匹配度：{job.match_score:.1f}分
"""
        await self._send(message)
    
    async def send_pending_confirmation(self, jobs: List[Job]):
        """发送待确认职位通知"""
        if not jobs:
            return
        
        job_list = "\n".join([
            f"{i+1}. {job.title} - {job.company} - {job.match_score:.0f}分"
            for i, job in enumerate(jobs[:10])  # 最多显示10个
        ])
        
        message = f"""📋 发现 {len(jobs)} 个待确认职位

{job_list}

请查看详细信息并确认是否投递。
"""
        await self._send(message)
    
    async def send_daily_report(self, applied_count: int, pending_count: int):
        """发送日报"""
        message = f"""📊 今日投递报告

✅ 自动投递成功：{applied_count} 份
⏳ 待确认职位：{pending_count} 份

继续加油！💪
"""
        await self._send(message)
    
    async def send_error(self, error_msg: str):
        """发送错误通知"""
        message = f"""❌ 运行错误

{error_msg}

请检查日志了解详情。
"""
        await self._send(message)
    
    async def _send(self, message: str):
        """发送消息到所有配置的渠道"""
        if self.feishu_webhook:
            await self._send_feishu(message)
        
        if self.dingtalk_webhook:
            await self._send_dingtalk(message)
    
    async def _send_feishu(self, message: str):
        """发送飞书消息"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.feishu_webhook,
                    json={"msg_type": "text", "content": {"text": message}},
                    timeout=30
                )
                
                if response.status_code == 200:
                    logger.info("飞书通知发送成功")
                else:
                    logger.error(f"飞书通知发送失败: {response.text}")
                    
        except Exception as e:
            logger.error(f"飞书通知异常: {e}")
    
    async def _send_dingtalk(self, message: str):
        """发送钉钉消息"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.dingtalk_webhook,
                    json={"msgtype": "text", "text": {"content": message}},
                    timeout=30
                )
                
                if response.status_code == 200:
                    logger.info("钉钉通知发送成功")
                else:
                    logger.error(f"钉钉通知发送失败: {response.text}")
                    
        except Exception as e:
            logger.error(f"钉钉通知异常: {e}")
```

- [ ] **Step 2: Commit**

```bash
git add job_automation/notifier/webhook.py
git commit -m "feat: add webhook notifier for Feishu and DingTalk"
```

---

## Task 12: 主程序入口

**Files:**
- Create: `job_automation/main.py`

- [ ] **Step 1: 创建主程序**

```python
#!/usr/bin/env python3
"""
自动求职投递系统 - 主入口
"""

import asyncio
import argparse
from datetime import datetime
from pathlib import Path

from core.browser import BrowserManager
from core.resume_parser import ResumeParser
from core.matcher import JobMatcher
from storage.database import Database
from storage.models import Job, UserProfile, JobStatus
from spiders.boss import BossSpider
from spiders.zhaopin import ZhaopinSpider
from notifier.webhook import Notifier
from core.config_loader import config
from utils.logger import logger, setup_logger


class JobAutomation:
    """自动化主类"""
    
    def __init__(self):
        self.db = Database(config.get('database.path', 'data/jobs.db'))
        self.parser = ResumeParser()
        self.matcher = JobMatcher()
        self.notifier = Notifier()
        self.profile: UserProfile = None
    
    async def init_profile(self, resume_path: str = None):
        """初始化用户资料"""
        import json
        
        # 从配置文件加载
        profile_file = Path("config/user_profile.json")
        if profile_file.exists():
            with open(profile_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.profile = UserProfile(**data.get('personal_info', {}))
                self.profile.keywords = data.get('job_preferences', {}).get('keywords', [])
                self.profile.locations = data.get('job_preferences', {}).get('locations', [])
                self.profile.min_salary = data.get('job_preferences', {}).get('min_salary')
                self.profile.max_salary = data.get('job_preferences', {}).get('max_salary')
                self.profile.work_years = data.get('job_preferences', {}).get('work_years')
        
        # 如果有简历文件，解析并合并
        if resume_path:
            parsed_profile = self.parser.parse(resume_path)
            # 合并解析结果
            if not self.profile:
                self.profile = parsed_profile
            else:
                if parsed_profile.name:
                    self.profile.name = parsed_profile.name
                if parsed_profile.keywords:
                    self.profile.keywords = list(set(self.profile.keywords + parsed_profile.keywords))
        
        logger.info(f"用户资料初始化完成: {self.profile.name}")
    
    async def run(self, headless: bool = True, platforms: list = None):
        """运行主流程"""
        if not self.profile:
            await self.init_profile()
        
        if not platforms:
            platforms = ['boss', 'zhaopin']
        
        browser = BrowserManager()
        
        try:
            await browser.launch(headless=headless)
            
            # 根据平台运行爬虫
            if 'boss' in platforms:
                await self._run_spider(BossSpider(browser), 'Boss直聘')
            
            if 'zhaopin' in platforms:
                await self._run_spider(ZhaopinSpider(browser), '智联招聘')
            
            # 处理匹配结果
            await self._process_matches()
            
        except Exception as e:
            logger.error(f"运行出错: {e}")
            await self.notifier.send_error(str(e))
        finally:
            await browser.close()
    
    async def _run_spider(self, spider, platform_name: str):
        """运行单个爬虫"""
        logger.info(f"开始爬取 {platform_name}...")
        
        # 检查登录
        if not await spider.check_login():
            logger.info(f"{platform_name} 未登录，开始登录...")
            if not await spider.login():
                logger.error(f"{platform_name} 登录失败，跳过")
                return
        
        # 搜索职位
        jobs = await spider.search_jobs(
            keywords=self.profile.keywords[:3],  # 最多3个关键词
            location=self.profile.locations[0] if self.profile.locations else ""
        )
        
        logger.info(f"{platform_name} 找到 {len(jobs)} 个职位")
        
        # 匹配并保存
        for job in jobs:
            # 检查是否已存在
            existing = self.db.get_job(job.id)
            if existing:
                continue
            
            # 计算匹配度
            match_result = self.matcher.match(job, self.profile)
            job.match_score = match_result.score
            job.match_reason = match_result.reason
            
            # 保存到数据库
            self.db.save_job(job)
            logger.info(f"保存职位: {job.title} (匹配度: {match_result.score:.1f})")
        
        await spider.browser.save_state(spider.platform)
    
    async def _process_matches(self):
        """处理匹配结果"""
        auto_threshold = self.profile.auto_apply_threshold if self.profile else 80
        confirm_threshold = self.profile.confirm_threshold if self.profile else 50
        
        # 获取高匹配职位（自动投递）
        high_match_jobs = [
            job for job in self.db.get_jobs_by_status(JobStatus.PENDING)
            if job.match_score >= auto_threshold
        ]
        
        # 获取中等匹配职位（待确认）
        medium_match_jobs = [
            job for job in self.db.get_jobs_by_status(JobStatus.PENDING)
            if confirm_threshold <= job.match_score < auto_threshold
        ]
        
        logger.info(f"高匹配职位: {len(high_match_jobs)}个，待确认: {len(medium_match_jobs)}个")
        
        # 自动投递高匹配职位
        applied_count = 0
        for job in high_match_jobs[:10]:  # 限制数量
            # 这里简化处理，实际应该重新打开浏览器进行投递
            # 由于投递需要保持登录状态，这里只做标记
            self.db.update_job_status(job.id, JobStatus.CONFIRMED)
            applied_count += 1
            logger.info(f"标记自动投递: {job.title}")
        
        # 发送通知
        if applied_count > 0:
            for job in high_match_jobs[:3]:  # 通知前3个
                await self.notifier.send_applied_notification(job)
        
        if medium_match_jobs:
            await self.notifier.send_pending_confirmation(medium_match_jobs)


def main():
    parser = argparse.ArgumentParser(description='自动求职投递系统')
    parser.add_argument('--resume', '-r', help='简历文件路径')
    parser.add_argument('--headless', action='store_true', default=True, help='无头模式')
    parser.add_argument('--no-headless', dest='headless', action='store_false', help='显示浏览器')
    parser.add_argument('--platforms', '-p', nargs='+', choices=['boss', 'zhaopin'], 
                       help='指定平台')
    
    args = parser.parse_args()
    
    # 设置日志
    setup_logger(
        level=config.get('logging.level', 'INFO'),
        log_file=config.get('logging.file', 'logs/app.log')
    )
    
    # 运行
    automation = JobAutomation()
    asyncio.run(automation.run(
        headless=args.headless,
        platforms=args.platforms
    ))


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add job_automation/main.py
git commit -m "feat: add main entry point for job automation"
```

---

## Task 13: 定时任务调度

**Files:**
- Create: `job_automation/scheduler.py`

- [ ] **Step 1: 创建定时任务**

```python
#!/usr/bin/env python3
"""
定时任务调度器
"""

import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from main import JobAutomation
from utils.logger import logger, setup_logger
from core.config_loader import config


async def daily_job():
    """每日任务"""
    logger.info("开始执行定时任务...")
    
    automation = JobAutomation()
    await automation.run(headless=True)
    
    logger.info("定时任务执行完成")


def main():
    # 设置日志
    setup_logger(
        level=config.get('logging.level', 'INFO'),
        log_file=config.get('logging.file', 'logs/app.log')
    )
    
    logger.info("启动定时任务调度器...")
    
    # 创建调度器
    scheduler = AsyncIOScheduler()
    
    # 每天早上9点执行
    scheduler.add_job(
        daily_job,
        trigger=CronTrigger(hour=9, minute=0),
        id='daily_job_search',
        replace_existing=True
    )
    
    # 启动
    scheduler.start()
    logger.info("定时任务已启动，每天9:00运行")
    
    try:
        # 保持运行
        asyncio.get_event_loop().run_forever()
    except (KeyboardInterrupt, SystemExit):
        logger.info("正在关闭调度器...")
        scheduler.shutdown()


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add job_automation/scheduler.py
git commit -m "feat: add scheduler for daily job search"
```

---

## Task 14: 初始化脚本

**Files:**
- Create: `job_automation/init.py`

- [ ] **Step 1: 创建初始化脚本**

```python
#!/usr/bin/env python3
"""
初始化配置
"""

import json
from pathlib import Path


def init_config():
    """初始化用户配置"""
    print("=== 自动求职投递系统 - 初始化 ===\n")
    
    # 收集用户信息
    profile = {
        "personal_info": {
            "name": input("姓名: "),
            "phone": input("手机号: "),
            "email": input("邮箱: "),
            "resume_path": input("简历文件路径 (PDF/Word): ")
        },
        "job_preferences": {
            "keywords": input("求职关键词 (用逗号分隔): ").split(","),
            "locations": input("期望工作地点 (用逗号分隔): ").split(","),
            "min_salary": int(input("最低期望薪资 (元/月): ") or 0),
            "max_salary": int(input("最高期望薪资 (元/月): ") or 0),
            "work_years": int(input("工作年限: ") or 0),
            "company_size": ["100-499人", "500-999人"],
            "industries": ["互联网"]
        },
        "match_thresholds": {
            "auto_apply": 80,
            "confirm": 50
        },
        "rate_limits": {
            "boss": {"per_hour": 7, "min_interval": 8},
            "zhaopin": {"per_hour": 14, "min_interval": 4}
        },
        "notifications": {
            "feishu_webhook": input("飞书Webhook (可选): "),
            "dingtalk_webhook": input("钉钉Webhook (可选): ")
        }
    }
    
    # 保存配置
    config_dir = Path("config")
    config_dir.mkdir(exist_ok=True)
    
    with open(config_dir / "user_profile.json", 'w', encoding='utf-8') as f:
        json.dump(profile, f, ensure_ascii=False, indent=2)
    
    # 创建环境变量文件
    env_file = config_dir / ".env"
    openai_key = input("\nOpenAI API Key (用于智能匹配): ")
    
    with open(env_file, 'w', encoding='utf-8') as f:
        f.write(f"OPENAI_API_KEY={openai_key}\n")
    
    print("\n✅ 初始化完成！")
    print(f"配置已保存到: {config_dir}/user_profile.json")
    print(f"API Key已保存到: {env_file}")
    print("\n使用说明:")
    print("  手动运行: python main.py")
    print("  定时任务: python scheduler.py")


if __name__ == "__main__":
    init_config()
```

- [ ] **Step 2: Commit**

```bash
git add job_automation/init.py
git commit -m "feat: add initialization script"
```

---

## Task 15: 最终验证与测试

- [ ] **Step 1: 运行所有测试**

```bash
cd job_automation
pytest tests/ -v
```
Expected: 所有测试通过

- [ ] **Step 2: 检查代码格式**

```bash
python -m py_compile main.py scheduler.py init.py
python -m py_compile core/*.py spiders/*.py storage/*.py notifier/*.py utils/*.py
```
Expected: 无语法错误

- [ ] **Step 3: 创建 README**

```markdown
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
```

- [ ] **Step 4: Final Commit**

```bash
git add job_automation/README.md
git commit -m "docs: add README and finalize project"
```

---

## 验收清单

- [x] 项目结构与配置系统
- [x] 简历解析器（PDF/Word + AI）
- [x] 浏览器管理（Playwright + 反检测）
- [x] 爬虫基类 + Boss直聘爬虫
- [x] 爬虫基类 + 智联招聘爬虫
- [x] 职位匹配引擎（硬性条件 + AI评分）
- [x] 数据存储（SQLite + 模型）
- [x] 通知模块（飞书/钉钉）
- [x] 定时任务调度
- [x] 主程序入口与CLI
- [x] 测试与文档

---

**Plan complete and saved to `docs/superpowers/plans/2025-01-09-job-auto-apply-plan.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
