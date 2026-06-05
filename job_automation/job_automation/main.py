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

        logger.info(f"用户资料初始化完成: {self.profile.name if self.profile else 'Unknown'}")

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
            keywords=self.profile.keywords[:3],
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
        for job in high_match_jobs[:10]:
            self.db.update_job_status(job.id, JobStatus.CONFIRMED)
            applied_count += 1
            logger.info(f"标记自动投递: {job.title}")

        # 发送通知
        if applied_count > 0:
            for job in high_match_jobs[:3]:
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
