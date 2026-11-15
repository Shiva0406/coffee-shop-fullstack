from pydantic import BaseModel, Field, ConfigDict


class ProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str = Field(default="", max_length=255)
    price: float = Field(gt=0)
    image: str = ""
    category: str = "Coffee"


class ProductOut(ProductCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class OrderLineCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0, le=100)


class OrderCreate(BaseModel):
    customer_name: str = Field(default="Guest", min_length=1, max_length=100)
    items: list[OrderLineCreate] = Field(min_length=1)


class OrderItemOut(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    line_total: float


class OrderOut(BaseModel):
    id: int
    customer_name: str
    subtotal: float
    tax: float
    total: float
    created_at: str
    items: list[OrderItemOut]
