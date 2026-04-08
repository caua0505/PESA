from pydantic import BaseModel

class Fornecedor(BaseModel):
    nome: str
    cnpj: str
    compliance: int
    esg: int
    reputacao: int
    performance: int