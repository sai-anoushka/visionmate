from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from transformers import AutoProcessor, AutoModelForCausalLM
import torch
import io



app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load GIT-base model and processor
print("🚀 Loading microsoft/git-base-coco model...")
processor = AutoProcessor.from_pretrained("microsoft/git-base-coco")
model = AutoModelForCausalLM.from_pretrained("microsoft/git-base-coco", torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32)
print("✅ Model loaded!")

@app.get("/")
def read_root():
    return {"message": "VisionMate API is running!"}

@app.post("/caption/")
async def generate_caption(file: UploadFile = File(...)):
    print("📥 Received image upload request")
    
    # Read and process image
    image = Image.open(io.BytesIO(await file.read())).convert("RGB")
    print("🖼️ Image processed")

    # Provide a better prompt to guide caption generation
    prompt = "a photo of"
    inputs = processor(images=image, text=prompt, return_tensors="pt")

    print("🤖 Generating caption...")
    output_ids = model.generate(**inputs, max_new_tokens=50)  # increased length
    caption = processor.batch_decode(output_ids, skip_special_tokens=True)[0]

    print("📝 Caption generated:", caption)
    return {"caption": caption}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
