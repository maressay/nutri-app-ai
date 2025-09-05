from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import users, analyse

app = FastAPI()

# 🛡️ Configurar CORS primero
origins = [
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api", tags=["users"])
app.include_router(analyse.router, prefix="/api", tags=["analyse"])

@app.get("/")
def root():
    return {"message": "Welcome to the FastAPI application!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
