def generate_rr(players):
    n = len(players)
    working_players = list(players)
    if n % 2 != 0:
        working_players.append(None)
        n += 1
    num_rounds = n - 1
    all_rounds = []
    for r in range(num_rounds):
        round_pairings = []
        half = n // 2
        for i in range(half):
            p1 = working_players[i]
            p2 = working_players[n - 1 - i]
            if (i + r) % 2 == 0:
                pair = (p1, p2)
            else:
                pair = (p2, p1)
            round_pairings.append(pair)
        all_rounds.append(round_pairings)
        working_players = [working_players[0]] + [working_players[-1]] + working_players[1:-1]
        print(f"Round {r+1} done. Next state: {working_players}")
    return all_rounds

players = [f"p{i}" for i in range(1, 6)]
rs = generate_rr(players)
for i, r in enumerate(rs, 1):
    print(f"R{i}: {r}")
