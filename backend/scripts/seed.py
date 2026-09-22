"""Popula a base de dados com dados iniciais.

Idempotente: se correres duas vezes, não duplica.
Uso:
    docker compose exec backend python -m scripts.seed
"""

from sqlalchemy import select

from app.database import SessionLocal
from app.models import ApiKey, Consultor, User
from app.security import generate_api_key, hash_api_key, hash_password


def get_or_create_user(
    db,
    *,
    email: str,
    password: str,
    nome: str,
    is_admin: bool = False,
) -> tuple[User, bool]:
    """Devolve (user, criado). Se já existir, devolve criado=False."""
    user = db.scalar(select(User).where(User.email == email))
    if user:
        return user, False

    user = User(
        email=email,
        password_hash=hash_password(password),
        nome=nome,
        is_admin=is_admin,
        ativo=True,
    )
    db.add(user)
    db.flush()  # atribui id
    return user, True


def get_or_create_consultor(
    db,
    *,
    user: User,
    telefone: str | None = None,
    nif: str | None = None,
    bio: str | None = None,
) -> tuple[Consultor, bool]:
    consultor = db.scalar(select(Consultor).where(Consultor.user_id == user.id))
    if consultor:
        return consultor, False

    consultor = Consultor(
        user_id=user.id,
        telefone=telefone,
        nif=nif,
        bio=bio,
        ativo=True,
    )
    db.add(consultor)
    db.flush()
    return consultor, True


def get_or_create_api_key(
    db,
    *,
    user: User,
    nome: str,
) -> tuple[ApiKey, str | None, bool]:
    """Cria uma API key se o user ainda não tiver nenhuma.

    Devolve (api_key, chave_em_claro, criada).
    A chave em claro só é devolvida quando é criada — depois não é recuperável.
    """
    existing = db.scalar(select(ApiKey).where(ApiKey.user_id == user.id))
    if existing:
        return existing, None, False

    full_key, prefixo = generate_api_key()
    api_key = ApiKey(
        user_id=user.id,
        nome=nome,
        prefixo=prefixo,
        chave_hash=hash_api_key(full_key),
        ativa=True,
    )
    db.add(api_key)
    db.flush()
    return api_key, full_key, True


def main() -> None:
    db = SessionLocal()
    try:
        print("🌱 A popular a base de dados...\n")

        # ------------------------------------------------------------------
        # 1. Admin
        # ------------------------------------------------------------------
        admin, criado_admin = get_or_create_user(
            db,
            email="admin@buyers-crm.pt",
            password="admin",
            nome="Administrador",
            is_admin=True,
        )
        print(f"{'✅' if criado_admin else '⏭️ '} Admin: {admin.email}")

        # ------------------------------------------------------------------
        # 2. Consultor: Jorge Cabral
        # ------------------------------------------------------------------
        jorge_user, criado_jorge = get_or_create_user(
            db,
            email="jorge@buyers-crm.pt",
            password="jorge",
            nome="Jorge Cabral",
            is_admin=False,
        )
        print(f"{'✅' if criado_jorge else '⏭️ '} User: {jorge_user.email}")

        jorge, criado_jorge_consultor = get_or_create_consultor(
            db,
            user=jorge_user,
            telefone="962195430",
            bio="Consultor Imobiliário",
        )
        print(f"{'✅' if criado_jorge_consultor else '⏭️ '} Consultor: {jorge_user.nome}")

        jorge_key, jorge_key_em_claro, criada_key = get_or_create_api_key(
            db,
            user=jorge_user,
            nome="Tampermonkey - Mac Pro",
        )
        if criada_key:
            print(f"🔑 API key do Jorge CRIADA (guarda isto, só aparece uma vez!):")
            print(f"   {jorge_key_em_claro}")
        else:
            print(f"🔑 API key do Jorge já existia (prefixo: {jorge_key.prefixo})")

        # ------------------------------------------------------------------
        # 3. Consultor: Maria Silva
        # ------------------------------------------------------------------
        maria_user, criado_maria = get_or_create_user(
            db,
            email="maria@buyers-crm.pt",
            password="maria",
            nome="Maria Silva",
            is_admin=False,
        )
        print(f"{'✅' if criado_maria else '⏭️ '} User: {maria_user.email}")

        maria, criado_maria_consultor = get_or_create_consultor(
            db,
            user=maria_user,
            telefone="961234567",
            bio="Consultora Imobiliária",
        )
        print(f"{'✅' if criado_maria_consultor else '⏭️ '} Consultor: {maria_user.nome}")

        # ------------------------------------------------------------------
        # 4. Commit final
        # ------------------------------------------------------------------
        db.commit()
        print("\n🎉 Seed concluído com sucesso.")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()