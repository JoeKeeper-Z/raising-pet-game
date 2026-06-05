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
        numbers = re.findall(r'(\d+)', salary_str)
        if numbers:
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
        score = 50
        matched = []
        missing = []

        # 技能匹配
        if profile.keywords and job.tags:
            matched_tags = set(profile.keywords) & set(job.tags)
            matched = list(matched_tags)
            missing = list(set(profile.keywords) - set(job.tags))
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
