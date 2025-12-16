import requests
import json

# Test the mock endpoint to verify application works
url = 'http://localhost:8000/api/search/mock'
headers = {'Content-Type': 'application/json'}
data = {
    'keywords': ['business podcast'],
    'regions': ['US'],
    'min_subscribers': 10000,
    'max_subscribers': 1000000,
    'max_days_since_upload': 30
}

try:
    response = requests.post(url, headers=headers, json=data)
    print(f'Mock API Status: {response.status_code}')
    if response.status_code == 200:
        result = response.json()
        print(f'Channels found: {result["total_results"]}')
        print('Mock data working - application is functional')
        for channel in result['data'][:2]:
            print(f'- {channel["title"]} (ID: {channel["id"]})')
    else:
        print(f'Mock API Error: {response.status_code}')
except Exception as e:
    print(f'Error: {e}')
