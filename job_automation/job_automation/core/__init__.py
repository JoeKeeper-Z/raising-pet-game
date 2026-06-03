# core/__init__.py
from .config_loader import Config, config
from .browser import BrowserManager
from .resume_parser import ResumeParser
from .matcher import JobMatcher

__all__ = ['Config', 'config', 'BrowserManager', 'ResumeParser', 'JobMatcher']
