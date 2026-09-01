from sqlalchemy import func, select

from app.models import Availability, Order, UserAddress

CONTACT = {
    "first_name": "Ada",
    "last_name": "Obi",
    "email": "ada@example.com",
    "phone": "+2348012345678",
}
DELIVERY_NG = {
    "country_code": "NG",
    "country_name": "Nigeria",
    "address_1": "12 Aptech Close",
    "address_2": "",
    "city": "Port Harcourt",
    "state_region": "Rivers",
    "postal_code": "",
    "notes": "",
}


def _payload(items, delivery=None):
    return {"contact": CONTACT, "delivery": delivery or DELIVERY_NG, "items": items}


def test_create_order_happy_path(client, db, seeded_zones, make_product):
    a = make_product(price_ngn=150000)
    b = make_product(price_ngn=95000)

    res = client.post(
        "/api/v1/orders",
        json=_payload([
            {"product_id": a.id, "quantity": 2},
            {"product_id": b.id, "quantity": 1},
        ]),
    )
    assert res.status_code == 201
    body = res.json()

    assert body["reference"].startswith("NK-")
    assert body["status"] == "PENDING_PAYMENT"
    assert body["subtotal"] == 150000 * 2 + 95000
    assert body["shipping_amount"] == 5000  # Rivers
    assert body["total"] == body["subtotal"] + 5000
    assert {i["product_name"] for i in body["items"]} == {a.name, b.name}
    # Public-safe view — no phone / full address.
    assert body["customer"] == {
        "first_name": "Ada",
        "last_name": "Obi",
        "email": "ada@example.com",
    }
    assert body["delivery"] == {
        "city": "Port Harcourt",
        "state_region": "Rivers",
        "country": "Nigeria",
    }

    order = db.scalar(select(Order).where(Order.reference == body["reference"]))
    assert order is not None
    assert order.customer_phone == "+2348012345678"  # stored, just not exposed


def test_unit_price_comes_from_db_not_payload(client, db, seeded_zones, make_product):
    product = make_product(price_ngn=200000)
    res = client.post(
        "/api/v1/orders",
        json=_payload([
            {"product_id": product.id, "quantity": 1, "unit_price": 1, "subtotal": 1},
        ]),
    )
    assert res.status_code == 201
    body = res.json()
    assert body["items"][0]["unit_price"] == 200000
    assert body["subtotal"] == 200000


def test_rejects_unpublished_product(client, seeded_zones, make_product):
    product = make_product(is_published=False)
    res = client.post(
        "/api/v1/orders", json=_payload([{"product_id": product.id, "quantity": 1}])
    )
    assert res.status_code == 409
    detail = res.json()["detail"]
    assert detail["items"][0] == {"product_id": product.id, "reason": "unavailable"}


def test_rejects_out_of_stock_product(client, seeded_zones, make_product):
    product = make_product(availability=Availability.OUT_OF_STOCK)
    res = client.post(
        "/api/v1/orders", json=_payload([{"product_id": product.id, "quantity": 1}])
    )
    assert res.status_code == 409
    item = res.json()["detail"]["items"][0]
    assert item["reason"] == "out_of_stock"
    assert item["product_name"] == product.name


def test_rejects_empty_items(client, seeded_zones):
    res = client.post("/api/v1/orders", json=_payload([]))
    assert res.status_code == 422


def test_rejects_unquotable_destination(client, db, seeded_zones, make_product):
    product = make_product()
    for zone in seeded_zones:
        zone.is_active = False
    db.flush()

    res = client.post(
        "/api/v1/orders", json=_payload([{"product_id": product.id, "quantity": 1}])
    )
    assert res.status_code == 422


# ── Address book auto-save for signed-in customers ───────────────────────────

DELIVERY_LAGOS = {
    **DELIVERY_NG,
    "address_1": "4 Bourdillon Road",
    "city": "Ikoyi",
    "state_region": "Lagos",
}


def _addresses(db, user_id):
    return list(
        db.scalars(select(UserAddress).where(UserAddress.user_id == user_id))
    )


def test_customer_order_saves_delivery_address(
    customer_client, db, customer, seeded_zones, make_product
):
    product = make_product()
    res = customer_client.post(
        "/api/v1/orders",
        json=_payload([{"product_id": product.id, "quantity": 1}]),
    )
    assert res.status_code == 201

    saved = _addresses(db, customer.id)
    assert len(saved) == 1
    assert saved[0].address_1 == "12 Aptech Close"
    assert saved[0].city == "Port Harcourt"
    assert saved[0].label == "Port Harcourt"
    assert saved[0].is_default is True  # first address
    assert saved[0].recipient_phone == "+2348012345678"


def test_repeat_address_is_not_duplicated(
    customer_client, db, customer, seeded_zones, make_product
):
    for _ in range(2):
        product = make_product()
        res = customer_client.post(
            "/api/v1/orders",
            json=_payload([{"product_id": product.id, "quantity": 1}]),
        )
        assert res.status_code == 201

    assert len(_addresses(db, customer.id)) == 1


def test_new_address_on_later_order_is_added_not_default(
    customer_client, db, customer, seeded_zones, make_product
):
    p1 = make_product()
    customer_client.post(
        "/api/v1/orders", json=_payload([{"product_id": p1.id, "quantity": 1}])
    )
    p2 = make_product()
    customer_client.post(
        "/api/v1/orders",
        json=_payload([{"product_id": p2.id, "quantity": 1}], delivery=DELIVERY_LAGOS),
    )

    saved = {a.city: a for a in _addresses(db, customer.id)}
    assert set(saved) == {"Port Harcourt", "Ikoyi"}
    assert saved["Port Harcourt"].is_default is True
    assert saved["Ikoyi"].is_default is False


def test_profile_phone_backfilled_when_empty(
    customer_client, db, customer, seeded_zones, make_product
):
    customer.phone = ""
    db.flush()
    product = make_product()
    customer_client.post(
        "/api/v1/orders", json=_payload([{"product_id": product.id, "quantity": 1}])
    )
    db.refresh(customer)
    assert customer.phone == "+2348012345678"


def test_profile_phone_not_overwritten_when_set(
    customer_client, db, customer, seeded_zones, make_product
):
    product = make_product()
    contact = {**CONTACT, "phone": "+2349099999999"}
    customer_client.post(
        "/api/v1/orders",
        json={
            "contact": contact,
            "delivery": DELIVERY_NG,
            "items": [{"product_id": product.id, "quantity": 1}],
        },
    )
    db.refresh(customer)
    assert customer.phone == "+2348012345678"  # unchanged


def test_guest_order_creates_no_address(client, db, seeded_zones, make_product):
    product = make_product()
    res = client.post(
        "/api/v1/orders", json=_payload([{"product_id": product.id, "quantity": 1}])
    )
    assert res.status_code == 201
    assert db.scalar(select(func.count()).select_from(UserAddress)) == 0
