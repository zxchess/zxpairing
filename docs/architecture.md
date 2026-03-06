ZXPairing - 架构设计与数据规范

1. 技术栈选型 (Tech Stack)

模块

选型

理由

小程序

Uni-app (Vue3)

一套代码可发布 H5/小程序/App，开发效率高。

PC Web

Vue 3 + Element Plus

适合做管理后台，大屏展示组件丰富。

业务后端

Node.js (Koa/NestJS)

处理高并发 IO (报名、查分)，生态好对接微信。

计算微服务

Python (FastAPI)

胶水层 - 负责 JSON <-> TRF 格式转换，调用 py4swiss。

数据库

MongoDB

比赛数据结构极其灵活 (每轮对阵都不一样)，Postgres JSONB 完美契合。

1.1 核心算法架构 (4-Layer Architecture)
*   **L1 业务层 (Node.js)**: 处理 HTTP 请求、鉴权、数据库读写。
*   **L2 胶水层 (Python)**: 数据清洗，将 JSON 对象转换为 TRF (Tournament Report File) 字符串。
*   **L3 接口层 (py4swiss)**: Python 包装库，负责加载动态链接库。
*   **L4 核心层 (bbpPairings)**: C++ 编译的二进制文件 (.so/.dll)，执行 FIDE 标准图论算法。

2. 核心数据模型 (Database Schema)

2.1 用户 (User) - 统一身份认证

{
  "_id": "u_10001", // 内部统一 UserID
  "union_id": "oYN4_5...", // 微信开放平台唯一ID (跨小程序/Web)
  "wx_mp_openid": "oE8u_4...", // 小程序 OpenID
  "wx_web_openid": "oA9d_3...", // 网页端 OpenID
  "nickname": "ChessMaster",
  "avatar": "https://...",
  "created_at": "2024-01-01T12:00:00Z"
}

2.2 赛事 (Tournament)

{
  "_id": "t_2024_spring_001",
  "owner_uid": "wx_user_123", // 主办方OpenID
  "name": "2024春季晋级赛",
  "status": "ongoing", // created, ongoing, finished
  "mode": "official", // instant(极速), league(联赛), official(正式)
  "config": {
    "fide_calc": true, // 是否计算等级分
    "k_factor": 40,
    "tie_breaks": ["direct", "buchholz_cut1", "wins"] // 破同分规则顺序
  },
  "roles": [ // RBAC 权限表
    { "uid": "u_10001", "role": "chief", "group_access": ["all"] },
    { "uid": "u_10002", "role": "volunteer", "group_access": ["g_u8"] }
  ]
}


2.5 数据一致性策略 (Data Consistency)

为确保积分绝对准确，严禁增量更新。

*   **原则**：`Player` 表中的 `score`, `rating_live`, `opponents`, `color_history` 均为**衍生数据**。
*   **写入流程**：
    1.  裁判录入/修改成绩 -> 更新 `Pairing` 表。
    2.  **触发重算 (Trigger)**：后端自动拉取该 `Category` 下**所有轮次**的 `Pairing` 数据。
    3.  **内存计算**：在内存中重演每一轮对局，从 0 开始重新计算每位选手的当前积分、对手列表、执色历史。
    4.  **原子写入**：将重算后的最新状态批量回写至 `Player` 表。
*   **适用性**：由于单组别通常 < 200 人，全量重算耗时 < 50ms，完全可接受。

这是编排的最小单位

{
  "_id": "g_u8",
  "tournament_id": "t_2024_spring_001",
  "name": "U8组",
  "system": "swiss", // swiss 或 round_robin
  "rounds_total": 7,
  "current_round": 3,
  "players": ["p_001", "p_002", ...] // 关联的选手ID
}


2.3 选手 (Player)

{
  "_id": "p_001",
  "group_id": "g_u8",
  "name": "张三",
  "rating_start": 1500, // 初始分
  "rating_live": 1504.2, // 实时分
  "score": 2.5, // 当前积分
  "opponents": ["p_008", "p_005"], // 遇到过的对手 (防重复)
  "color_history": ["W", "B", "W"], // 执色历史 (防三连色)
  "club": "星火棋院" // 用于同单位避让
}


2.4 对阵表 (Pairing)

{
  "group_id": "g_u8",
  "round": 3,
  "table_no": 1,
  "white_player_id": "p_001",
  "black_player_id": "p_005",
  "result": "1-0", // 1-0, 0-1, 1/2, +:- (弃权胜), -:+ (弃权负)
  "is_manual": false // 是否人工干预过
}


3. 核心 API 规范 (Internal API)

3.1 编排计算 (Node -> Python)

Endpoint: POST /engine/pair
Request:

{
  "system": "swiss",
  "players": [
    { "id": "p_001", "score": 1.0, "colors": ["W"], "opponents": ["p_002"] },
    { "id": "p_002", "score": 0.0, "colors": ["B"], "opponents": ["p_001"] },
    ...
  ],
  "avoid_club": true // 是否同单位避让
}
// Python 内部会将此 JSON 转换为 TRF 格式字符串传给 py4swiss


Response:

{
  "status": "success",
  "pairings": [
    { "white": "p_001", "black": "p_003" },
    { "white": "p_002", "black": "bye" } // 轮空
  ]
}


3.2 校验 (Node -> Python)

Endpoint: POST /engine/validate
用途： 裁判手动拖拽修改后，检查是否合规。
Response:

{
  "valid": false,
  "errors": ["p_001 重复对局"],
  "warnings": ["p_003 连续3次黑棋"]
}
