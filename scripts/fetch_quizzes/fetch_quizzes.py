import requests
import json
import time
import os
import re

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

def geocode_address(address):
    # Nominatim requires a user agent
    headers = {
        "User-Agent": "QuizFinderMap/1.0 (contact: personal@etienneunai.com)"
    }
    # Clean the address up slightly if needed
    clean_address = address.split(', Australia')[0]
    
    params = {
        "q": clean_address,
        "format": "json",
        "limit": 1
    }
    
    print(f"Geocoding: {clean_address}")
    try:
        res = requests.get("https://nominatim.openstreetmap.org/search", params=params, headers=headers)
        if res.status_code == 200:
            data = res.json()
            if data and len(data) > 0:
                return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        print(f"Error geocoding {address}: {e}")
        
    return None, None

def main():
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
                lat, lon = geocode_address(address)
                address_cache[address] = (lat, lon)
                time.sleep(1.1) # Be nice to Nominatim API
            else:
                lat, lon = address_cache[address]
                
            quiz_obj["lat"] = lat
            quiz_obj["lon"] = lon
            
        quizzes.append(quiz_obj)
        
    # Check how many failed to geocode
    failed = [q for q in quizzes if q['lat'] is None]
    print(f"Successfully geocoded {len(quizzes) - len(failed)} out of {len(quizzes)} quizzes.")
    if failed:
        print(f"Failed to geocode {len(failed)} addresses. Examples:")
        for f in failed[:5]:
            print(f" - {f['title']}: {f['address']}")
            
    with open('quizmap/data/quizzes.json', 'w') as f:
        json.dump(quizzes, f, indent=2)
    print("Saved to quizmap/data/quizzes.json")

if __name__ == "__main__":
    main()
