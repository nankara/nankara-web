from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import OrderStatus

_TRIM = str.strip


class ContactIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=120)
    last_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=3, max_length=40)

    @field_validator("first_name", "last_name", "phone", mode="before")
    @classmethod
    def _strip(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class DeliveryIn(BaseModel):
    country_code: str = Field(min_length=2, max_length=2)
    country_name: str = Field(min_length=1, max_length=120)
    address_1: str = Field(min_length=1, max_length=255)
    address_2: str = Field(default="", max_length=255)
    city: str = Field(min_length=1, max_length=120)
    state_region: str = Field(min_length=1, max_length=120)
    postal_code: str = Field(default="", max_length=40)
    notes: str = Field(default="", max_length=2000)

    @field_validator(
        "country_name", "address_1", "address_2", "city", "state_region",
        "postal_code", "notes", mode="before",
    )
    @classmethod
    def _strip(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("country_code", mode="before")
    @classmethod
    def _upper(cls, value: object) -> object:
        return value.strip().upper() if isinstance(value, str) else value


class CartItemIn(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=99)


class OrderCreate(BaseModel):
    contact: ContactIn
    delivery: DeliveryIn
    items: list[CartItemIn] = Field(min_length=1)


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_name: str
    product_slug: str
    unit_price: int
    quantity: int
    subtotal: int


class OrderDeliverySummary(BaseModel):
    city: str
    state_region: str
    country: str


class OrderCustomerSummary(BaseModel):
    # The buyer's own name + email, shown back to them on the confirmation page
    # (keyed on the unguessable reference). Kept minimal on purpose — no phone,
    # no street address. `last_name` is here so the post-order "create an account"
    # prompt can prefill it; don't drop it.
    first_name: str
    last_name: str
    email: str


class OrderConfirmationOut(BaseModel):
    """Public-safe order view (spec §14, §22) — no full address, no phone."""

    reference: str
    status: OrderStatus
    currency: str
    subtotal: int
    shipping_amount: int
    total: int
    items: list[OrderItemOut]
    delivery: OrderDeliverySummary
    customer: OrderCustomerSummary
