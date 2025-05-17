from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router
from app.utils import fetch_and_process_feeds
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler
from app.utils import fetch_and_process_feeds

scheduler = BackgroundScheduler()
scheduler.add_job(fetch_and_process_feeds, 'interval', minutes=10)
scheduler.start()




app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://sportyfanz.com"],  # Use ["https://yourdomain.com"] in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.on_event("startup")
async def startup_event():
    fetch_and_process_feeds()


app.mount("/static", StaticFiles(directory="static"), name="static")
