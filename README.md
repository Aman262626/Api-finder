# Phone Tracker API

A Flask-based API that traces phone number details using calltracer.in.

## Features

- Phone number lookup with detailed information
- REST API with JSON responses
- Vercel deployment ready

## API Usage

### Home
```
GET /
```
Returns API info and usage instructions.

### Trace Number
```
GET /api?number=XXXXXXXXXX
```
Returns phone number details including owner name, SIM card info, location, etc.

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Run Locally

```bash
python app.py
```

Server runs on `http://localhost:5000`.

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Aman262626/Api-finder)

## Tech Stack

- Python / Flask
- BeautifulSoup4
- Requests
- Vercel (Serverless)
