from fastapi import FastAPI
from models import Fornecedor
from services import calcular_score, classificar

app = FastAPI()

@app.post("/avaliar")
def avaliar(f: Fornecedor):
    score = calcular_score(f.compliance, f.esg, f.reputacao, f.performance)
    return {
        "nome": f.nome,
        "cnpj": f.cnpj,
        "score": round(score, 2),
        "classificacao": classificar(score)
    }