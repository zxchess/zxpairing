# 智析编排 - 核心计算引擎

智析国象编排系统的核心 Python 服务，负责瑞士制（Swiss）和循环赛（Round Robin）的对阵生成。

## 快速开始

本项目推荐使用 [uv](https://github.com/astral-sh/uv) 进行依赖管理和启动。

### 1. 安装 Python 3.12 (推荐)
```bash
uv python install 3.12
```

### 2. 初始化项目与虚拟环境
```bash
uv init
uv venv --python 3.12
source .venv/bin/activate
```

### 3. 安装依赖
```bash
uv pip install -r requirements.txt
```

### 3. 启动服务
```bash
uv run uvicorn main:app --reload
```

## 技术架构
- **框架**: FastAPI
- **瑞士制对阵**: py4swiss + bbpPairings
- **循环赛对阵**: Berger Table (内置实现)

## 环境要求
- **Python**: 3.10+ (py4swiss 运行需要)
- **核心引擎**: bbpPairings 二进制文件。
    - 请确保已安装 `libstdc++`。
    - 从 [GitHub Releases](https://github.com/BieremaBoyzProgramming/bbpPairings/releases) 获取二进制文件并放入系统路径或当前目录。
