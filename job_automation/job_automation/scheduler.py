#!/usr/bin/env python3
"""
定时任务调度器
"""

import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from main import JobAutomation
from utils.logger import logger, setup_logger
from core.config_loader import config


async def daily_job():
    """每日任务"""
    logger.info("开始执行定时任务...")

    automation = JobAutomation()
    await automation.run(headless=True)

    logger.info("定时任务执行完成")


def main():
    # 设置日志
    setup_logger(
        level=config.get('logging.level', 'INFO'),
        log_file=config.get('logging.file', 'logs/app.log')
    )

    logger.info("启动定时任务调度器...")

    # 创建调度器
    scheduler = AsyncIOScheduler()

    # 每天早上9点执行
    scheduler.add_job(
        daily_job,
        trigger=CronTrigger(hour=9, minute=0),
        id='daily_job_search',
        replace_existing=True
    )

    # 启动
    scheduler.start()
    logger.info("定时任务已启动，每天9:00运行")

    try:
        # 保持运行
        asyncio.get_event_loop().run_forever()
    except (KeyboardInterrupt, SystemExit):
        logger.info("正在关闭调度器...")
        scheduler.shutdown()


if __name__ == "__main__":
    main()
