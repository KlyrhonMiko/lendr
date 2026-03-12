from contextlib import asynccontextmanager

from fastapi import FastAPI
from systems.inventory.routers.router import router as inventory_router
from systems.operations.routers.router import router as operations_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Lendr Unified API", lifespan=lifespan)

# Mount the operations system
app.include_router(operations_router, prefix="/api/operations", tags=["Operations"])
app.include_router(inventory_router, prefix="/api/inventory", tags=["Inventory"])


@app.get("/")
async def root():
    return {"message": "Welcome to the Lendr API"}
