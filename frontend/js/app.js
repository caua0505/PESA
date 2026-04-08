async function avaliarFornecedor() {
  const data = {
    nome: document.getElementById('nome').value,
    cnpj: document.getElementById('cnpj').value,
    compliance: parseInt(document.getElementById('compliance').value),
    esg: parseInt(document.getElementById('esg').value),
    reputacao: parseInt(document.getElementById('reputacao').value),
    performance: parseInt(document.getElementById('performance').value)
  };

  const response = await fetch('http://127.0.0.1:8000/avaliar', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });

  const result = await response.json();
  console.log(result);
}