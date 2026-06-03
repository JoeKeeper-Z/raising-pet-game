# storage/models.py
from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    AUTO_APPLIED = "auto_applied"
    MANUALLY_APPLIED = "manually_applied"
    REJECTED = "rejected"
    FAILED = "failed"


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

    keywords: List[str] = Field(default_factory=list)
    locations: List[str] = Field(default_factory=list)
    min_salary: Optional[int] = None
    max_salary: Optional[int] = None
    work_years: Optional[int] = None
    company_size: List[str] = Field(default_factory=list)
    industries: List[str] = Field(default_factory=list)

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

    match_score: Optional[float] = None
    match_reason: Optional[str] = None
    status: JobStatus = JobStatus.PENDING

    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class MatchResult(BaseModel):
    """匹配结果"""
    score: float
    reason: str
    matched_keywords: List[str] = Field(default_factory=list)
    missing_keywords: List[str] = Field(default_factory=list)
    hard_constraints_passed: bool = True


class Application(BaseModel):
    """投递记录"""
    id: str
    job_id: str
    applied_at: datetime = Field(default_factory=datetime.now)
    status: str
    message: Optional[str] = None
    is_auto: bool = True
