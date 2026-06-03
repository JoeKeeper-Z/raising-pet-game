# storage/database.py
import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from contextlib import contextmanager

from storage.models import Job, Application, JobStatus, JobSource


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
