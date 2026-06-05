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
