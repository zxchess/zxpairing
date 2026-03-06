import requests
import json

GATEWAY_URL = "http://localhost:3001/api/pair"

def test_proxy():
    print("Testing Gateway Proxy (Node.js :3001 -> Python :8000)...")
    
    # Test Payload (Swiss System)
    payload = {
        "system": "swiss",
        "round_num": 1,
        "players": [
            {"id": "p1", "rating": 2800},
            {"id": "p2", "rating": 2700},
            {"id": "p3", "rating": 2600},
            {"id": "p4", "rating": 2500}
        ]
    }
    
    try:
        response = requests.post(GATEWAY_URL, json=payload, timeout=5)
        if response.status_code == 200:
            print("✅ Success! Response from Python Engine via Gateway:")
            print(json.dumps(response.json(), indent=2, ensure_ascii=False))
        else:
            print(f"❌ Failed. Status: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    test_proxy()
