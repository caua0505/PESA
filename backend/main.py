from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import random
import os
import sys

from backend.services import avaliar_fornecedor, classificar
from backend.models import Fornecedor


# ── PATH NORMAL + EXE ──────────────────────────────────────────

if getattr(sys, "frozen", False):
    BASE_DIR = getattr(sys, "_MEIPASS", os.path.abspath("."))
else:
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

print("BASE_DIR =", BASE_DIR)
print("FRONTEND_DIR =", FRONTEND_DIR)


# ── FASTAPI ─────────────────────────────────────────────────────

app = FastAPI(title="PESA API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── STATIC FILES ────────────────────────────────────────────────
# Rotas explícitas com media_type garantido (mais confiável no exe)

def _ler_arquivo(caminho: str) -> bytes:
    with open(caminho, "rb") as f:
        return f.read()

@app.get("/static/css/style.css", include_in_schema=False)
def serve_css():
    path = os.path.join(FRONTEND_DIR, "css", "style.css")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="CSS não encontrado")
    return Response(content=_ler_arquivo(path), media_type="text/css; charset=utf-8")

@app.get("/static/js/app.js", include_in_schema=False)
def serve_js():
    path = os.path.join(FRONTEND_DIR, "js", "app.js")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="JS não encontrado")
    return Response(content=_ler_arquivo(path), media_type="application/javascript; charset=utf-8")

# Mantém StaticFiles como fallback para outros assets futuros
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
else:
    print("AVISO → frontend não encontrado:", FRONTEND_DIR)


# ── BANCO EM MEMÓRIA ────────────────────────────────────────────

fornecedores_db: list[dict] = []


# ── HELPERS ─────────────────────────────────────────────────────

def _avaliar_dict(f: dict) -> dict:
    modelo = Fornecedor(**f)
    res = avaliar_fornecedor(modelo)
    return {
        "nome": f["nome"],
        "cnpj": f["cnpj"],
        "compliance": f["compliance"],
        "esg": f["esg"],
        "reputacao": f["reputacao"],
        "performance": f["performance"],
        "score": res.score,
        "classificacao": res.classificacao,
        "decisao": res.decisao,
        "alertas": res.alertas,
        "dimensao_critica": res.dimensao_critica,
    }


def _cnpj_existe(cnpj: str) -> bool:
    return any(f["cnpj"] == cnpj for f in fornecedores_db)


# ── HOME ────────────────────────────────────────────────────────

@app.get("/")
def home():
    arquivo = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(arquivo):
        return FileResponse(arquivo)
    raise HTTPException(status_code=404, detail="index.html não encontrado")


# ── DASHBOARD STATS ─────────────────────────────────────────────

@app.get("/dashboard/stats")
def dashboard_stats():
    if not fornecedores_db:
        return {"total": 0, "score_medio": 0, "aprovados": 0, "restritos": 0, "criticos": 0, "distribuicao": {"A": 0, "B": 0, "C": 0}}

    avaliados = [_avaliar_dict(f) for f in fornecedores_db]
    total = len(avaliados)
    score_medio = round(sum(f["score"] for f in avaliados) / total, 1)
    aprovados = sum(1 for f in avaliados if f["classificacao"].startswith("A"))
    restritos = sum(1 for f in avaliados if f["classificacao"].startswith("B"))
    criticos = sum(1 for f in avaliados if f["classificacao"].startswith("C"))

    return {
        "total": total,
        "score_medio": score_medio,
        "aprovados": aprovados,
        "restritos": restritos,
        "criticos": criticos,
        "distribuicao": {"A": aprovados, "B": restritos, "C": criticos},
    }


# ── LISTAR FORNECEDORES ─────────────────────────────────────────

@app.get("/fornecedores")
def listar_fornecedores():
    return [_avaliar_dict(f) for f in fornecedores_db]


# ── CADASTRO INDIVIDUAL ─────────────────────────────────────────

@app.post("/fornecedor")
def cadastrar_fornecedor(nome: str = "", cnpj: str = ""):
    try:
        nome = nome.strip()
        cnpj = "".join(filter(str.isdigit, cnpj))

        if not nome or not cnpj:
            return {"erro": "Nome e CNPJ obrigatórios"}

        try:
            Fornecedor(nome=nome, cnpj=cnpj, compliance=60, esg=60, reputacao=60, performance=60)
        except Exception:
            return {"erro": "CNPJ inválido"}

        if _cnpj_existe(cnpj):
            return {"erro": "Fornecedor já cadastrado"}

        novo = {
            "nome": nome,
            "cnpj": cnpj,
            "compliance": random.randint(50, 100),
            "esg": random.randint(50, 100),
            "reputacao": random.randint(50, 100),
            "performance": random.randint(50, 100),
        }

        fornecedores_db.append(novo)
        return {"mensagem": "Fornecedor cadastrado com sucesso", **_avaliar_dict(novo)}

    except Exception as e:
        print(str(e))
        return {"erro": str(e)}


# ── IMPORTAR EM LOTE ────────────────────────────────────────────

class FornecedorImport(BaseModel):
    nome: str
    cnpj: str
    compliance: int = 70
    esg: int = 70
    reputacao: int = 70
    performance: int = 70


@app.post("/fornecedor/importar")
def importar_fornecedores(lista: list[FornecedorImport]):
    importados = []
    erros = []

    for item in lista:
        cnpj = "".join(filter(str.isdigit, item.cnpj))
        try:
            Fornecedor(
                nome=item.nome, cnpj=cnpj,
                compliance=item.compliance, esg=item.esg,
                reputacao=item.reputacao, performance=item.performance,
            )
        except Exception as e:
            erros.append({"cnpj": item.cnpj, "erro": str(e)})
            continue

        if _cnpj_existe(cnpj):
            erros.append({"cnpj": cnpj, "erro": "Já cadastrado"})
            continue

        novo = {
            "nome": item.nome, "cnpj": cnpj,
            "compliance": item.compliance, "esg": item.esg,
            "reputacao": item.reputacao, "performance": item.performance,
        }
        fornecedores_db.append(novo)
        importados.append(_avaliar_dict(novo))

    return {"importados": len(importados), "erros": erros, "dados": importados}


# ── EXCLUIR FORNECEDOR ──────────────────────────────────────────

@app.delete("/fornecedor/{cnpj}")
def excluir_fornecedor(cnpj: str):
    cnpj = "".join(filter(str.isdigit, cnpj))
    for i, f in enumerate(fornecedores_db):
        if f["cnpj"] == cnpj:
            fornecedores_db.pop(i)
            return {"mensagem": "Fornecedor removido"}
    raise HTTPException(status_code=404, detail="Fornecedor não encontrado")


# ── AVALIAÇÃO IA INDIVIDUAL ─────────────────────────────────────

@app.get("/ia/avaliar")
def avaliar_ia(cnpj: str | None = None, nome: str | None = None):
    if not cnpj and not nome:
        return {"erro": "Informe nome ou CNPJ"}

    for f in fornecedores_db:
        match = (cnpj and f["cnpj"] == "".join(filter(str.isdigit, cnpj))) or \
                (nome and nome.lower() in f["nome"].lower())
        if match:
            return _avaliar_dict(f)

    return {"erro": "Fornecedor não encontrado"}


# ── RANKING ─────────────────────────────────────────────────────

@app.get("/ia/ranking")
def ranking():
    avaliados = [_avaliar_dict(f) for f in fornecedores_db]
    return sorted(avaliados, key=lambda x: x["score"], reverse=True)


# ── AVALIAÇÃO MANUAL (payload JSON) ─────────────────────────────

@app.post("/avaliar")
def avaliar_manual(f: Fornecedor):
    res = avaliar_fornecedor(f)
    return {
        "nome": f.nome, "cnpj": f.cnpj,
        "score": res.score, "classificacao": res.classificacao,
        "decisao": res.decisao, "alertas": res.alertas,
        "dimensao_critica": res.dimensao_critica,
    }
