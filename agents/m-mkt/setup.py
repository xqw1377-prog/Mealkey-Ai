"""
M-MKT 安装配置

Usage:
    pip install -e .              # 开发安装
    m-mkt 咖啡 上海               # 使用 CLI
    m-mkt --list-categories       # 列出品类
"""
from setuptools import setup, find_packages

setup(
    name="m-mkt",
    version="1.0.0",
    description="MealKey 餐饮市场机会分析引擎 — 专业判断结构",
    long_description=open("README.md", encoding="utf-8").read(),
    long_description_content_type="text/markdown",
    author="MealKey Team",
    url="https://github.com/mealkey/m-mkt",
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    python_requires=">=3.11",
    entry_points={
        "console_scripts": [
            "m-mkt=core.cli:main",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Programming Language :: Python :: 3.13",
        "Programming Language :: Python :: 3.14",
        "Topic :: Office/Business :: Financial :: Investment",
        "Intended Audience :: Science/Research",
    ],
    extras_require={
        "dev": [
            "pytest>=8",
            "pytest-cov>=4",
            "ruff>=0.3",
            "mypy>=1.8",
        ],
    },
)
