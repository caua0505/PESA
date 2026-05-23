from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

import random
import os
import sys

from backend.services import (
    calcular_score,
    classificar,
    avaliar_ia
)

from backend.models import Fornecedor


# =========================================
# PATH NORMAL + EXE (PYINSTALLER)
# =========================================

if getattr(sys, "frozen", False):

    BASE_DIR = getattr(
        sys,
        "_MEIPASS",
        os.path.abspath(".")
    )

else:

    BASE_DIR = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            ".."
        )
    )

FRONTEND_DIR = os.path.join(
    BASE_DIR,
    "frontend"
)

print("BASE_DIR =", BASE_DIR)
print("FRONTEND_DIR =", FRONTEND_DIR)


# =========================================
# FASTAPI
# =========================================

app = FastAPI()

app.add_middleware(

    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]
)


# =========================================
# STATIC FILES
# =========================================

if os.path.exists(FRONTEND_DIR):

    app.mount(

        "/static",

        StaticFiles(
            directory=FRONTEND_DIR
        ),

        name="static"
    )

else:

    print(
        "ERRO → frontend não encontrado"
    )


# =========================================
# BANCO EM MEMÓRIA
# =========================================

fornecedores_db = []


# =========================================
# VALIDADOR CNPJ
# =========================================

def validar_cnpj(cnpj:str):

    cnpj = "".join(
        filter(str.isdigit, cnpj)
    )

    if len(cnpj) != 14:

        return False

    if cnpj == cnpj[0] * 14:

        return False

    peso1 = [5,4,3,2,9,8,7,6,5,4,3,2]

    soma = sum(

        int(cnpj[i]) * peso1[i]

        for i in range(12)
    )

    dig1 = 11 - (soma % 11)

    if dig1 >= 10:

        dig1 = 0

    peso2 = [6,5,4,3,2,9,8,7,6,5,4,3,2]

    soma = sum(

        int(cnpj[i]) * peso2[i]

        for i in range(13)
    )

    dig2 = 11 - (soma % 11)

    if dig2 >= 10:

        dig2 = 0

    return (

        int(cnpj[12]) == dig1

        and

        int(cnpj[13]) == dig2
    )


# =========================================
# HOME
# =========================================

@app.get("/")
def home():

    arquivo = os.path.join(
        FRONTEND_DIR,
        "index.html"
    )

    if os.path.exists(arquivo):

        return FileResponse(arquivo)

    raise HTTPException(

        status_code=404,

        detail="index.html não encontrado"
    )


# =========================================
# IA - CONSULTA
# =========================================

@app.get("/ia/avaliar")
def avaliar_fornecedor(

    cnpj:str | None = None,

    nome:str | None = None
):

    if not cnpj and not nome:

        return {

            "erro":
            "Informe nome ou CNPJ"
        }

    for fornecedor in fornecedores_db:

        encontrou = (

            (cnpj and fornecedor["cnpj"] == cnpj)

            or

            (

                nome

                and

                nome.lower()

                in

                fornecedor["nome"].lower()
            )
        )

        if encontrou:

            score, decisao = avaliar_ia(
                fornecedor
            )

            return {

                "nome":
                    fornecedor["nome"],

                "cnpj":
                    fornecedor["cnpj"],

                "score":
                    round(score,2),

                "classificacao":
                    classificar(score),

                "decisao_ia":
                    decisao
            }

    return {

        "erro":
        "Fornecedor não encontrado"
    }


# =========================================
# AVALIAÇÃO MANUAL
# =========================================

@app.post("/avaliar")
def avaliar(

    f:Fornecedor
):

    score = calcular_score(

        f.compliance,

        f.esg,

        f.reputacao,

        f.performance
    )

    return {

        "nome":f.nome,

        "cnpj":f.cnpj,

        "score":
            round(score,2),

        "classificacao":
            classificar(score)
    }


# =========================================
# CADASTRO FORNECEDOR
# =========================================

@app.post("/fornecedor")
def cadastrar_fornecedor(

    nome:str="",

    cnpj:str=""
):

    try:

        nome = nome.strip()

        cnpj = "".join(
            filter(str.isdigit, cnpj)
        )

        if not nome or not cnpj:

            return {

                "erro":
                "Nome e CNPJ obrigatórios"
            }

        if not validar_cnpj(cnpj):

            return {

                "erro":
                "CNPJ inválido"
            }

        for fornecedor in fornecedores_db:

            if fornecedor["cnpj"] == cnpj:

                return {

                    "erro":
                    "Fornecedor já cadastrado"
                }

        novo = {

            "nome":nome,

            "cnpj":cnpj,

            "compliance":
                random.randint(60,100),

            "esg":
                random.randint(60,100),

            "reputacao":
                random.randint(60,100),

            "performance":
                random.randint(60,100)
        }

        fornecedores_db.append(
            novo
        )

        score, decisao = avaliar_ia(
            novo
        )

        print(
            "NOVO FORNECEDOR:",
            novo
        )

        return {

            "mensagem":
            "Fornecedor cadastrado com sucesso",

            "nome":nome,

            "cnpj":cnpj,

            "score":
                round(score,2),

            "classificacao":
                classificar(score),

            "decisao":
                decisao
        }

    except Exception as e:

        print(str(e))

        return {

            "erro":
            str(e)
        }


# =========================================
# RANKING IA
# =========================================

@app.get("/ia/ranking")
def ranking():

    ranking_ia = []

    for fornecedor in fornecedores_db:

        score, decisao = avaliar_ia(
            fornecedor
        )

        ranking_ia.append({

            "nome":
                fornecedor["nome"],

            "cnpj":
                fornecedor["cnpj"],

            "score":
                round(score,2),

            "classificacao":
                classificar(score),

            "decisao":
                decisao
        })

    ranking_ia.sort(

        key=lambda x:x["score"],

        reverse=True
    )

    return ranking_ia