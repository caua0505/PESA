// ===============================
// 🔹 CONFIG INICIAL SEGURA
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ App carregado");

  // Busca automática (sem botão)
  const inputCnpj = document.getElementById("cnpj");
  const inputNome = document.getElementById("nome");

  if (inputCnpj) {
    inputCnpj.addEventListener("input", debounce(avaliarFornecedor, 500));
  }

  if (inputNome) {
    inputNome.addEventListener("input", debounce(avaliarFornecedor, 500));
  }

  carregarRanking();
});


// ===============================
// 🔹 DEBOUNCE (evita muitas chamadas)
// ===============================
function debounce(func, delay) {
  let timeout;
  return function () {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, arguments), delay);
  };
}


// ===============================
// 🔹 AVALIAR FORNECEDOR (IA)
// ===============================
async function avaliarFornecedor() {
  const resultado = document.getElementById("resultado");

  try {
    let cnpj = document.getElementById("cnpj")?.value || "";
    let nome = document.getElementById("nome")?.value || "";

    cnpj = cnpj.trim().replace(/\D/g, "");
    nome = nome.trim();

    if (!cnpj && !nome) {
      resultado.innerHTML = `<p class="text-gray-400">Digite um nome ou CNPJ...</p>`;
      return;
    }

    let url = "/ia/avaliar?";

    if (cnpj) {
      url += `cnpj=${cnpj}`;
    } else {
      url += `nome=${encodeURIComponent(nome)}`;
    }

    console.log("📡 Buscando:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Erro na API");
    }

    const data = await response.json();
    console.log("📥 Resultado:", data);

    if (!data || data.erro) {
      resultado.innerHTML = `<p class="text-red-500">${data?.erro || "Fornecedor não encontrado"}</p>`;
      return;
    }

    resultado.innerHTML = `
      <div class="space-y-2">
        <p class="font-bold text-lg">${data.nome}</p>
        <p><strong>CNPJ:</strong> ${data.cnpj}</p>
        <p><strong>Score:</strong> ${data.score}</p>
        <p class="font-semibold text-green-600">${data.classificacao}</p>
        <p class="text-blue-600">${data.decisao_ia}</p>
      </div>
    `;

  } catch (error) {
    console.error("❌ Erro:", error);
    resultado.innerHTML = `<p class="text-red-500">Erro ao buscar fornecedor</p>`;
  }
}


// ===============================
// 🔥 CADASTRAR FORNECEDOR (IA)
// ===============================
async function cadastrarFornecedor() {
  try {
    const nome = document.getElementById("novoNome")?.value || "";
    let cnpj = document.getElementById("novoCnpj")?.value || "";

    cnpj = cnpj.replace(/\D/g, "");

    if (!nome || !cnpj) {
      alert("Preencha nome e CNPJ");
      return;
    }

    const response = await fetch(`/fornecedor?nome=${encodeURIComponent(nome)}&cnpj=${cnpj}`, {
      method: "POST"
    });

    if (!response.ok) {
      throw new Error("Erro ao cadastrar");
    }

    const data = await response.json();

    console.log("✅ Cadastrado:", data);

    alert("Fornecedor cadastrado com sucesso!");

    // limpa campos
    document.getElementById("novoNome").value = "";
    document.getElementById("novoCnpj").value = "";

    // atualiza ranking
    carregarRanking();

  } catch (error) {
    console.error("❌ Erro:", error);
    alert("Erro ao cadastrar fornecedor");
  }
}


// ===============================
// 🔥 RANKING
// ===============================
async function carregarRanking() {
  try {
    const response = await fetch("/ia/ranking");

    if (!response.ok) {
      console.warn("⚠️ Ranking não disponível");
      return;
    }

    const data = await response.json();

    let html = "";

    data.forEach((f, index) => {
      let cor = "text-gray-700";

      if (f.classificacao?.startsWith("A")) cor = "text-green-600";
      if (f.classificacao?.startsWith("B")) cor = "text-yellow-600";
      if (f.classificacao?.startsWith("C")) cor = "text-red-600";

      html += `
        <tr class="border-b">
          <td class="p-2">${index + 1}º - ${f.nome}</td>
          <td class="p-2 text-center">${f.score}</td>
          <td class="p-2 text-center ${cor} font-semibold">${f.classificacao}</td>
        </tr>
      `;
    });

    const ranking = document.getElementById("ranking");
    if (ranking) {
      ranking.innerHTML = html;
    }

  } catch (error) {
    console.log("⚠️ Ranking ignorado");
  }
}