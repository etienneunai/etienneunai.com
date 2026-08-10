import json
import time
import requests
import re

def clean_complex_address(address):
    # Remove things like "EX008/" or "Shop R207, Level 2/" 
    # Usually address has a comma if it has a building name.
    # We want the street number, street, suburb, WA, postcode
    
    # Strip ", Australia" first
    addr = address.replace(', Australia', '').strip()
    
    # Try to find a standard street address pattern: number street, suburb WA postcode
    # If there are multiple commas, maybe take the last two parts
    parts = addr.split(',')
    if len(parts) > 2:
        # e.g., "Rooftop Dining, Carousel Shopping Centre, Shop R207, Level 2/1382 Albany Hwy, Cannington WA 6107"
        # We probably just want the last two parts: "Level 2/1382 Albany Hwy" and "Cannington WA 6107"
        # Even better, regex to find the first street number
        match = re.search(r'\b(\d+\w?\s+[A-Za-z\s]+(?:St|Rd|Hwy|Ave|Blvd|Pde|Terrace|Way|Pl|Cres|Dr|Drive|Street|Road|Avenue|Boulevard|Parade|Place|Crescent)),\s*([A-Za-z\s]+WA\s+\d{4})', addr, re.IGNORECASE)
        if match:
            return f"{match.group(1)}, {match.group(2)}"
            
        # fallback, just take the part with the street and the suburb
        return f"{parts[-2].strip()}, {parts[-1].strip()}"
        
    # Remove weird prefixes like "EX008/20" -> "20"
    addr = re.sub(r'^[A-Za-z0-9]+/\s*', '', addr)
    
    return addr

def geocode_address(address):
    headers = {
        "User-Agent": "QuizFinderMap/1.1 (contact: personal@etienneunai.com)"
    }
    
    # First attempt: Cleaned address
    clean_addr = clean_complex_address(address)
    params = {
        "q": clean_addr,
        "format": "json",
        "limit": 1
    }
    
    print(f"Geocoding: {clean_addr}")
    try:
        res = requests.get("https://nominatim.openstreetmap.org/search", params=params, headers=headers)
        if res.status_code == 200:
            data = res.json()
            if data and len(data) > 0:
                return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        print(f"Error geocoding {clean_addr}: {e}")
        
    # Second attempt: Fallback to original without Australia
    simple = address.replace(', Australia', '').strip()
    if simple != clean_addr:
        print(f"Retrying with: {simple}")
        params['q'] = simple
        time.sleep(1.1)
        try:
            res = requests.get("https://nominatim.openstreetmap.org/search", params=params, headers=headers)
            if res.status_code == 200:
                data = res.json()
                if data and len(data) > 0:
                    return float(data[0]['lat']), float(data[0]['lon'])
        except Exception as e:
            pass

    return None, None

def main():
    json_path = '../../quizzes/data/quizzes.json'
    try:
        with open(json_path, 'r') as f:
            quizzes = json.load(f)
    except FileNotFoundError:
        print(f"Could not find {json_path}")
        return

    failed = [q for q in quizzes if q.get('lat') is None]
    print(f"Found {len(failed)} quizzes with missing coordinates.")
    
    if not failed:
        print("All quizzes already geocoded.")
        return
        
    address_cache = {}
    newly_fixed = 0
    
    for q in quizzes:
        if q.get('lat') is None and q.get('address'):
            addr = q['address']
            if addr not in address_cache:
                lat, lon = geocode_address(addr)
                address_cache[addr] = (lat, lon)
                time.sleep(1.1)
            else:
                lat, lon = address_cache[addr]
                
            if lat and lon:
                q['lat'] = lat
                q['lon'] = lon
                newly_fixed += 1

    print(f"Fixed {newly_fixed} out of {len(failed)} missing coordinates.")
    
    with open(json_path, 'w') as f:
        json.dump(quizzes, f, indent=2)
    print("Saved updated json.")

if __name__ == "__main__":
    main()
