import requests
import json

try:
    response = requests.get('http://localhost:5000/api/pdfs/listar-pdfs-procesados')
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}") 