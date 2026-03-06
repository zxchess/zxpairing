from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
from pairing_algorithms.round_robin import RoundRobinScheduler
from pairing_algorithms.swiss import SwissScheduler

app = FastAPI(title="ZXPairing Engine", version="0.1.0")

class Player(BaseModel):
    id: str
    name: Optional[str] = ""
    rating: Optional[int] = 0
    score: float = 0.0
    # 历史记录：'W' 代表执白，'B' 代表执黑，'0' 代表轮空，对手 ID 为字符串
    # 格式示例: [{"opponent": "p2", "color": "W", "result": 1.0}, ...]
    history: List[dict] = []
    rank: Optional[int] = 0

class PairRequest(BaseModel):
    system: str  # 'round_robin' or 'swiss'
    players: List[Player]  # 瑞士制需要完整的选手数据
    round_num: int = 1

class PairingResult(BaseModel):
    white: str  # 选手 ID
    black: Optional[str] = None  # 选手 ID，如果是 None 则代表轮空 (BYE)

class PairingResponse(BaseModel):
    round: int
    pairings: List[PairingResult]

@app.get("/")
def read_root():
    return {"status": "online", "version": "0.1.0"}

@app.post("/pair", response_model=List[PairingResponse])
def generate_pairings(req: PairRequest):
    if req.system == 'round_robin':
        # 循环赛：支持单轮或全表生成
        player_ids = [p.id for p in req.players]
        # 如果 round_num > 0，则视为单轮模式（1-indexed）
        target = req.round_num if req.round_num > 0 else None
        all_rounds = RoundRobinScheduler.generate_pairings(player_ids, target_round=target)
        
        response = []
        # 注意：如果是单轮模式，all_rounds 长度为 1
        # 我们需要根据实际情况对齐 round 编号
        for idx, round_pairs in enumerate(all_rounds):
            actual_round_num = target if target else idx + 1
            pairs_formatted = [{"white": w, "black": b} for w, b in round_pairs]
            response.append(PairingResponse(round=actual_round_num, pairings=pairs_formatted))
            
        return response
        
    elif req.system == 'swiss':
        # 瑞士制：一次只编排一轮
        # 即使底层支持多轮，通常 FIDE 比赛也是一轮一轮编排的
        pairings = SwissScheduler.pair_round(req.players, req.round_num)
        
        if not pairings:
            raise HTTPException(status_code=500, detail="Failed to generate Swiss pairings")
            
        return [PairingResponse(round=req.round_num, pairings=pairings)]
    
    else:
        raise HTTPException(status_code=400, detail="Unknown system type")
