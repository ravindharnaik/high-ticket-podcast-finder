import requests
import json

# Test the real API endpoint (no fallback)
url = "http://localhost:8000/api/search"
headers = {"Content-Type": "application/json"}
data = {
    "keywords": ["business podcast"],
    "regions": ["US"],
    "min_subscribers": 10000,
    "max_subscribers": 1000000,
    "max_days_since_upload": 30
}

try:
    response = requests.post(url, headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        channels = result['data']
        print(f"Total channels found: {len(channels)}")
        print("Sample channels:")
        for ch in channels[:2]:
            print(f"- {ch['title']} (ID: {ch['id']})")
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"Error: {e}")
