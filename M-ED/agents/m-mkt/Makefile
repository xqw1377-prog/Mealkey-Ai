.PHONY: test lint clean install build check

# 默认目标
all: install lint test

# 安装依赖
install:
	pip install -e ".[dev]"

# 运行测试
test:
	python -m pytest tests/ -v

# 带覆盖率测试
test-cov:
	python -m pytest tests/ --cov=src --cov-report=term --cov-report=html

# 代码检查
lint:
	python -m ruff check src/ tests/

# 格式化代码
fmt:
	python -m ruff format src/ tests/

# 类型检查
typecheck:
	python -m mypy src/ --ignore-missing-imports

# 清理缓存
clean:
	rm -rf __pycache__/ .pytest_cache/ .ruff_cache/ .coverage htmlcov/
	rm -rf src/__pycache__/ src/core/__pycache__/ src/adapters/__pycache__/ src/utils/__pycache__/
	rm -rf tests/__pycache__/
	rm -rf *.egg-info/ build/ dist/

# 完整检查
check: lint test test-cov

# 构建
build: clean
	python -m build
