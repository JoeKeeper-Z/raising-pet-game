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
