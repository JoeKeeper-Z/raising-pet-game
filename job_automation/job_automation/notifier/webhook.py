# notifier/webhook.py
import json
import httpx
from typing import List
from storage.models import Job
from core.config_loader import config
from utils.logger import logger


class Notifier:
    """Webhook通知器"""

    def __init__(self):
        self.feishu_webhook = config.feishu_webhook
        self.dingtalk_webhook = config.dingtalk_webhook

    async def send_applied_notification(self, job: Job):
        """发送自动投递成功通知"""
        message = f"""🎉 自动投递成功

职位：{job.title}
公司：{job.company}
薪资：{job.salary or '未标明'}
地点：{job.location or '未标明'}
匹配度：{job.match_score:.1f}分
"""
        await self._send(message)

    async def send_pending_confirmation(self, jobs: List[Job]):
        """发送待确认职位通知"""
        if not jobs:
            return

        job_list = "\n".join([
            f"{i+1}. {job.title} - {job.company} - {job.match_score:.0f}分"
            for i, job in enumerate(jobs[:10])
        ])

        message = f"""📋 发现 {len(jobs)} 个待确认职位

{job_list}

请查看详细信息并确认是否投递。
"""
        await self._send(message)

    async def send_daily_report(self, applied_count: int, pending_count: int):
        """发送日报"""
        message = f"""📊 今日投递报告

✅ 自动投递成功：{applied_count} 份
⏳ 待确认职位：{pending_count} 份

继续加油！💪
"""
        await self._send(message)

    async def send_error(self, error_msg: str):
        """发送错误通知"""
        message = f"""❌ 运行错误

{error_msg}

请检查日志了解详情。
"""
        await self._send(message)

    async def _send(self, message: str):
        """发送消息到所有配置的渠道"""
        if self.feishu_webhook:
            await self._send_feishu(message)

        if self.dingtalk_webhook:
            await self._send_dingtalk(message)

    async def _send_feishu(self, message: str):
        """发送飞书消息"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.feishu_webhook,
                    json={"msg_type": "text", "content": {"text": message}},
                    timeout=30
                )

                if response.status_code == 200:
                    logger.info("飞书通知发送成功")
                else:
                    logger.error(f"飞书通知发送失败: {response.text}")

        except Exception as e:
            logger.error(f"飞书通知异常: {e}")

    async def _send_dingtalk(self, message: str):
        """发送钉钉消息"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.dingtalk_webhook,
                    json={"msgtype": "text", "text": {"content": message}},
                    timeout=30
                )

                if response.status_code == 200:
                    logger.info("钉钉通知发送成功")
                else:
                    logger.error(f"钉钉通知发送失败: {response.text}")

        except Exception as e:
            logger.error(f"钉钉通知异常: {e}")
