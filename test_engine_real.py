import json
import requests

# 引擎服务的 URL (假设已启动 uv run uvicorn main:app)
URL = "http://127.0.0.1:8000/pair"

def run_test():
    # 模拟 8 名选手的真实状态
    # 场景：第 2 轮对阵生成 (第 1 轮结果已录入)
    test_data = {
        "system": "swiss",
        "round_num": 2,
        "players": [
            {
                "id": "p1", "name": "Carlsen", "rating": 2850, "score": 1.0,
                "history": [{"opponent": "p8", "color": "W", "result": 1.0}]
            },
            {
                "id": "p2", "name": "Caruana", "rating": 2800, "score": 1.0,
                "history": [{"opponent": "p7", "color": "B", "result": 1.0}]
            },
            {
                "id": "p3", "name": "Ding Liren", "rating": 2790, "score": 0.5,
                "history": [{"opponent": "p6", "color": "W", "result": 0.5}]
            },
            {
                "id": "p4", "name": "Hikaru", "rating": 2780, "score": 0.5,
                "history": [{"opponent": "p5", "color": "B", "result": 0.5}]
            },
            {
                "id": "p5", "name": "Alireza", "rating": 2770, "score": 0.5,
                "history": [{"opponent": "p4", "color": "W", "result": 0.5}]
            },
            {
                "id": "p6", "name": "Wesley So", "rating": 2760, "score": 0.5,
                "history": [{"opponent": "p3", "color": "B", "result": 0.5}]
            },
            {
                "id": "p7", "name": "Anish Giri", "rating": 2750, "score": 0.0,
                "history": [{"opponent": "p2", "color": "W", "result": 0.0}]
            },
            {
                "id": "p8", "name": "Vidit", "rating": 2740, "score": 0.0,
                "history": [{"opponent": "p1", "color": "B", "result": 0.0}]
            }
        ]
    }

    print(f"正在发送第 {test_data['round_num']} 轮对阵请求...")
    try:
        response = requests.post(URL, json=test_data)
        if response.status_code == 200:
            result = response.json()
            print("\n✅ 对阵生成成功！")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
            # 简单验证逻辑
            pairings = result[0]['pairings']
            print("\n建议对阵预览:")
            for i, p in enumerate(pairings, 1):
                white = next(pl['name'] for pl in test_data['players'] if pl['id'] == p['white'])
                black_id = p['black']
                black = next(pl['name'] for pl in test_data['players'] if pl['id'] == black_id) if black_id else "BYE (轮空)"
                print(f"台次 {i}: {white} (白) vs {black} (黑)")
        else:
            print(f"❌ 请求失败: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ 发生异常: {e}")
        print("提示：请确保引擎服务已启动并在 8000 端口运行。")

if __name__ == "__main__":
    run_test()
