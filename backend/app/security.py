"""Utilitários de segurança: hashing de passwords, JWT e API keys.

Nota: usamos `bcrypt` diretamente em vez de `passlib` porque o passlib
está sem manutenção desde 2020 e é incompatível com bcrypt>=4.1.
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import bcrypt
from jose import JWTError, jwt

from app.config import settings

# ---------------------------------------------------------------------------
# Password hashing (bcrypt direto)
# ---------------------------------------------------------------------------
# bcrypt aceita no máximo 72 bytes. Truncamos preventivamente para evitar
# o ValueError introduzido no bcrypt 4.1+.
BCRYPT_MAX_BYTES = 72


def _to_bcrypt_bytes(password: str) -> bytes:
    """Converte a password para bytes, truncando aos 72 bytes do bcrypt."""
    return password.encode("utf-8")[:BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    """Gera hash bcrypt de uma password em texto simples."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(_to_bcrypt_bytes(password), salt)
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verifica se a password em texto simples corresponde ao hash."""
    try:
        return bcrypt.checkpw(_to_bcrypt_bytes(plain), hashed.encode("utf-8"))
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------
TokenType = Literal["access", "refresh"]


def _create_token(
    subject: str,
    token_type: TokenType,
    expires_delta: timedelta,
    extra: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str | int, extra: dict[str, Any] | None = None) -> str:
    return _create_token(
        subject=str(subject),
        token_type="access",
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        extra=extra,
    )


def create_refresh_token(subject: str | int, extra: dict[str, Any] | None = None) -> str:
    return _create_token(
        subject=str(subject),
        token_type="refresh",
        expires_delta=timedelta(days=settings.refresh_token_expire_days),
        extra=extra,
    )


def decode_token(token: str, expected_type: TokenType | None = None) -> dict[str, Any]:
    """Descodifica um JWT e valida (opcionalmente) o seu tipo.

    Levanta JWTError em caso de token inválido/expirado/tipo errado.
    """
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    if expected_type and payload.get("type") != expected_type:
        raise JWTError(f"Token do tipo errado (esperado: {expected_type})")
    return payload


# ---------------------------------------------------------------------------
# API keys (userscript)
# ---------------------------------------------------------------------------
API_KEY_PREFIX = "bcr_"     # buyers-crm
API_KEY_BYTES = 32          # 256 bits de entropia


def generate_api_key() -> tuple[str, str]:
    """Gera uma API key nova.

    Devolve (chave_completa, prefixo_para_mostrar).
    A chave completa só é mostrada UMA vez ao utilizador.
    Guarda-se o HASH da chave na BD, nunca a chave em claro.
    """
    raw = secrets.token_urlsafe(API_KEY_BYTES)
    full_key = f"{API_KEY_PREFIX}{raw}"
    prefix = full_key[:12]      # ex: "bcr_AbC123xY"
    return full_key, prefix


def hash_api_key(api_key: str) -> str:
    """Gera hash determinístico de uma API key (para lookup na BD).

    Nota: usamos SHA-256 simples (não bcrypt) porque as API keys têm
    entropia suficiente e precisamos de lookup rápido por igualdade.
    """
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()