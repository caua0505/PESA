def calcular_score(c, e, r, p):
    return (c * 0.3) + (e * 0.3) + (r * 0.2) + (p * 0.2)


def classificar(score):
    if score >= 80:
        return "A - Aprovado"
    elif score >= 60:
        return "B - Aprovado com restrição"
    else:
        return "C - Reprovado"


def avaliar_ia(f):
    score = calcular_score(
        f["compliance"],
        f["esg"],
        f["reputacao"],
        f["performance"]
    )
    
    if score >= 85:
        decisao = "Fornecedor estratégico (priorizar)"
    elif score >= 70:
        decisao = "Fornecedor aprovado"
    elif score >= 60:
        decisao = "Aprovado com monitoramento"
    else:
        decisao = "Risco alto - auditoria necessária"
    
    return score, decisao