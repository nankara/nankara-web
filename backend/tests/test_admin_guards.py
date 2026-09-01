"""Every admin router rejects an unauthenticated request."""

import pytest

PROTECTED = [
    ("get", "/api/v1/admin/overview"),
    ("get", "/api/v1/admin/products"),
    ("post", "/api/v1/admin/products"),
    ("get", "/api/v1/admin/products/1"),
    ("patch", "/api/v1/admin/products/1"),
    ("put", "/api/v1/admin/products/1/images"),
    ("get", "/api/v1/admin/categories"),
    ("post", "/api/v1/admin/categories"),
    ("post", "/api/v1/admin/media/upload"),
    ("get", "/api/v1/admin/shipping-zones"),
    ("patch", "/api/v1/admin/shipping-zones/1"),
    ("get", "/api/v1/admin/orders"),
    ("get", "/api/v1/admin/orders/1"),
    ("patch", "/api/v1/admin/orders/1/status"),
    ("get", "/api/v1/admin/customers"),
    ("get", "/api/v1/admin/customers/1"),
    ("get", "/api/v1/admin/inbox"),
    ("get", "/api/v1/admin/inbox/1"),
    ("patch", "/api/v1/admin/inbox/1"),
    ("get", "/api/v1/admin/newsletter"),
    ("get", "/api/v1/admin/auth/me"),
]


@pytest.mark.parametrize("method,path", PROTECTED)
def test_requires_auth(client, method, path):
    kwargs = {} if method == "get" else {"json": {}}
    res = getattr(client, method)(path, **kwargs)
    assert res.status_code == 401, f"{method.upper()} {path} -> {res.status_code}"


@pytest.mark.parametrize(
    "method,path",
    [
        ("post", "/api/v1/admin/products"),
        ("patch", "/api/v1/admin/categories/1"),
        ("patch", "/api/v1/admin/shipping-zones/1"),
    ],
)
def test_authed_but_foreign_origin_is_403(admin_client, seeded_zones, method, path):
    res = getattr(admin_client, method)(
        path, json={}, headers={"origin": "https://evil.example"}
    )
    assert res.status_code == 403
