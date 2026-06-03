# core/config_loader.py
import os
import yaml
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Config:
    """配置管理"""

    def __init__(self, config_dir: str = "config"):
        self.config_dir = Path(config_dir)
        self.settings = self._load_settings()
        self.user_profile = self._load_user_profile()

    def _load_settings(self) -> dict:
        """加载系统设置"""
        settings_file = self.config_dir / "settings.yaml"
        if settings_file.exists():
            with open(settings_file, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        return {}

    def _load_user_profile(self) -> dict:
        """加载用户资料"""
        profile_file = self.config_dir / "user_profile.json"
        if profile_file.exists():
            with open(profile_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    def get(self, key: str, default=None):
        """获取配置项"""
        keys = key.split('.')
        value = self.settings
        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
            else:
                return default
        return value if value is not None else default

    @property
    def openai_api_key(self) -> str:
        """获取OpenAI API Key"""
        return os.getenv('OPENAI_API_KEY', '')

    @property
    def feishu_webhook(self) -> str:
        """获取飞书Webhook"""
        return self.user_profile.get('notifications', {}).get('feishu_webhook', '')

    @property
    def dingtalk_webhook(self) -> str:
        """获取钉钉Webhook"""
        return self.user_profile.get('notifications', {}).get('dingtalk_webhook', '')


# 全局配置实例
config = Config()
