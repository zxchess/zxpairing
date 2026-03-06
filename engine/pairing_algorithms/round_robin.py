from typing import List, Tuple, Optional

class RoundRobinScheduler:
    @staticmethod
    def generate_pairings(players: List[str], target_round: Optional[int] = None) -> List[List[Tuple[str, Optional[str]]]]:
        """
        使用标准圆圈法 (Circle Method/Berger Table) 生成循环赛对阵。
        
        Args:
            players: 选手 ID 列表。
            target_round: 可选，如果指定则只计算并返回该轮次的对阵（1-indexed）。
        """
        n = len(players)
        if n < 2:
            return []

        # 奇数人数处理：添加轮空 (None)
        working_players = list(players)
        has_bye = n % 2 != 0
        if has_bye:
            working_players.append(None)
            n += 1

        num_rounds = n - 1
        all_rounds = []

        # 核心算法：固定首位选手，旋转其余选手
        # 初始序列: [P1, P2, P3, ..., Pn]
        # 第一轮对阵: (P1, Pn), (P2, Pn-1), (P3, Pn-2) ...
        for r in range(num_rounds):
            # 如果指定了 target_round，且当前不是该轮，则跳过计算以节省性能（虽然这里量级很小）
            if target_round is not None and r + 1 != target_round:
                # 仍需执行旋转逻辑以保持状态同步，除非我们直接计算偏移
                # 这里简单起见还是跑完旋转流程
                pass
            
            round_pairings = []
            half = n // 2
            
            for i in range(half):
                p1 = working_players[i]
                p2 = working_players[n - 1 - i]
                
                # 颜色平衡逻辑:
                # 1. 每一对对阵，在不同轮次中颜色应该交替。
                # 2. 这里的实现：在偶数台次和奇数台次交替，且随轮次翻转。
                if (i + r) % 2 == 0:
                    pair = (p1, p2)
                else:
                    pair = (p2, p1)
                
                # 特殊处理：如果是与 None 对阵，则代表轮空，放在最后
                if pair[0] is None or pair[1] is None:
                    # 轮空的选手实际上该轮没有对手，我们约定 black=None 为轮空
                    # 确保 None 始终在 black 位置
                    actual_p = pair[0] if pair[1] is None else pair[1]
                    round_pairings.append((actual_p, None))
                else:
                    round_pairings.append(pair)

            all_rounds.append(round_pairings)

            # 旋转选手 (固定第一个，其余顺时针移位)
            # [1, 2, 3, 4] -> [1, 4, 2, 3]
            working_players = [working_players[0]] + [working_players[-1]] + working_players[1:-1]

        if target_round is not None:
            if 1 <= target_round <= len(all_rounds):
                return [all_rounds[target_round - 1]]
            else:
                return []
                
        return all_rounds
