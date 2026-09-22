"""Smoke test do Bloco 1.2 — valida config, security, sem BD."""

from app.security import (
    create_access_token,
    decode_token,
    generate_api_key,
    hash_api_key,
    hash_password,
    verify_password,
)


def main() -> None:
    # 1. Password hashing
    pw = "minha-password-secreta"
    h = hash_password(pw)
    assert verify_password(pw, h), "Password correta devia validar"
    assert not verify_password("outra", h), "Password errada não devia validar"
    print("✅ Password hashing OK")

    # 2. JWT
    token = create_access_token(subject="42", extra={"email": "a@b.c"})
    payload = decode_token(token, expected_type="access")
    assert payload["sub"] == "42"
    assert payload["type"] == "access"
    assert payload["email"] == "a@b.c"
    print(f"✅ JWT OK (exp em {payload['exp']})")

    # 3. API key
    full, prefix = generate_api_key()
    assert full.startswith("bcr_")
    assert prefix == full[:12]
    h1 = hash_api_key(full)
    h2 = hash_api_key(full)
    assert h1 == h2, "Hash de API key deve ser determinístico"
    assert hash_api_key("outra") != h1
    print(f"✅ API key OK (prefixo: {prefix}, len: {len(full)})")

    print("\n🎉 Bloco 1.2 validado com sucesso.")


if __name__ == "__main__":
    main()