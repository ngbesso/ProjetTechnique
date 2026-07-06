import stripe
from app.core.config import settings

stripe.api_key = settings.stripe_secret_key


def create_payment_intent(
    amount_cents: int,
    currency: str,
    metadata: dict,
) -> stripe.PaymentIntent:
    return stripe.PaymentIntent.create(
        amount=amount_cents,
        currency=currency,
        payment_method_types=["card"],
        metadata=metadata,
    )


def retrieve_payment_intent(payment_intent_id: str) -> stripe.PaymentIntent:
    return stripe.PaymentIntent.retrieve(payment_intent_id)
