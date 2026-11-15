from contextlib import asynccontextmanager
from datetime import timezone
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import Base, engine, get_db, SessionLocal, wait_for_database
import models
import schemas


DEFAULT_PRODUCTS = [
    {
        "name": "Espresso",
        "description": "Bold, rich and beautifully balanced.",
        "price": 90.00,
        "category": "Classic",
        "image": "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=700",
    },
    {
        "name": "Cappuccino",
        "description": "Espresso with silky steamed milk foam.",
        "price": 150.00,
        "category": "Classic",
        "image": "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=700",
    },
    {
        "name": "Cafe Latte",
        "description": "Smooth espresso with creamy milk.",
        "price": 160.00,
        "category": "Milk Coffee",
        "image": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=700",
    },
    {
        "name": "Cold Coffee",
        "description": "Chilled coffee, milk and a little magic.",
        "price": 180.00,
        "category": "Cold",
        "image": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=700",
    },
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    wait_for_database()
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.query(models.Product).count() == 0:
            for item in DEFAULT_PRODUCTS:
                # Replace any optional demo image URL with a valid URL below if desired.
                db.add(models.Product(**item))
            db.commit()
    yield


app = FastAPI(title="Brew & Bean Coffee API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "coffee-shop-api"}


@app.get("/api/products", response_model=list[schemas.ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(models.Product).order_by(models.Product.id).all()


@app.post("/api/products", response_model=schemas.ProductOut, status_code=201)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    if db.query(models.Product).filter(models.Product.name == payload.name).first():
        raise HTTPException(status_code=409, detail="A product with this name already exists.")
    product = models.Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@app.post("/api/orders", response_model=schemas.OrderOut, status_code=201)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    order = models.Order(customer_name=payload.customer_name)
    subtotal = 0.0

    for line in payload.items:
        product = db.query(models.Product).filter(
            models.Product.id == line.product_id
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {line.product_id} not found.")
        line_total = round(product.price * line.quantity, 2)
        subtotal += line_total
        order.items.append(
            models.OrderItem(
                product_id=product.id,
                product_name=product.name,
                quantity=line.quantity,
                unit_price=product.price,
                line_total=line_total,
            )
        )

    order.subtotal = round(subtotal, 2)
    order.tax = round(order.subtotal * 0.05, 2)
    order.total = round(order.subtotal + order.tax, 2)
    db.add(order)
    db.commit()
    db.refresh(order)
    return serialize_order(order)


@app.get("/api/orders", response_model=list[schemas.OrderOut])
def list_orders(db: Session = Depends(get_db)):
    orders = db.query(models.Order).order_by(models.Order.id.desc()).limit(50).all()
    return [serialize_order(order) for order in orders]


def serialize_order(order):
    return {
        "id": order.id,
        "customer_name": order.customer_name,
        "subtotal": order.subtotal,
        "tax": order.tax,
        "total": order.total,
        "created_at": order.created_at.isoformat(),
        "items": [
            {
                "product_id": item.product_id,
                "product_name": item.product_name,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "line_total": item.line_total,
            }
            for item in order.items
        ],
    }
