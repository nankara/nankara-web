CONTACT = {
    "first_name": "Ada",
    "last_name": "Obi",
    "email": "ada@example.com",
    "phone": "+2348012345678",
}
DELIVERY = {
    "country_code": "NG",
    "country_name": "Nigeria",
    "address_1": "12 Aptech Close",
    "address_2": "Flat 3",
    "city": "Lagos",
    "state_region": "Lagos",
    "postal_code": "100001",
    "notes": "Call on arrival",
}


def _place_order(client, product):
    res = client.post(
        "/api/v1/orders",
        json={
            "contact": CONTACT,
            "delivery": DELIVERY,
            "items": [{"product_id": product.id, "quantity": 1}],
        },
    )
    assert res.status_code == 201
    return res.json()


def test_confirmation_returns_safe_fields(client, seeded_zones, make_product):
    product = make_product(price_ngn=120000)
    placed = _place_order(client, product)

    res = client.get(f"/api/v1/orders/{placed['reference']}/confirmation")
    assert res.status_code == 200
    body = res.json()

    assert body["reference"] == placed["reference"]
    assert body["total"] == 120000 + 8000
    assert set(body["customer"]) == {"first_name", "last_name", "email"}
    assert set(body["delivery"]) == {"city", "state_region", "country"}
    # No leak of phone / street address / notes.
    assert "phone" not in str(body)
    assert "Aptech" not in str(body)
    assert "Call on arrival" not in str(body)


def test_confirmation_unknown_reference(client):
    res = client.get("/api/v1/orders/NK-NOPE1234/confirmation")
    assert res.status_code == 404
