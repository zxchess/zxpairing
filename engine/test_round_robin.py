import requests
import json

URL = "http://127.0.0.1:8000/pair"

def test_round_robin_full():
    print("--- 测试 4 人循环赛（全表生成） ---")
    payload = {
        "system": "round_robin",
        "players": [
            {"id": "p1"}, {"id": "p2"}, {"id": "p3"}, {"id": "p4"}
        ],
        "round_num": 0 # 0 表示全表
    }
    response = requests.post(URL, json=payload)
    if response.status_code == 200:
        data = response.json()
        print(f"总轮数: {len(data)}")
        for r in data:
            print(f"轮次 {r['round']}: {r['pairings']}")
    else:
        print(f"失败: {response.text}")

def test_round_robin_single():
    print("\n--- 测试 5 人循环赛（单轮生成 & 轮空校验） ---")
    players = [{"id": f"p{i}"} for i in range(1, 6)]
    
    # 获取第 1 轮
    payload = {
        "system": "round_robin",
        "players": players,
        "round_num": 1
    }
    response = requests.post(URL, json=payload)
    if response.status_code == 200:
        print(f"轮次 1 对阵: {response.json()[0]['pairings']}")
    
    # 获取第 5 轮 (5人循环赛总共 5 轮)
    payload["round_num"] = 5
    response = requests.post(URL, json=payload)
    if response.status_code == 200:
        print(f"轮次 5 对阵: {response.json()[0]['pairings']}")

if __name__ == "__main__":
    test_round_robin_full()
    test_round_robin_single()
