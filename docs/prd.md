产品需求文档 (PRD) - ZXPairing

文档版本

V2.2 (核心引擎锁定版)

产品名称

ZXPairing (智析国象编排系统)

核心战略

双端协同 + FIDE级算法内核

Slogan

Professional like FIDE, Simple like a Game.

1. 顶层战略视图 (Strategic View)

1.1 双端协同架构

📱 微信小程序: C端触达 / B端极速执行 (上课/录分)。

💻 PC Web端: B端重度管理 (批量导入/打印/大屏)。

1.2 核心技术壁垒 (Technical Moat) [重要]

本产品区别于市面上普通编排软件的核心，在于其内置了 FIDE (国际棋联) 认证级 的算法引擎。

Engine: bbpPairings (C++) - 负责处理复杂的瑞士制图论计算。

Wrapper: py4swiss (Python) - 负责数据清洗与桥接。

2. 核心功能模块 (Functional Requirements)

2.1 赛前筹备 (Preparation)

(保持 V2.1 内容不变：PC扫码登录、Excel智能粘贴、C端海报报名、隐私脱敏)

2.2 核心编排引擎 (The Engine) [核心修订]

F3. 智能赛制与算法内核

N ≤ 10 (循环赛):

算法: 采用 Berger Table (贝格尔表) 算法。

实现: Python 内部直接计算，无需调用外部引擎。

N > 10 (瑞士制):

算法: 严格遵循 FIDE Dutch System (C.04) 标准。

强制技术栈: 必须 调用 py4swiss 库接口，驱动底层的 bbpPairings 引擎进行计算。严禁前端自行编写简易配对逻辑。

参数控制: 支持 UI 配置 K 值、同分规则顺序 (Tie-Breaks)。

F4. 多角色协作 (RBAC)

(保持 V2.1 内容不变：主办方/裁判长/副裁判/志愿者)

F5. 编排风控与自检

合规性自检 (Sanity Check):

每次生成对阵后，Python 层需运行 py4swiss 的校验逻辑，确保无重复对局。

若发现违规: (如颜色三连)，需返回 Warning 标记，前端弹窗提示裁判长确认。

后悔药: 裁判长可点击 [重置本轮]，物理删除当前对阵，回滚状态。

2.3 赛中执行 (Execution)

(保持 V2.1 内容不变：AI拍照登分、现场大屏WebSocket同步、申诉纠错)

2.4 赛后输出 (Post-Match)

(保持 V2.1 内容不变：打印机友好导出、团体总分、Elo变动、战报分享)

3. 商业化与会员体系

(保持 V2.1 内容不变：免费版/专业版)

4. 技术实施标准 (Technical Standards) [核心修订]

4.1 核心算法架构规范

为了确保系统的专业性与稳定性，后端开发必须遵循以下架构：

层级

组件名称

职责描述

L1 业务层

Node.js (Koa)

处理用户鉴权、数据库读写、HTTP请求。

L2 胶水层

Python (FastAPI)

接收 JSON 数据，转换为 TRF (Tournament Report File) 格式字符串。

L3 接口层

py4swiss

Python 第三方库，负责加载和调用底层动态链接库。

L4 核心层

bbpPairings

(.so / .dll) 二进制文件。执行 FIDE Dutch 核心图论算法。

4.2 数据交互协议

输入 (Node -> Python): 完整的选手历史列表 (含 ID、积分、历史对手、历史执色)。

中间态: Python 将 JSON 转换为 FIDE 标准 TRF 字符串。

输出 (Python -> Node): 标准化 JSON 对阵表。

4.3 部署环境要求

由于 bbpPairings 是 C++ 编译的二进制文件，Docker 镜像必须基于 Linux (推荐 Ubuntu/Debian)，并预装必要的 C++ 运行时库 (libstdc++)，确保 .so 文件可被 Python 加载。

5. 验收标准 (Acceptance Criteria)

FIDE 一致性测试:

导入 FIDE 官方提供的 50 个标准测试用例 (TRF文件)。

系统的输出结果必须与 JaVaFo 或 Swiss Manager 的运行结果逻辑一致（允许同分随机性，但绝不可违反 C.04 规则）。

死锁熔断:

模拟 1000 人瑞士制编排。如果 bbpPairings 运算超过 3 秒，系统需自动降级为备用算法并报警，不能让前端转圈卡死。

环境兼容性:

确保 Docker 容器在云服务器上能成功加载 bbpPairings.so，无 segmentation fault 错误。