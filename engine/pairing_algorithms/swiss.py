from typing import List, Any
import logging

try:
    import py4swiss
except ImportError:
    py4swiss = None

logger = logging.getLogger(__name__)

class SwissScheduler:
    @staticmethod
    def _to_trf(players: List[Any], round_num: int) -> str:
        """
        按严格的 py4swiss/FIDE 格式生成 TRF。
        """
        trf_lines = []
        trf_lines.append(f"012 ZXPairing Tournament")
        trf_lines.append(f"042 {round_num}")
        
        # 补全 X-Section 信息 (py4swiss 强制要求)
        trf_lines.append(f"XXR 7")          # 总轮次
        trf_lines.append(f"XXC white1")     # 默认配置
        
        for idx, player in enumerate(players, 1):
            # 创建一个至少 91 字符的空行
            base_line = list(" " * 120)
            base_line[0:3] = "001"
            
            # 4: STARTING_NUMBER (4位)
            num_str = str(idx).rjust(4)
            base_line[4:8] = num_str
            
            # 14: NAME (34位)
            name = (player.name or f"P{player.id}")[:33]
            base_line[14:14+len(name)] = name
            
            # 48: FIDE_RATING (4位)
            rating = str(player.rating or 0).rjust(4)
            base_line[48:52] = rating
            
            # 80: POINTS (4位, 通常是 ppp.p 格式，但 py4swiss 解析为 decimal)
            points = f"{float(player.score):>4.1f}"
            base_line[80:84] = points
            
            # 85: RANK (4位)
            rank = str(player.rank or idx).rjust(4)
            base_line[85:89] = rank
            
            # 91: RESULTS (每轮对局 10 字符: "  SSSS C R")
            # 这里的具体格式 py4swiss 依赖 RoundResult.from_string
            line_str = "".join(base_line[:91])
            
            history_str = ""
            for h in player.history:
                opp_id = h.get("opponent")
                color = h.get("color", "w").lower()[:1]
                if color not in ['w', 'b']: color = '-'
                
                result_val = h.get("result", 0.5)
                res_char = "1" if result_val == 1.0 else ("0" if result_val == 0.0 else "=")
                
                opp_num = 0
                if opp_id:
                    for s_idx, p in enumerate(players, 1):
                        if p.id == opp_id:
                            opp_num = s_idx
                            break
                
                # 每组 10 字符: RoundResult.CONTENT_LENGTH (8) + RoundResult.BUFFER_LENGTH (2)
                # py4swiss 的解析器似乎期望内容在缓冲之前，或者干脆是固定偏移量
                id_str = str(opp_num).rjust(4) if opp_num > 0 else "0000"
                res_part = f"{id_str} {color} {res_char}" # 8 chars
                history_str += res_part + "  " # total 10 chars
            
            trf_lines.append(line_str + history_str)
            
        content = "\n".join(trf_lines)
        return content

    @staticmethod
    def pair_round(players: List[Any], round_num: int):
        """
        使用 py4swiss (包含 FIDE Dutch 算法实现) 生成对阵。
        注意：py4swiss 0.3.1+ 已经是独立实现，不再需要外部 bbpPairings 二进制文件。
        """
        if not py4swiss:
            logger.error("py4swiss 库未安装。")
            return []

        try:
            from py4swiss.engines import DutchEngine
            from py4swiss.trf import TrfParser
            import tempfile
            from pathlib import Path

            # 1. 转换为 TRF 格式字符串
            trf_content = SwissScheduler._to_trf(players, round_num)
            
            # 2. 使用临时文件供 py4swiss 解析
            # 因为 py4swiss 的 TrfParser.parse 内部调用了 .open() 方法，需要传入路径对象
            with tempfile.NamedTemporaryFile(mode='w', suffix='.trf', delete=False) as tf:
                tf.write(trf_content)
                temp_path = tf.name
            
            try:
                trf_data = TrfParser.parse(Path(temp_path))
            finally:
                # 确保临时文件被删除
                import os
                if os.path.exists(temp_path):
                    os.remove(temp_path)

            # 3. 调用 Dutch 引擎生成对阵
            pairings_raw = DutchEngine.generate_pairings(trf_data)
            
            # 4. 解析结果并返回
            formatted_pairings = []
            for p in pairings_raw:
                # p 是 Pairing 对象，包含 white (序号) 和 black (序号)
                # 注意：py4swiss 返回的是 1-based 序号
                w_num = p.white
                b_num = p.black
                
                white_id = players[w_num - 1].id if w_num > 0 else None
                black_id = players[b_num - 1].id if b_num > 0 else None
                
                if white_id:
                    formatted_pairings.append({
                        "white": white_id,
                        "black": black_id
                    })
            
            return formatted_pairings

        except Exception as e:
            logger.error(f"Swiss 对阵生成失败: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return []
