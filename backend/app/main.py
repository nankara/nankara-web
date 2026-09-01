import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.admin.router import router as admin_router
from app.auth.router import router as auth_router
from app.categories.admin_router import router as admin_categories_router
from app.categories.router import router as categories_router
from app.core.config import settings
from app.core.ratelimit import limiter
from app.customers.admin_router import router as admin_customers_router
from app.customers.router import router as account_router
from app.inbox.admin_router import router as admin_inbox_router
from app.inbox.router import router as inbox_router
from app.media.router import router as media_router
from app.orders.admin_router import router as admin_orders_router
from app.orders.router import router as orders_router
from app.payments.router import router as payments_router
from app.products.admin_router import router as admin_products_router
from app.products.router import router as products_router
from app.shipping.admin_router import router as admin_shipping_router
from app.shipping.router import router as shipping_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    errors = settings.production_config_errors()
    if errors:
        raise RuntimeError(
            "Refusing to start in production with an unsafe configuration:\n  - "
            + "\n  - ".join(errors)
        )
    if settings.is_production:
        if not settings.paystack_configured:
            logger.warning("PAYSTACK_SECRET_KEY is not set — payments will 503.")
        if not settings.email_configured:
            logger.warning("RESEND_API_KEY is not set — account emails won't send.")
        elif settings.email_sender_is_testing:
            logger.warning(
                "RESEND_FROM is %r — Resend only delivers from onboarding@resend.dev "
                "to your own account address (everyone else gets a 403). Verify a "
                "sending domain and set RESEND_FROM before launch.",
                settings.resend_from,
            )
    yield


_docs_url = None if settings.is_production else "/docs"

app = FastAPI(
    title="Nankara Shop API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=_docs_url,
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429, content={"detail": "Too many requests — please slow down."}
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_V1 = "/api/v1"

# Public storefront
app.include_router(products_router, prefix=f"{API_V1}/products", tags=["products"])
app.include_router(categories_router, prefix=f"{API_V1}/categories", tags=["categories"])
app.include_router(shipping_router, prefix=f"{API_V1}/shipping", tags=["shipping"])
app.include_router(orders_router, prefix=f"{API_V1}/orders", tags=["orders"])
app.include_router(payments_router, prefix=f"{API_V1}/payments", tags=["payments"])
app.include_router(account_router, prefix=f"{API_V1}/account", tags=["account"])
app.include_router(inbox_router, prefix=f"{API_V1}/inbox", tags=["inbox"])

# Admin
app.include_router(auth_router, prefix=f"{API_V1}/admin/auth", tags=["admin: auth"])
app.include_router(admin_router, prefix=f"{API_V1}/admin", tags=["admin: overview"])
app.include_router(
    admin_products_router, prefix=f"{API_V1}/admin/products", tags=["admin: products"]
)
app.include_router(
    admin_categories_router,
    prefix=f"{API_V1}/admin/categories",
    tags=["admin: categories"],
)
app.include_router(
    media_router, prefix=f"{API_V1}/admin/media", tags=["admin: media"]
)
app.include_router(
    admin_shipping_router,
    prefix=f"{API_V1}/admin/shipping-zones",
    tags=["admin: shipping"],
)
app.include_router(
    admin_orders_router, prefix=f"{API_V1}/admin/orders", tags=["admin: orders"]
)
app.include_router(
    admin_customers_router,
    prefix=f"{API_V1}/admin/customers",
    tags=["admin: customers"],
)
app.include_router(
    admin_inbox_router, prefix=f"{API_V1}/admin", tags=["admin: inbox"]
)


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok"}
