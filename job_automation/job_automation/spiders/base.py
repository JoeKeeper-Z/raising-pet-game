# spiders/base.py
from abc import ABC, abstractmethod
from typing import List

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
