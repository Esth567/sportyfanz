from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

app = FastAPI()

# CORS settings (adjust origin for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Get token securely from .env
hf_token = os.getenv("HUGGINGFACE_HUB_TOKEN")
if not hf_token:
    raise EnvironmentError("Missing HUGGINGFACE_HUB_TOKEN in .env")

# ✅ Load model with authentication
model_name = "google/flan-t5-small"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)


# Pydantic models for request schema
class Message(BaseModel):
    role: str
    content: str

class CompletionRequest(BaseModel):
    model: str
    messages: list[Message]
    temperature: float = 0.7
    max_tokens: int = 256


@app.post("/v1/chat/completions")
async def chat_completion(req: CompletionRequest):
    prompt = ""
    for msg in req.messages:
        prompt += f"{msg.role}: {msg.content}\n"
    prompt += "assistant:"

    inputs = tokenizer(prompt, return_tensors="pt").to("cpu")

    outputs = model.generate(
        **inputs,
        max_new_tokens=req.max_tokens,
        do_sample=True,
        temperature=req.temperature,
    )

    output_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    assistant_reply = output_text.split("assistant:")[-1].strip()

    return {
        "id": "chatcmpl-123",
        "object": "chat.completion",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": assistant_reply},
                "finish_reason": "stop",
            }
        ],
        "model": req.model,
    }
