from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from backend.models import Fornecedor
from backend.services import calcular_score, classificar

app = FastAPI()

# CORS (ok manter)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir arquivos estáticos (frontend)
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# Rota principal → abre HTML
@app.get("/")
def home():
    return FileResponse("frontend/index.html")

# Endpoint de avaliação
@app.post("/avaliar")
def avaliar(f: Fornecedor):
    score = calcular_score(f.compliance, f.esg, f.reputacao, f.performance)
    return {
        "nome": f.nome,
        "cnpj": f.cnpj,
        "score": round(score, 2),
        "classificacao": classificar(score)
    }