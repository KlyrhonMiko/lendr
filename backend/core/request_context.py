from __future__ import annotations

from contextvars import ContextVar, Token


_CORRELATION_ID: ContextVar[str] = ContextVar("correlation_id", default="-")


def set_correlation_id(correlation_id: str) -> Token[str]:
    return _CORRELATION_ID.set(correlation_id)


def get_correlation_id() -> str:
    return _CORRELATION_ID.get()


def reset_correlation_id(token: Token[str]) -> None:
    _CORRELATION_ID.reset(token)
