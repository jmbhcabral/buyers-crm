"""Valida que os modelos importam e que o metadata está consistente."""

from app.database import Base

# Importar o pacote models força o registo de todas as tabelas
import app.models  # noqa: F401


def main() -> None:
    tabelas = sorted(Base.metadata.tables.keys())
    print(f"📊 {len(tabelas)} tabelas registadas:\n")
    for t in tabelas:
        print(f"   • {t}")

    # Validações mínimas
    esperadas = {
        "users",
        "consultores",
        "api_keys",
        "clientes",
        "cliente_consultor",
        "imoveis_canonicos",
        "imoveis_canonicos_historico",
        "fotos",
        "imoveis_versoes",
        "imoveis_versoes_clientes",
    }
    faltam = esperadas - set(tabelas)
    if faltam:
        raise SystemExit(f"❌ Tabelas em falta: {faltam}")

    print("\n🎉 Bloco 1.3 validado — todos os modelos registados.")


if __name__ == "__main__":
    main()