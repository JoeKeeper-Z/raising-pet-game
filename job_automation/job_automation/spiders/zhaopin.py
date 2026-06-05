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

        # 等待用户登录
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
