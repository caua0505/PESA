def calcular_score(c, e, r, p):
    return (c * 0.3) + (e * 0.3) + (r * 0.2) + (p * 0.2)

def classificar(score):
    if score >= 80:
        return "A - Aprovado"
    elif score >= 60:
        return "B - Aprovado com restrição"
    else:
        return "C - Reprovado"