# Convenience wrapper for bun run commands.
# See package.json for the authoritative script definitions.
# Purpose: Provide familiar 'make' interface for developers

.PHONY: all build build-bin dev start start-bin clean test test-coverage \
        format lint fix install watch ci help

.DEFAULT_GOAL := all

all: build

build: install
	bun run build

build-bin: install
	bun run build:bin

dev: install
	bun run dev

watch:
	bun run watch

start: build
	bun run start

start-bin: build-bin
	bun run start:bin

clean:
	rm -rf dist/ prism-node

test: build
	bun run test:run

test-coverage: build
	bun run test:coverage

ci: install build
	bun run check:ci && bun run test:coverage

format: install
	bun run format

lint: install
	bun run lint:check

fix: install
	bun run fix

install:
	bun install

help:
	@echo "可用目标:"
	@echo "  all          - 构建 (默认)"
	@echo "  build        - TypeScript 编译"
	@echo "  build-bin    - 构建独立二进制"
	@echo "  dev          - 开发模式运行"
	@echo "  watch        - 监听模式编译"
	@echo "  start        - 运行编译后程序"
	@echo "  start-bin    - 运行二进制程序"
	@echo "  clean        - 清理构建产物"
	@echo "  test         - 运行测试"
	@echo "  test-coverage- 测试覆盖率"
	@echo "  ci           - CI 完整检查"
	@echo "  format       - 格式化代码"
	@echo "  lint         - Lint 检查"
	@echo "  fix          - 自动修复代码问题"
	@echo "  install      - 安装依赖"
	@echo "  help         - 显示此帮助"