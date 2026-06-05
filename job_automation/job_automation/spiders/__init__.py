# spiders/__init__.py
from .base import BaseSpider
from .boss import BossSpider
from .zhaopin import ZhaopinSpider

__all__ = ['BaseSpider', 'BossSpider', 'ZhaopinSpider']
