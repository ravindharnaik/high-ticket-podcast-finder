import requests
import json

# Test the real YouTube API endpoint
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
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
