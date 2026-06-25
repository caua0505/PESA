from pydantic import BaseModel, Field, field_validator
import re


class Fornecedor(BaseModel):
    nome: str
    cnpj: str
    compliance: int = Field(ge=0, le=100)
    esg: int = Field(ge=0, le=100)
    reputacao: int = Field(ge=0, le=100)
    performance: int = Field(ge=0, le=100)

    @field_validator("cnpj")
    @classmethod
    def validar_cnpj(cls, v: str) -> str:
        cnpj = re.sub(r"\D", "", v)
        if len(cnpj) != 14 or cnpj == cnpj[0] * 14:
            raise ValueError("CNPJ inválido")
        peso1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        soma = sum(int(cnpj[i]) * peso1[i] for i in range(12))
        dig1 = 0 if (11 - soma % 11) >= 10 else (11 - soma % 11)
        peso2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        soma = sum(int(cnpj[i]) * peso2[i] for i in range(13))
        dig2 = 0 if (11 - soma % 11) >= 10 else (11 - soma % 11)
        if int(cnpj[12]) != dig1 or int(cnpj[13]) != dig2:
            raise ValueError("CNPJ inválido")
        return cnpj


class AvaliacaoResult(BaseModel):
    score: float
    classificacao: str
    decisao: str
    alertas: list[str]
    dimensao_critica: str | None
