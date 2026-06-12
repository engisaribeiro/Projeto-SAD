from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_name: str = "Selo Verde Saladorama API"
    version: str = "0.1.0"
    description: str = (
        "API FastAPI para seleção de fornecedores sustentáveis usando o método MARCOS."
    )


settings = Settings()
