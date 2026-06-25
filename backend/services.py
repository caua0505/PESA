from backend.models import Fornecedor, AvaliacaoResult

PESOS = {"compliance": 0.30, "esg": 0.30, "reputacao": 0.20, "performance": 0.20}

# Limiares unificados usados tanto para classificação quanto para decisão IA
LIMIAR_ESTRATEGICO = 85
LIMIAR_APROVADO = 70
LIMIAR_RESTRITO = 60


def calcular_score(fornecedor: Fornecedor) -> float:
    raw = (
        fornecedor.compliance * PESOS["compliance"]
        + fornecedor.esg * PESOS["esg"]
        + fornecedor.reputacao * PESOS["reputacao"]
        + fornecedor.performance * PESOS["performance"]
    )
    return round(max(0.0, min(100.0, raw)), 2)


def classificar(score: float) -> str:
    if score >= LIMIAR_APROVADO:
        return "A - Aprovado"
    elif score >= LIMIAR_RESTRITO:
        return "B - Aprovado com restrição"
    return "C - Reprovado"


def _gerar_alertas(fornecedor: Fornecedor) -> tuple[list[str], str | None]:
    """Retorna alertas por dimensão e a dimensão com pior score."""
    dimensoes = {
        "compliance": fornecedor.compliance,
        "esg": fornecedor.esg,
        "reputacao": fornecedor.reputacao,
        "performance": fornecedor.performance,
    }
    alertas = []
    for dim, valor in dimensoes.items():
        if valor < LIMIAR_RESTRITO:
            alertas.append(f"{dim.capitalize()} crítico ({valor}/100) — requer ação imediata")
        elif valor < LIMIAR_APROVADO:
            alertas.append(f"{dim.capitalize()} abaixo do ideal ({valor}/100) — monitorar")

    critica = min(dimensoes, key=dimensoes.get) if alertas else None
    return alertas, critica


def avaliar_fornecedor(fornecedor: Fornecedor) -> AvaliacaoResult:
    score = calcular_score(fornecedor)
    classificacao = classificar(score)
    alertas, dimensao_critica = _gerar_alertas(fornecedor)

    if score >= LIMIAR_ESTRATEGICO:
        decisao = "Fornecedor estratégico — priorizar"
    elif score >= LIMIAR_APROVADO:
        decisao = "Fornecedor aprovado"
    elif score >= LIMIAR_RESTRITO:
        decisao = "Aprovado com monitoramento ativo"
    else:
        decisao = "Risco alto — auditoria obrigatória"

    return AvaliacaoResult(
        score=score,
        classificacao=classificacao,
        decisao=decisao,
        alertas=alertas,
        dimensao_critica=dimensao_critica,
    )
