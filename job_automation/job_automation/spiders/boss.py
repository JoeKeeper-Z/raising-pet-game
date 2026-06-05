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

        while time.time() - start_time < 300:
            await self.browser.random_delay(3, 5)

            # 检查是否已登录
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
            chat_btn = await self.browser.page.query_selector('.btn-chat')
            if chat_btn:
                await self.browser.safe_click('.btn-chat')
                await self.browser.random_delay(2, 3)

                logger.info(f"投递成功: {job.title}")
                return True

            return False

        except Exception as e:
            logger.error(f"投递失败: {e}")
            return False
