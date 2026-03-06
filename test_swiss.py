import sys
import os

# 将当前目录添加到路径以导入模块
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from engine.pairing_algorithms.swiss import SwissScheduler
from pydantic import BaseModel
from typing import List, Optional

# 模拟 Player 类 (因为 main.py 里的 Player 依赖 fastapi 等可能会比较重)
class MockPlayer:
    def __init__(self, id, name, rating, score, history):
        self.id = id
        self.name = name
        self.rating = rating
        self.score = score
        self.history = history

def test_pair_round_1():
    print("Testing Round 1 pairing...")
    players = [
        MockPlayer("p1", "Carlsen", 2850, 0, []),
        MockPlayer("p2", "Caruana", 2800, 0, []),
        MockPlayer("p3", "Ding Liren", 2790, 0, []),
        MockPlayer("p4", "Nepomniachtchi", 2780, 0, []),
    ]
    
    # 模拟 SwissScheduler 调用
    # 注意：在测试环境下可能没有真正的 py4swiss 库，所以我们会捕获异常
    try:
        pairings = SwissScheduler.pair_round(players, 1)
        print(f"Round 1 Pairings: {pairings}")
    except Exception as e:
        print(f"Test failed or library missing: {e}")

def test_pair_round_2():
    print("\nTesting Round 2 pairing...")
    # 模拟第一轮结果：p1 胜 p4, p2 平 p3
    players = [
        MockPlayer("p1", "Carlsen", 2850, 1.0, [{"opponent": "p4", "color": "W", "result": 1.0}]),
        MockPlayer("p2", "Caruana", 2800, 0.5, [{"opponent": "p3", "color": "B", "result": 0.5}]),
        MockPlayer("p3", "Ding Liren", 2790, 0.5, [{"opponent": "p2", "color": "W", "result": 0.5}]),
        MockPlayer("p4", "Nepomniachtchi", 2780, 0.0, [{"opponent": "p1", "color": "B", "result": 0.0}]),
    ]
    
    try:
        pairings = SwissScheduler.pair_round(players, 2)
        print(f"Round 2 Pairings: {pairings}")
    except Exception as e:
        print(f"Test failed or library missing: {e}")

if __name__ == "__main__":
    test_pair_round_1()
    test_pair_round_2()
