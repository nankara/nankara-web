import logging

import httpx
import pytest

from app.core.config import settings
from app.notifications import resend_client


@pytest.fixture()
def resend_key(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")


def _response(status_code: int, text: str) -> httpx.Response:
    return httpx.Response(
        status_code=status_code,
        text=text,
        request=httpx.Request("POST", resend_client._ENDPOINT),
    )


def test_send_email_skips_when_unconfigured(monkeypatch, caplog):
    monkeypatch.setattr(settings, "resend_api_key", None)
    with caplog.at_level(logging.INFO):
        ok = resend_client.send_email(to="x@example.com", subject="Hi", html="<p>Hi</p>")
    assert ok is False
    assert "not configured" in caplog.text


def test_send_email_logs_resend_error_body(monkeypatch, resend_key, caplog):
    body = (
        '{"statusCode":403,"message":"You can only send testing emails to your '
        'own email address"}'
    )
    monkeypatch.setattr(httpx, "post", lambda *a, **kw: _response(403, body))
    with caplog.at_level(logging.WARNING):
        ok = resend_client.send_email(
            to="someone@example.com", subject="Reset", html="<p>link</p>"
        )
    assert ok is False
    assert "403" in caplog.text
    assert "testing emails" in caplog.text  # the body was logged, not swallowed


def test_send_email_success(monkeypatch, resend_key):
    monkeypatch.setattr(httpx, "post", lambda *a, **kw: _response(200, '{"id":"abc"}'))
    assert resend_client.send_email(
        to="ok@example.com", subject="Hi", html="<p>Hi</p>"
    ) is True


def test_send_email_swallows_transport_error(monkeypatch, resend_key, caplog):
    def _boom(*a, **kw):
        raise httpx.ConnectError("no route to host")

    monkeypatch.setattr(httpx, "post", _boom)
    with caplog.at_level(logging.WARNING):
        ok = resend_client.send_email(to="x@example.com", subject="Hi", html="<p>Hi</p>")
    assert ok is False
    assert "failed" in caplog.text
