from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import random

from backend.services import calcular_score, classificar, avaliar_ia
from backend.models import Fornecedor

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="frontend"), name="static")

# BASE
fornecedores_db = [
    {"nome": "EcoLog", "cnpj": "111", "compliance": 90, "esg": 95, "reputacao": 88, "performance": 92},
    {"nome": "TransLog", "cnpj": "222", "compliance": 70, "esg": 65, "reputacao": 60, "performance": 75},
    {"nome": "GreenTech", "cnpj": "333", "compliance": 85, "esg": 90, "reputacao": 80, "performance": 88},
    {"nome": "BuildCorp", "cnpj": "444", "compliance": 50, "esg": 45, "reputacao": 40, "performance": 55},
    {"nome": "SafeSupply", "cnpj": "555", "compliance": 95, "esg": 85, "reputacao": 90, "performance": 93},
    {"nome": "EcoParts", "cnpj": "666", "compliance": 80, "esg": 82, "reputacao": 78, "performance": 85},
    {"nome": "LogiFast", "cnpj": "777", "compliance": 60, "esg": 55, "reputacao": 58, "performance": 65},
    {"nome": "FutureEnergy", "cnpj": "888", "compliance": 92, "esg": 97, "reputacao": 93, "performance": 95},
    {"nome": "MetalWorks", "cnpj": "999", "compliance": 55, "esg": 50, "reputacao": 48, "performance": 60},
    {"nome": "PrimeServices", "cnpj": "000", "compliance": 75, "esg": 78, "reputacao": 74, "performance": 80},
]

# HOME
@app.get("/")
def home():
    return FileResponse("frontend/index.html")

# IA
@app.get("/ia/avaliar")
def avaliar_fornecedor(cnpj: str | None = None, nome: str | None = None):

    if not cnpj and not nome:
        return {"erro": "Informe nome ou CNPJ"}

    for f in fornecedores_db:
        if (cnpj and f["cnpj"] == cnpj) or (nome and nome.lower() in f["nome"].lower()):
            
            score, decisao = avaliar_ia(f)
            classificacao = classificar(score)

            return {
                "nome": f["nome"],
                "cnpj": f["cnpj"],
                "score": round(score, 2),
                "classificacao": classificacao,
                "decisao_ia": decisao
            }

    return {"erro": "Fornecedor não encontrado"}


# 🔥 AGORA FORA (CORRETO)
@app.post("/avaliar")
def avaliar(f: Fornecedor):
    score = calcular_score(f.compliance, f.esg, f.reputacao, f.performance)
    return {
        "nome": f.nome,
        "cnpj": f.cnpj,
        "score": round(score, 2),
        "classificacao": classificar(score)
    }


@app.post("/fornecedor")
def cadastrar_fornecedor(nome: str, cnpj: str):
    
    # IA gera dados automaticamente
    novo = {
        "nome": nome,
        "cnpj": cnpj,
        "compliance": random.randint(60, 100),
        "esg": random.randint(60, 100),
        "reputacao": random.randint(60, 100),
        "performance": random.randint(60, 100),
    }

    fornecedores_db.append(novo)

    score, decisao = avaliar_ia(novo)

    return {
        "mensagem": "Fornecedor cadastrado com sucesso",
        "score": score,
        "decisao": decisao
    }

@app.get("/ia/ranking")
def ranking():
    ranking_lista = []

    for f in fornecedores_db:
        score, _ = avaliar_ia(f)
        classificacao = classificar(score)

        ranking_lista.append({
            "nome": f["nome"],
            "score": round(score, 2),
            "classificacao": classificacao
        })

    # 🔥 ordena do maior para o menor
    ranking_lista.sort(key=lambda x: x["score"], reverse=True)

    return ranking_lista