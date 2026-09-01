"""Minimal branded HTML for account emails. Order-status emails come later."""

import html

_WRAP = """\
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
            max-width:520px;margin:0 auto;color:#0F0F0F">
  <p style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;
            color:#B8460A;margin-bottom:24px">NANKARA</p>
  {body}
  <p style="font-size:12px;color:#6B6B6B;margin-top:32px">
    If you didn't request this, you can safely ignore this email.
  </p>
</div>"""


def _button(href: str, label: str) -> str:
    return (
        f'<p style="margin:24px 0"><a href="{href}" '
        f'style="background:#0F0F0F;color:#fff;text-decoration:none;'
        f'padding:12px 28px;display:inline-block;font-size:13px;'
        f'letter-spacing:.08em;text-transform:uppercase">{label}</a></p>'
    )


def verification_email(*, first_name: str, link: str) -> tuple[str, str]:
    body = (
        f"<h1 style='font-weight:300;font-size:24px'>Confirm your email</h1>"
        f"<p style='line-height:1.7;color:#6B6B6B'>Hi {first_name}, please confirm "
        f"your email address to finish setting up your Nankara account.</p>"
        f"{_button(link, 'Confirm email')}"
        f"<p style='font-size:12px;color:#6B6B6B'>Or paste this link: {link}</p>"
    )
    return "Confirm your Nankara email", _WRAP.format(body=body)


def password_reset_email(*, first_name: str, link: str) -> tuple[str, str]:
    body = (
        f"<h1 style='font-weight:300;font-size:24px'>Reset your password</h1>"
        f"<p style='line-height:1.7;color:#6B6B6B'>Hi {first_name}, use the link "
        f"below to choose a new password. It expires in 1 hour.</p>"
        f"{_button(link, 'Reset password')}"
        f"<p style='font-size:12px;color:#6B6B6B'>Or paste this link: {link}</p>"
    )
    return "Reset your Nankara password", _WRAP.format(body=body)


# ── Internal notifications (to the admin) ────────────────────────────────────

_INTERNAL_WRAP = """\
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
            max-width:560px;margin:0 auto;color:#0F0F0F">
  <p style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;
            color:#B8460A;margin-bottom:16px">NANKARA · {tag}</p>
  {body}
</div>"""


def _rows(pairs: list[tuple[str, str]]) -> str:
    cells = "".join(
        f"<tr><td style='padding:6px 12px 6px 0;color:#6B6B6B;font-size:13px;"
        f"vertical-align:top;white-space:nowrap'>{html.escape(k)}</td>"
        f"<td style='padding:6px 0;font-size:14px;white-space:pre-wrap'>"
        f"{html.escape(v)}</td></tr>"
        for k, v in pairs
        if v
    )
    return f"<table style='border-collapse:collapse;margin:16px 0'>{cells}</table>"


def new_inbox_message(
    *,
    kind: str,
    name: str,
    email: str,
    message: str,
    subject: str = "",
    phone: str = "",
    country: str = "",
) -> tuple[str, str]:
    is_consult = kind == "consultation"
    tag = "Consultation request" if is_consult else "Contact message"
    pairs = [
        ("Name", name),
        ("Email", email),
        ("Subject", "" if is_consult else subject),
        ("Country", country),
        ("WhatsApp", phone),
        ("Message" if not is_consult else "Goal", message),
    ]
    body = (
        f"<h1 style='font-weight:300;font-size:22px;margin:0 0 4px'>{tag}</h1>"
        f"{_rows(pairs)}"
        f"<p style='font-size:12px;color:#6B6B6B'>Reply directly to "
        f"<a href='mailto:{html.escape(email)}'>{html.escape(email)}</a>, "
        f"or open it in the admin inbox.</p>"
    )
    subj = f"New {tag.lower()} — {name}"
    return subj, _INTERNAL_WRAP.format(tag=html.escape(tag), body=body)

