from sqlalchemy import func, select

from app.models import InboxMessage, NewsletterSubscriber

CONTACT = {
    "name": "Ada Obi",
    "email": "ada@example.com",
    "subject": "Styling Consultation",
    "message": "I'd love help building a capsule wardrobe.",
}
CONSULT = {
    "name": "Ada Obi",
    "email": "ada@example.com",
    "country": "Nigeria",
    "whatsapp": "+2348012345678",
    "goal": "A full wardrobe overhaul before a new role.",
}


def test_contact_persists_and_notifies(client, db, admin, fake_resend):
    res = client.post("/api/v1/inbox/contact", json=CONTACT)
    assert res.status_code == 201
    assert res.json() == {"status": "received"}

    row = db.scalar(select(InboxMessage).where(InboxMessage.kind == "contact"))
    assert row is not None
    assert row.email == "ada@example.com"
    assert row.subject == "Styling Consultation"
    assert row.is_handled is False

    assert len(fake_resend) == 1
    assert fake_resend[0]["to"] == admin.email
    assert "Ada Obi" in fake_resend[0]["subject"]


def test_consultation_persists(client, db, admin, fake_resend):
    res = client.post("/api/v1/inbox/consultation", json=CONSULT)
    assert res.status_code == 201

    row = db.scalar(select(InboxMessage).where(InboxMessage.kind == "consultation"))
    assert row.phone == "+2348012345678"
    assert row.country == "Nigeria"
    assert row.message.startswith("A full wardrobe")
    assert len(fake_resend) == 1


def test_honeypot_is_silently_dropped(client, db, admin, fake_resend):
    res = client.post(
        "/api/v1/inbox/contact", json={**CONTACT, "website": "http://spam.example"}
    )
    assert res.status_code == 201
    assert res.json() == {"status": "received"}
    assert db.scalar(select(func.count()).select_from(InboxMessage)) == 0
    assert fake_resend == []


def test_contact_validation(client):
    res = client.post("/api/v1/inbox/contact", json={**CONTACT, "email": "nope"})
    assert res.status_code == 422


def test_no_admin_does_not_break_submit(client, db):
    # No `admin` fixture → admin_notification_email is None; submit still succeeds.
    res = client.post("/api/v1/inbox/contact", json=CONTACT)
    assert res.status_code == 201
    assert db.scalar(select(func.count()).select_from(InboxMessage)) == 1


def test_contact_rate_limited(client, admin, fake_resend):
    codes = [
        client.post("/api/v1/inbox/contact", json=CONTACT).status_code
        for _ in range(7)
    ]
    assert codes[:5] == [201] * 5
    assert 429 in codes[5:]


def test_newsletter_subscribe_and_dedupe(client, db):
    r1 = client.post("/api/v1/inbox/newsletter", json={"email": "fan@example.com"})
    r2 = client.post("/api/v1/inbox/newsletter", json={"email": "FAN@example.com"})
    assert r1.status_code == 201 and r2.status_code == 201
    assert db.scalar(select(func.count()).select_from(NewsletterSubscriber)) == 1


# ── Admin ────────────────────────────────────────────────────────────────────

def test_admin_inbox_list_detail_and_handle(admin_client, db):
    admin_client.post("/api/v1/inbox/contact", json=CONTACT)
    admin_client.post("/api/v1/inbox/consultation", json=CONSULT)

    listing = admin_client.get("/api/v1/admin/inbox").json()
    assert {m["kind"] for m in listing} == {"contact", "consultation"}

    filtered = admin_client.get("/api/v1/admin/inbox?kind=contact").json()
    assert len(filtered) == 1
    mid = filtered[0]["id"]

    detail = admin_client.get(f"/api/v1/admin/inbox/{mid}").json()
    assert detail["message"].startswith("I'd love help")

    patched = admin_client.patch(
        f"/api/v1/admin/inbox/{mid}", json={"is_handled": True}
    ).json()
    assert patched["is_handled"] is True and patched["handled_at"] is not None

    open_only = admin_client.get("/api/v1/admin/inbox?handled=false").json()
    assert mid not in [m["id"] for m in open_only]


def test_admin_newsletter_list(admin_client):
    admin_client.post("/api/v1/inbox/newsletter", json={"email": "a@example.com"})
    admin_client.post("/api/v1/inbox/newsletter", json={"email": "b@example.com"})
    body = admin_client.get("/api/v1/admin/newsletter").json()
    assert body["count"] == 2
    assert {s["email"] for s in body["subscribers"]} == {"a@example.com", "b@example.com"}


def test_admin_inbox_requires_auth(client):
    assert client.get("/api/v1/admin/inbox").status_code == 401
    assert client.get("/api/v1/admin/newsletter").status_code == 401


def test_overview_counts_messages_and_subscribers(admin_client):
    admin_client.post("/api/v1/inbox/contact", json=CONTACT)
    admin_client.post("/api/v1/inbox/newsletter", json={"email": "a@example.com"})
    ov = admin_client.get("/api/v1/admin/overview").json()
    assert ov["unhandled_messages"] == 1
    assert ov["newsletter_subscribers"] == 1
