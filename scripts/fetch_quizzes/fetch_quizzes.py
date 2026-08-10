import requests
import json
import time
import os
import urllib.parse
from dotenv import load_dotenv

load_dotenv()

API_URL = "https://quizfinder.com.au/wp-json/wp/v2/event"
REGION_ID = 13 # Western Australia
DAYS = {
    61: "Monday",
    62: "Tuesday",
    63: "Wednesday",
    64: "Thursday",
    65: "Friday",
    66: "Saturday",
    67: "Sunday"
}

GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")

def fetch_all_events():
    events = []
    page = 1
    while True:
        print(f"Fetching page {page}...")
        params = {
            "regions": REGION_ID,
            "per_page": 100,
            "page": page
        }
        response = requests.get(API_URL, params=params)
        if response.status_code != 200:
            if response.status_code == 400: # usually means past last page
                break
            print(f"Error fetching data: {response.status_code}")
            break
        
        data = response.json()
        if not data:
            break
            
        events.extend(data)
        if len(data) < 100:
            break
        page += 1
        
    return events

def geocode_address_google(address):
    if not GOOGLE_MAPS_API_KEY:
        return None, None
        
    # Google Maps Geocoding API excels with full addresses, including unit numbers, 
    # shopping centres, and intersections. We'll pass it exactly as received.
    endpoint = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address": address,
        "key": GOOGLE_MAPS_API_KEY
    }
    
    print(f"Geocoding with Google Maps: {address}")
    try:
        res = requests.get(endpoint, params=params)
        if res.status_code == 200:
            data = res.json()
            if data['status'] == 'OK' and len(data['results']) > 0:
                location = data['results'][0]['geometry']['location']
                return float(location['lat']), float(location['lng'])
            else:
                print(f"Google Maps could not find {address}: {data['status']}")
        else:
            print(f"API Error {res.status_code} for {address}")
    except Exception as e:
        print(f"Error geocoding {address}: {e}")
        
    return None, None

def main():
    if not GOOGLE_MAPS_API_KEY:
        print("ERROR: GOOGLE_MAPS_API_KEY environment variable is not set.")
        print("Please set it in your terminal or inside a .env file.")
        return

    print("Fetching events from QuizFinder API...")
    raw_events = fetch_all_events()
    print(f"Fetched {len(raw_events)} events.")
    
    quizzes = []
    address_cache = {}
    
    for event in raw_events:
        title = event.get('title', {}).get('rendered', '')
        
        days_arr = event.get('days-of-week', [])
        day_name = "Unknown"
        if days_arr and len(days_arr) > 0:
            day_name = DAYS.get(days_arr[0], "Unknown")
            
        meta = event.get('meta', {})
        address = meta.get('address', '')
        start_time = meta.get('start-time', '')
        link = event.get('link', '')
        
        # HTML entity decoding for title just in case
        title = title.replace('&#038;', '&').replace('&#8217;', "'").replace('&#8211;', '-')
        
        quiz_obj = {
            "title": title,
            "day": day_name,
            "address": address,
            "time": start_time,
            "link": link,
            "lat": None,
            "lon": None
        }
        
        if address:
            if address not in address_cache:
                lat, lon = geocode_address_google(address)
                address_cache[address] = (lat, lon)
            else:
                lat, lon = address_cache[address]
                
            quiz_obj["lat"] = lat
            quiz_obj["lon"] = lon
            
        quizzes.append(quiz_obj)
        
    failed = [q for q in quizzes if q['lat'] is None]
    print(f"Successfully geocoded {len(quizzes) - len(failed)} out of {len(quizzes)} quizzes.")
    if failed:
        print(f"Failed to geocode {len(failed)} addresses. Examples:")
        for f in failed[:5]:
            print(f" - {f['title']}: {f['address']}")
            
    # Ensure data directory exists
    output_path = '../../site/quizzes/data/quizzes.json'
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(quizzes, f, indent=2)
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    main()
