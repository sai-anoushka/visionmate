from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import requests
import io
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_URL = "https://api-inference.huggingface.co/models/microsoft/git-base-coco"
HF_TOKEN = os.getenv("HF_TOKEN")
print("✅ Hugging Face Token:", HF_TOKEN[:10] + "..." if HF_TOKEN else "❌ Not set")


HEADERS = {
    "Authorization": f"Bearer {HF_TOKEN}",
    "Content-Type": "application/octet-stream"
}

@app.get("/")
def root():
    return {"message": "VisionMate API (HF Inference) is running!"}

@app.post("/caption/")
async def generate_caption(file: UploadFile = File(...)):
    image_bytes = await file.read()

    print("📤 Sending to Hugging Face API...")
    response = requests.post(API_URL, headers=HEADERS, data=image_bytes)

    try:
        print("📦 Raw HF response text:", response.text)
        result = response.json()
        return {"caption": result[0]["generated_text"]}
    except Exception as e:
        print("❌ Error:", e)
        return {"error": "Failed to get caption"}

