from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from chart_generator import generate_chart
import uvicorn

app = FastAPI(title="Chart Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChartRequest(BaseModel):
    chart_type: str
    title: str
    data: dict
    config: dict = {}

class ChartResponse(BaseModel):
    success: bool
    data: dict

@app.post("/api/chart", response_model=ChartResponse)
async def create_chart(request: ChartRequest):
    try:
        result = generate_chart(request.chart_type, request.title, request.data, request.config)
        return ChartResponse(success=True, data=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
