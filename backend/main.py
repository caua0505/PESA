from fastapi import FastAPI
from backend.models import Fornecedor
from backend.services import calcular_score, classificar

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