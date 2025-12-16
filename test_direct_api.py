import requests

# Test NEW YouTube API key directly
api_key = 'AIzaSyDQBUIiNvRVoKEjK4RiDQbWFPyN5yxM_-Y'
url = f'https://www.googleapis.com/youtube/v3/search?part=snippet&q=business+podcast&type=channel&maxResults=5&key={api_key}'

try:
    response = requests.get(url)
    print(f'Direct API Status: {response.status_code}')
    if response.status_code == 200:
        data = response.json()
        print(f'Items found: {len(data.get("items", []))}')
        if data.get('items'):
            print('Sample channel:')
            item = data['items'][0]
            print(f'- Title: {item["snippet"]["title"]}')
            print(f'- Channel ID: {item["snippet"]["channelId"]}')
    else:
        print(f'Error: {response.status_code}')
        print(response.text)
except Exception as e:
    print(f'Error: {e}')
