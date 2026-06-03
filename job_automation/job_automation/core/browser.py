# core/browser.py
import json
import random
import asyncio
from pathlib import Path
from typing import Optional
from playwright.async_api import async_playwright, Page, Browser, BrowserContext
from fake_useragent import UserAgent

from utils.logger import logger
from core.config_loader import config


class BrowserManager:
    """Playwright浏览器管理"""

    def __init__(self):
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.ua = UserAgent()

    async def launch(self, headless: bool = True, platform: str = ""):
        """启动浏览器"""
        self.playwright = await async_playwright().start()

        # 反检测设置
        args = [
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
        ]

        self.browser = await self.playwright.chromium.launch(
            headless=headless,
            args=args,
            slow_mo=config.get('browser.slow_mo', 100)
        )

        # 创建上下文
        viewport = config.get('browser.viewport', {'width': 1920, 'height': 1080})

        context_options = {
            'viewport': viewport,
            'user_agent': self.ua.random,
            'locale': 'zh-CN',
            'timezone_id': 'Asia/Shanghai',
        }

        self.context = await self.browser.new_context(**context_options)

        # 注入反检测脚本
        await self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
        """)

        self.page = await self.context.new_page()

        # 尝试恢复登录状态
        if platform:
            await self.restore_state(platform)

        logger.info("浏览器启动成功")
        return self

    async def save_state(self, platform: str):
        """保存登录状态"""
        if not self.context:
            return

        state_path = Path(f"cookies/{platform}_state.json")
        state_path.parent.mkdir(parents=True, exist_ok=True)

        storage = await self.context.storage_state()
        with open(state_path, 'w', encoding='utf-8') as f:
            json.dump(storage, f)

        logger.info(f"登录状态已保存: {state_path}")

    async def restore_state(self, platform: str) -> bool:
        """恢复登录状态"""
        state_path = Path(f"cookies/{platform}_state.json")

        if not state_path.exists():
            logger.info(f"未找到登录状态: {platform}")
            return False

        try:
            with open(state_path, 'r', encoding='utf-8') as f:
                storage = json.load(f)

            # 重新创建上下文并加载状态
            await self.context.close()
            self.context = await self.browser.new_context(storage_state=storage)
            self.page = await self.context.new_page()

            logger.info(f"登录状态已恢复: {platform}")
            return True
        except Exception as e:
            logger.error(f"恢复登录状态失败: {e}")
            return False

    async def random_delay(self, min_sec: float = None, max_sec: float = None):
        """随机延迟"""
        min_sec = min_sec or config.get('anti_detection.random_delay_min', 2)
        max_sec = max_sec or config.get('anti_detection.random_delay_max', 5)
        delay = random.uniform(min_sec, max_sec)
        await asyncio.sleep(delay)

    async def safe_click(self, selector: str):
        """安全点击（带随机延迟）"""
        await self.random_delay(0.5, 1.5)
        await self.page.click(selector)
        await self.random_delay(1, 2)

    async def safe_fill(self, selector: str, text: str):
        """安全填写（模拟人工输入）"""
        await self.random_delay(0.5, 1)
        await self.page.click(selector)
        await self.page.fill(selector, "")

        # 模拟逐字输入
        for char in text:
            await self.page.type(selector, char, delay=random.randint(50, 150))

        await self.random_delay(0.5, 1)

    async def scroll_page(self):
        """模拟页面滚动"""
        for _ in range(random.randint(2, 5)):
            await self.page.mouse.wheel(0, random.randint(300, 800))
            await self.random_delay(1, 2)

    async def close(self):
        """关闭浏览器"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        logger.info("浏览器已关闭")

    async def __aenter__(self):
        await self.launch()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
