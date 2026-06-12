from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_name: str = "Selo Verde Saladorama API"
    version: str = "0.2.0"
    description: str = (
        "API FastAPI para seleção de fornecedores sustentáveis usando o método MARCOS,"
        " com cadastro de fornecedores, histórico de decisões e exportação de relatórios."
    )
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./saladorama.db")
    allowed_origins: tuple[str, ...] = ("*",)


settings = Settings()
