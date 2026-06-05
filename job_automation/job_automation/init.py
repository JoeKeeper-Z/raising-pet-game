#!/usr/bin/env python3
"""
初始化配置
"""

import json
from pathlib import Path


def init_config():
    """初始化用户配置"""
    print("=== 自动求职投递系统 - 初始化 ===\n")

    # 收集用户信息
    profile = {
        "personal_info": {
            "name": input("姓名: "),
            "phone": input("手机号: "),
            "email": input("邮箱: "),
            "resume_path": input("简历文件路径 (PDF/Word): ")
        },
        "job_preferences": {
            "keywords": input("求职关键词 (用逗号分隔): ").split(","),
            "locations": input("期望工作地点 (用逗号分隔): ").split(","),
            "min_salary": int(input("最低期望薪资 (元/月): ") or 0),
            "max_salary": int(input("最高期望薪资 (元/月): ") or 0),
            "work_years": int(input("工作年限: ") or 0),
            "company_size": ["100-499人", "500-999人"],
            "industries": ["互联网"]
        },
        "match_thresholds": {
            "auto_apply": 80,
            "confirm": 50
        },
        "rate_limits": {
            "boss": {"per_hour": 7, "min_interval": 8},
            "zhaopin": {"per_hour": 14, "min_interval": 4}
        },
        "notifications": {
            "feishu_webhook": input("飞书Webhook (可选): "),
            "dingtalk_webhook": input("钉钉Webhook (可选): ")
        }
    }

    # 保存配置
    config_dir = Path("config")
    config_dir.mkdir(exist_ok=True)

    with open(config_dir / "user_profile.json", 'w', encoding='utf-8') as f:
        json.dump(profile, f, ensure_ascii=False, indent=2)

    # 创建环境变量文件
    env_file = config_dir / ".env"
    openai_key = input("\nOpenAI API Key (用于智能匹配): ")

    with open(env_file, 'w', encoding='utf-8') as f:
        f.write(f"OPENAI_API_KEY={openai_key}\n")

    print("\n✅ 初始化完成！")
    print(f"配置已保存到: {config_dir}/user_profile.json")
    print(f"API Key已保存到: {env_file}")
    print("\n使用说明:")
    print("  手动运行: python main.py")
    print("  定时任务: python scheduler.py")


if __name__ == "__main__":
    init_config()
