from flask import Flask, request, jsonify
from bs4 import BeautifulSoup
import requests

app = Flask(__name__)

def trace_number(phone_number):
    url = "https://calltracer.in"
    headers = {
        "Host": "calltracer.in",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    payload = {"country": "IN", "q": phone_number}

    try:
        response = requests.post(url, headers=headers, data=payload)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            details = {}
            try:
                details["Number"] = phone_number
                details["Complaints"] = soup.find(text="Complaints").find_next("td").text
                details["Owner Name"] = soup.find(text="Owner Name").find_next("td").text
                details["SIM card"] = soup.find(text="SIM card").find_next("td").text
                details["Mobile State"] = soup.find(text="Mobile State").find_next("td").text
                details["IMEI number"] = soup.find(text="IMEI number").find_next("td").text
                details["MAC address"] = soup.find(text="MAC address").find_next("td").text
                details["Connection"] = soup.find(text="Connection").find_next("td").text
                details["IP address"] = soup.find(text="IP address").find_next("td").text
                details["Owner Address"] = soup.find(text="Owner Address").find_next("td").text
                details["Hometown"] = soup.find(text="Hometown").find_next("td").text
                details["Reference City"] = soup.find(text="Refrence City").find_next("td").text
                details["Owner Personality"] = soup.find(text="Owner Personality").find_next("td").text
                details["Language"] = soup.find(text="Language").find_next("td").text
                details["Mobile Locations"] = soup.find(text="Mobile Locations").find_next("td").text
                details["Country"] = soup.find(text="Country").find_next("td").text
                details["Tracking History"] = soup.find(text="Tracking History").find_next("td").text
                details["Tracker Id"] = soup.find(text="Tracker Id").find_next("td").text
                details["Tower Locations"] = soup.find(text="Tower Locations").find_next("td").text
                return details
            except Exception:
                return {"error": "Unable to extract all details. Please check the response format."}
        else:
            return {"error": f"Failed to fetch data. HTTP Status Code: {response.status_code}"}
    except Exception as e:
        return {"error": str(e)}

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Phone Tracker API",
        "usage": "/api?number=XXXXXXXXXX"
    })

@app.route("/api", methods=["GET"])
def api():
    number = request.args.get("number")
    if not number:
        return jsonify({"error": "Please provide a phone number using ?number=..."})
    
    data = trace_number(number)
    return jsonify(data)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)