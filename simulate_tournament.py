import json
import requests
import random
import time

URL = "http://127.0.0.1:8000/pair"

# 选手初始名单 (20人)
players = [
    {"id": f"p{i}", "name": f"GrandMaster_{i}", "rating": 2800 - i*10, "score": 0.0, "history": [], "rank": i}
    for i in range(1, 21)
]

def simulate_round(round_num):
    print(f"\n--- 第 {round_num} 轮对阵生成中 ---")
    
    payload = {
        "system": "swiss",
        "round_num": round_num,
        "players": players
    }
    
    try:
        response = requests.post(URL, json=payload, timeout=10)
        if response.status_code != 200:
            print(f"Error: {response.text}")
            return False
            
        round_pairings = response.json()[0]['pairings']
        
        print(f"本轮对局:")
        for i, p in enumerate(round_pairings, 1):
            w_player = next(pl for pl in players if pl['id'] == p['white'])
            b_player = next(pl for pl in players if pl['id'] == p['black']) if p['black'] else None
            
            if b_player:
                print(f"  台次 {i}: {w_player['name']} ({w_player['score']}) vs {b_player['name']} ({b_player['score']})")
                
                # 模拟结果: 40% 白胜, 40% 黑胜, 20% 平局 (简化模型)
                res = random.random()
                if res < 0.4: # 白胜
                    w_res, b_res = 1.0, 0.0
                elif res < 0.8: # 黑胜
                    w_res, b_res = 0.0, 1.0
                else: # 平
                    w_res, b_res = 0.5, 0.5
                
                # 更新历史和分数
                w_player['score'] += w_res
                w_player['history'].append({"opponent": b_player['id'], "color": "W", "result": w_res})
                
                b_player['score'] += b_res
                b_player['history'].append({"opponent": w_player['id'], "color": "B", "result": b_res})
            else:
                print(f"  台次 {i}: {w_player['name']} ({w_player['score']}) BYE")
                w_player['score'] += 1.0
                w_player['history'].append({"opponent": None, "color": "-", "result": 1.0})
                
        return True
    except Exception as e:
        print(f"Exception: {e}")
        return False

def print_standings():
    print("\n--- 当前排名 ---")
    sorted_players = sorted(players, key=lambda x: (x['score'], x['rating']), reverse=True)
    for i, p in enumerate(sorted_players, 1):
        print(f"{i}. {p['name']} - 积分: {p['score']} (等级分: {p['rating']})")

if __name__ == "__main__":
    for r in range(1, 8):
        if not simulate_round(r):
            break
        print_standings()
        time.sleep(1) # 稍作停顿方便观察日志
    
    # 最终输出一个详细的数据包
    with open("tournament_history.json", "w") as f:
        json.dump(players, f, indent=2)
    print("\n模拟完成！记录已保存至 tournament_history.json")
