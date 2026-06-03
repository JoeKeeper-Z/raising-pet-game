"""Data models for job automation system."""

from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    """Job application status enumeration."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    AUTO_APPLIED = "auto_applied"
    MANUALLY_APPLIED = "manually_applied"
    REJECTED = "rejected"
    INTERVIEWING = "interviewing"
    OFFERED = "offered"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


class JobSource(str, Enum):
    """Job source platform enumeration."""
    BOSS = "boss"
    ZHAOPIN = "zhaopin"
    LAGOU = "lagou"
    LIEPIN = "liepin"
    OTHER = "other"


class UserProfile(BaseModel):
    """User profile model containing personal information and preferences."""

    # Basic Information
    name: str = Field(..., description="User's full name")
    email: str = Field(..., description="Contact email address")
    phone: Optional[str] = Field(None, description="Contact phone number")

    # Professional Information
    title: Optional[str] = Field(None, description="Current or desired job title")
    summary: Optional[str] = Field(None, description="Professional summary or bio")
    skills: List[str] = Field(default_factory=list, description="List of professional skills")

    # Experience & Education
    years_of_experience: Optional[int] = Field(None, ge=0, description="Years of work experience")
    education_level: Optional[str] = Field(None, description="Highest education level")

    # Preferences
    desired_salary_min: Optional[int] = Field(None, ge=0, description="Minimum desired salary")
    desired_salary_max: Optional[int] = Field(None, ge=0, description="Maximum desired salary")
    preferred_locations: List[str] = Field(default_factory=list, description="Preferred work locations")
    preferred_industries: List[str] = Field(default_factory=list, description="Preferred industries")
    remote_preference: Optional[str] = Field(None, description="Remote work preference (remote/hybrid/onsite)")

    # Resume & Documents
    resume_path: Optional[str] = Field(None, description="Path to resume file")
    portfolio_url: Optional[str] = Field(None, description="Portfolio or personal website URL")

    # Metadata
    created_at: datetime = Field(default_factory=datetime.now, description="Profile creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.now, description="Last update timestamp")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class Job(BaseModel):
    """Job posting model representing a scraped job listing."""

    # Identification
    id: Optional[str] = Field(None, description="Unique job identifier")
    source: JobSource = Field(..., description="Source platform of the job")
    source_job_id: Optional[str] = Field(None, description="Original job ID from source platform")
    url: Optional[str] = Field(None, description="URL to the original job posting")

    # Company Information
    company_name: str = Field(..., description="Name of the hiring company")
    company_size: Optional[str] = Field(None, description="Company size (e.g., '50-150人')")
    company_industry: Optional[str] = Field(None, description="Company industry")
    company_stage: Optional[str] = Field(None, description="Company stage (e.g., 'A轮', '上市公司')")

    # Job Details
    title: str = Field(..., description="Job title")
    description: Optional[str] = Field(None, description="Full job description")
    requirements: Optional[str] = Field(None, description="Job requirements")
    responsibilities: Optional[str] = Field(None, description="Job responsibilities")

    # Compensation
    salary_min: Optional[int] = Field(None, ge=0, description="Minimum salary")
    salary_max: Optional[int] = Field(None, ge=0, description="Maximum salary")
    salary_months: Optional[int] = Field(None, ge=12, description="Number of salary months per year")

    # Location & Logistics
    location: Optional[str] = Field(None, description="Job location")
    address: Optional[str] = Field(None, description="Detailed work address")
    remote_option: Optional[bool] = Field(None, description="Whether remote work is allowed")

    # Tags & Classification
    tags: List[str] = Field(default_factory=list, description="Job tags (e.g., ['Java', 'Spring'])")
    job_type: Optional[str] = Field(None, description="Job type (full-time/part-time/contract)")
    experience_required: Optional[str] = Field(None, description="Required years of experience")
    education_required: Optional[str] = Field(None, description="Required education level")

    # HR/Recruiter Info
    recruiter_name: Optional[str] = Field(None, description="Recruiter or HR contact name")
    recruiter_title: Optional[str] = Field(None, description="Recruiter's title")

    # Metadata
    posted_at: Optional[datetime] = Field(None, description="When the job was posted")
    scraped_at: datetime = Field(default_factory=datetime.now, description="When the job was scraped")
    is_active: bool = Field(default=True, description="Whether the job is still active")
    raw_data: Optional[Dict[str, Any]] = Field(None, description="Raw scraped data for reference")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class MatchResult(BaseModel):
    """Job matching result model representing how well a job matches user profile."""

    # References
    job_id: str = Field(..., description="Reference to the matched job")
    user_profile_id: Optional[str] = Field(None, description="Reference to user profile used for matching")

    # Match Scores
    overall_score: float = Field(..., ge=0, le=100, description="Overall match score (0-100)")
    skill_match_score: Optional[float] = Field(None, ge=0, le=100, description="Skills match score")
    experience_match_score: Optional[float] = Field(None, ge=0, le=100, description="Experience match score")
    salary_match_score: Optional[float] = Field(None, ge=0, le=100, description="Salary expectation match score")
    location_match_score: Optional[float] = Field(None, ge=0, le=100, description="Location preference match score")

    # Match Details
    matched_skills: List[str] = Field(default_factory=list, description="Skills that matched")
    missing_skills: List[str] = Field(default_factory=list, description="Required skills not found in profile")
    extra_skills: List[str] = Field(default_factory=list, description="Skills in profile not required by job")

    # Analysis
    match_reasons: List[str] = Field(default_factory=list, description="Reasons for good match")
    mismatch_reasons: List[str] = Field(default_factory=list, description="Reasons for mismatch")
    recommendation: Optional[str] = Field(None, description="Recommendation (high/medium/low)")

    # LLM Analysis
    llm_analysis: Optional[str] = Field(None, description="Detailed LLM analysis of the match")

    # Metadata
    created_at: datetime = Field(default_factory=datetime.now, description="When the match was calculated")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class Application(BaseModel):
    """Job application model tracking the application process."""

    # References
    id: Optional[str] = Field(None, description="Unique application identifier")
    job_id: str = Field(..., description="Reference to the applied job")
    user_profile_id: Optional[str] = Field(None, description="Reference to user profile")
    match_result_id: Optional[str] = Field(None, description="Reference to match result")

    # Application Status
    status: JobStatus = Field(default=JobStatus.PENDING, description="Current application status")
    status_history: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="History of status changes with timestamps"
    )

    # Application Method
    applied_by: Optional[str] = Field(None, description="Who applied (user/system)")
    applied_at: Optional[datetime] = Field(None, description="When the application was submitted")

    # Communication
    cover_letter: Optional[str] = Field(None, description="Cover letter used for application")
    resume_version: Optional[str] = Field(None, description="Resume version used")

    # Response Tracking
    response_received: bool = Field(default=False, description="Whether a response was received")
    response_at: Optional[datetime] = Field(None, description="When response was received")
    response_type: Optional[str] = Field(None, description="Type of response (interview/rejection/etc)")
    response_notes: Optional[str] = Field(None, description="Notes about the response")

    # Interview Tracking
    interview_scheduled: bool = Field(default=False, description="Whether interview is scheduled")
    interview_date: Optional[datetime] = Field(None, description="Scheduled interview date")
    interview_type: Optional[str] = Field(None, description="Interview type (phone/video/onsite)")
    interview_round: Optional[int] = Field(None, description="Current interview round")

    # Offer Details
    offer_received: bool = Field(default=False, description="Whether an offer was received")
    offer_details: Optional[Dict[str, Any]] = Field(None, description="Offer details (salary, benefits, etc)")
    offer_deadline: Optional[datetime] = Field(None, description="Offer acceptance deadline")

    # Notes & Tags
    notes: Optional[str] = Field(None, description="General notes about this application")
    tags: List[str] = Field(default_factory=list, description="User-defined tags")

    # Metadata
    created_at: datetime = Field(default_factory=datetime.now, description="When application was created")
    updated_at: datetime = Field(default_factory=datetime.now, description="Last update timestamp")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
