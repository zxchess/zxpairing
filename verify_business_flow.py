import requests
import json
import time

BASE_URL = "http://localhost:3001/api"

def run_test():
    print("🚀 Starting End-to-End Business Flow Test...")
    
    # 1. Create Tournament
    print("\n1. Creating Tournament...")
    res = requests.post(f"{BASE_URL}/tournaments", json={
        "name": "Node.js Integration Cup",
        "system": "swiss"
    })
    if res.status_code != 200:
        print(f"❌ Create failed: {res.text}")
        return
    
    trn = res.json()
    trn_id = trn['id']
    print(f"✅ Tournament Created: ID={trn_id}, Name={trn['name']}")
    
    # 2. Add Players
    print("\n2. Adding 6 Players...")
    players_data = [
        {"name": "Alice", "rating": 2000},
        {"name": "Bob", "rating": 1900},
        {"name": "Charlie", "rating": 1800},
        {"name": "David", "rating": 1700},
        {"name": "Eve", "rating": 1600},
        {"name": "Frank", "rating": 1500}
    ]
    res = requests.post(f"{BASE_URL}/tournaments/{trn_id}/players", json={"players": players_data})
    if res.status_code != 200:
        print(f"❌ Add Players failed: {res.text}")
        return
    print(f"✅ Players Added: {len(res.json())}")
    
    # 3. Generate Pairings (Round 1)
    print("\n3. Generating Round 1 Pairings...")
    try:
        res = requests.post(f"{BASE_URL}/tournaments/{trn_id}/pair", timeout=10)
        if res.status_code != 200:
            print(f"❌ Pair failed: {res.text}")
            return
        
        pair_data = res.json()
        print(f"✅ Pairing Generated! Round ID: {pair_data['roundId']}")
        print("   Matches:")
        for m in pair_data['matches']:
            print(f"     - White: {m['white']} vs Black: {m['black']}")
            
    except Exception as e:
        print(f"❌ Exception during pairing: {e}")
        return

    # 4. Verify Persistence
    print("\n4. Verifying Persistence (Get Tournament Details)...")
    res = requests.get(f"{BASE_URL}/tournaments/{trn_id}")
    details = res.json()
    
    if details['currentRound'] == 1 and len(details['rounds']) > 0:
        print(f"✅ Persistence Verified! Current Round: {details['currentRound']}")
        matches_count = len(details['rounds'][0]['matches'])
        print(f"   Matches in DB: {matches_count}")
    else:
        print(f"❌ Persistence Check Failed: {json.dumps(details, indent=2)}")

if __name__ == "__main__":
    run_test()
