# core/resume_parser.py
import re
from pathlib import Path
from typing import Optional
import pdfplumber
from docx import Document
from openai import OpenAI

from utils.logger import logger
from storage.models import UserProfile
from core.config_loader import config


class ResumeParser:
    """简历解析器"""

    def __init__(self):
        self.client = OpenAI(api_key=config.openai_api_key) if config.openai_api_key else None

    def parse(self, file_path: str) -> UserProfile:
        """解析简历文件"""
        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"简历文件不存在: {file_path}")

        # 提取文本
        text = self._extract_text(file_path)
        logger.info(f"成功提取简历文本，长度: {len(text)} 字符")

        # 使用AI解析
        profile = self._ai_parse(text)
        profile.resume_path = str(file_path)

        return profile

    def _extract_text(self, file_path: Path) -> str:
        """从文件中提取文本"""
        suffix = file_path.suffix.lower()

        if suffix == '.pdf':
            return self._extract_pdf(file_path)
        elif suffix in ['.docx', '.doc']:
            return self._extract_docx(file_path)
        elif suffix == '.txt':
            return file_path.read_text(encoding='utf-8')
        else:
            raise ValueError(f"不支持的文件格式: {suffix}")

    def _extract_pdf(self, file_path: Path) -> str:
        """提取PDF文本"""
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
                text += "\n"
        return text

    def _extract_docx(self, file_path: Path) -> str:
        """提取Word文本"""
        doc = Document(file_path)
        return "\n".join([paragraph.text for paragraph in doc.paragraphs])

    def _ai_parse(self, text: str) -> UserProfile:
        """使用AI解析简历内容"""
        if not self.client:
            logger.warning("未配置OpenAI API，使用基础解析")
            return self._basic_parse(text)

        prompt = f"""
请分析以下简历内容，提取关键信息并以JSON格式返回。

简历内容：
{text[:3000]}

请返回以下格式的JSON：
{{
    "name": "姓名",
    "phone": "手机号",
    "email": "邮箱",
    "keywords": ["技能关键词1", "技能关键词2"],
    "work_years": 工作年限(数字),
    "min_salary": 最低期望薪资(数字),
    "max_salary": 最高期望薪资(数字)
}}

注意：
1. 只返回JSON，不要有其他文字
2. 如果某项信息不存在，使用null或空数组
3. 技能关键词从简历中的技术栈、工具、语言等提取
"""

        try:
            response = self.client.chat.completions.create(
                model=config.get('ai.model', 'gpt-4'),
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )

            result = response.choices[0].message.content
            # 提取JSON部分
            json_match = re.search(r'\{.*\}', result, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return UserProfile(
                    name=data.get('name'),
                    phone=data.get('phone'),
                    email=data.get('email'),
                    keywords=data.get('keywords', []),
                    work_years=data.get('work_years'),
                    min_salary=data.get('min_salary'),
                    max_salary=data.get('max_salary')
                )
        except Exception as e:
            logger.error(f"AI解析失败: {e}")

        return self._basic_parse(text)

    def _basic_parse(self, text: str) -> UserProfile:
        """基础解析（正则提取）"""
        profile = UserProfile()

        # 提取姓名
        name_match = re.search(r'^[一-龥]{2,4}', text.strip())
        if name_match:
            profile.name = name_match.group()

        # 提取手机号
        phone_match = re.search(r'1[3-9]\d{9}', text)
        if phone_match:
            profile.phone = phone_match.group()

        # 提取邮箱
        email_match = re.search(r'[\w.-]+@[\w.-]+\.\w+', text)
        if email_match:
            profile.email = email_match.group()

        # 提取常见技术关键词
        tech_keywords = [
            'Python', 'Java', 'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular',
            'Node.js', 'Go', 'Rust', 'C++', 'SQL', 'MySQL', 'PostgreSQL', 'MongoDB',
            'Redis', 'Docker', 'Kubernetes', 'AWS', '阿里云', 'Linux', 'Git'
        ]

        profile.keywords = [kw for kw in tech_keywords if kw.lower() in text.lower()]

        # 提取工作年限
        year_match = re.search(r'(\d+)[\s]*年[\s]*经验', text)
        if year_match:
            profile.work_years = int(year_match.group(1))

        return profile
