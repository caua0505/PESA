// ═══════════════════════════════════════════════════════
//  PESA App v2.0
// ═══════════════════════════════════════════════════════

let donutChart = null;
let barChart   = null;
let dadosGlobais = [];
let cnpjParaExcluir = null;

// ── INIT ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  atualizarData();
  carregarDashboard();
  carregarTabela();
});

function atualizarData() {
  const el = document.getElementById("topbarDate");
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

// ── NAVEGAÇÃO ────────────────────────────────────────────
const TITULOS = {
  dashboard:    "Dashboard",
  fornecedores: "Fornecedores",
  cadastrar:    "Cadastrar / Importar",
  ia:           "Análise IA",
};

function navegarPara(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  const el = document.getElementById(`view-${view}`);
  if (el) el.classList.add("active");

  const nav = document.querySelector(`[data-view="${view}"]`);
  if (nav) nav.classList.add("active");

  const title = document.getElementById("topbarTitle");
  if (title) title.textContent = TITULOS[view] || view;

  if (view === "dashboard")    carregarDashboard();
  if (view === "fornecedores") carregarTabela();
}

function recarregar() {
  carregarDashboard();
  carregarTabela();
}

// ── TABS ─────────────────────────────────────────────────
function ativarTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));

  const content = document.getElementById(`tab-${id}`);
  if (content) content.classList.add("active");

  const tabs = document.querySelectorAll(".tab");
  const idx = id === "manual" ? 0 : 1;
  if (tabs[idx]) tabs[idx].classList.add("active");
}

// ── DASHBOARD ─────────────────────────────────────────────
async function carregarDashboard() {
  try {
    const [statsRes, rankingRes] = await Promise.all([
      fetch("/dashboard/stats"),
      fetch("/ia/ranking"),
    ]);
    const stats   = await statsRes.json();
    const ranking = await rankingRes.json();

    document.getElementById("kpiTotal").textContent     = stats.total;
    document.getElementById("kpiScore").textContent     = stats.score_medio || "—";
    document.getElementById("kpiAprovados").textContent = stats.aprovados;
    document.getElementById("kpiRestritos").textContent = stats.restritos;
    document.getElementById("kpiCriticos").textContent  = stats.criticos;

    renderDonut(stats.distribuicao);
    renderBar(ranking.slice(0, 10));
    renderAlertas(ranking);
  } catch (e) {
    console.error("Erro dashboard:", e);
  }
}

function renderDonut(dist) {
  const ctx = document.getElementById("donutChart");
  if (!ctx) return;
  if (donutChart) donutChart.destroy();

  donutChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Aprovados", "Restrição", "Críticos"],
      datasets: [{
        data: [dist.A, dist.B, dist.C],
        backgroundColor: ["#16a34a", "#d97706", "#dc2626"],
        borderWidth: 2,
        borderColor: "#fff",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } },
      },
    },
  });
}

function renderBar(data) {
  const ctx = document.getElementById("barChart");
  if (!ctx) return;
  if (barChart) barChart.destroy();

  const cores = data.map(f =>
    f.classificacao?.startsWith("A") ? "#16a34a"
    : f.classificacao?.startsWith("B") ? "#d97706"
    : "#dc2626"
  );

  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map(f => f.nome.length > 16 ? f.nome.slice(0, 15) + "…" : f.nome),
      datasets: [{
        label: "Score ESG",
        data: data.map(f => f.score),
        backgroundColor: cores,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 100, grid: { color: "#f0f0f0" } },
        x: { grid: { display: false } },
      },
    },
  });
}

function renderAlertas(ranking) {
  const lista = document.getElementById("alertasLista");
  const count = document.getElementById("alertCount");
  if (!lista) return;

  const comAlerta = ranking.filter(f => f.alertas?.length > 0);
  count.textContent = comAlerta.length || "";

  if (!comAlerta.length) {
    lista.innerHTML = `<p class="empty-msg">Nenhum alerta de risco no momento.</p>`;
    return;
  }

  lista.innerHTML = comAlerta.map(f => {
    const critico = f.classificacao?.startsWith("C");
    return `
      <div class="alerta-item ${critico ? "" : "warn"}">
        <div style="flex:1">
          <div class="alerta-empresa">${f.nome}</div>
          <div class="alerta-msg">${f.alertas.join(" · ")}</div>
        </div>
        <span class="alerta-badge ${critico ? "badge-critico" : "badge-warn"}">
          ${critico ? "Crítico" : "Atenção"}
        </span>
      </div>
    `;
  }).join("");
}

// ── TABELA FORNECEDORES ──────────────────────────────────
async function carregarTabela() {
  try {
    const res = await fetch("/fornecedores");
    dadosGlobais = await res.json();
    renderTabela(dadosGlobais);
  } catch (e) {
    console.error("Erro tabela:", e);
  }
}

function renderTabela(data) {
  const tbody = document.getElementById("tabelaFornecedores");
  const vazio = document.getElementById("tabelaVazia");
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = "";
    vazio.style.display = "block";
    return;
  }
  vazio.style.display = "none";

  tbody.innerHTML = data.map((f, i) => {
    const cls   = f.classificacao?.charAt(0) || "C";
    const score = Number(f.score);
    const ringCls = score >= 70 ? "" : score >= 60 ? " amber" : " red";

    const dim = (val) => {
      const cls = val >= 70 ? "" : val >= 60 ? " warn" : " danger";
      return `<div class="dim-bar">
        <div class="dim-bar-track"><div class="dim-bar-fill${cls}" style="width:${val}%"></div></div>
        <span class="dim-val">${val}</span>
      </div>`;
    };

    return `
      <tr>
        <td style="color:var(--text-muted);font-weight:600">${i + 1}</td>
        <td><strong>${f.nome}</strong></td>
        <td style="font-family:monospace;font-size:12px;color:var(--text-muted)">${formatarCNPJ(f.cnpj)}</td>
        <td class="center">${dim(f.compliance)}</td>
        <td class="center">${dim(f.esg)}</td>
        <td class="center">${dim(f.reputacao)}</td>
        <td class="center">${dim(f.performance)}</td>
        <td class="center">
          <div class="score-circle${ringCls}">${score}</div>
        </td>
        <td class="center">
          <span class="status-badge status-${cls.toLowerCase()}">${f.classificacao}</span>
        </td>
        <td class="center">
          <button class="btn-icon" onclick="confirmarExclusao('${f.cnpj}','${f.nome}')" title="Excluir">✕</button>
        </td>
      </tr>
    `;
  }).join("");
}

function filtrarTabela() {
  const busca = (document.getElementById("searchInput")?.value || "").toLowerCase();
  const filtro = document.getElementById("filterClass")?.value || "";

  const filtrado = dadosGlobais.filter(f => {
    const matchBusca = !busca || f.nome.toLowerCase().includes(busca) || f.cnpj.includes(busca);
    const matchFiltro = !filtro || f.classificacao?.startsWith(filtro);
    return matchBusca && matchFiltro;
  });
  renderTabela(filtrado);
}

function exportarJSON() {
  const blob = new Blob([JSON.stringify(dadosGlobais, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "fornecedores_pesa.json";
  a.click(); URL.revokeObjectURL(url);
}

// ── CADASTRO MANUAL ──────────────────────────────────────
async function cadastrarFornecedor() {
  const nome = document.getElementById("novoNome")?.value.trim();
  let cnpj   = document.getElementById("novoCnpj")?.value.replace(/\D/g, "");
  const fb   = document.getElementById("feedbackCadastro");

  if (!nome || !cnpj) {
    setFeedback(fb, "err", "Preencha nome e CNPJ.");
    return;
  }

  if (!validarCNPJ(cnpj)) {
    setFeedback(fb, "err", "CNPJ inválido.");
    return;
  }

  try {
    const res  = await fetch(`/fornecedor?nome=${encodeURIComponent(nome)}&cnpj=${cnpj}`, { method: "POST" });
    const data = await res.json();

    if (data.erro) { setFeedback(fb, "err", data.erro); return; }

    setFeedback(fb, "ok", `✓ ${nome} cadastrado com score ${data.score}.`);
    document.getElementById("novoNome").value = "";
    document.getElementById("novoCnpj").value = "";
    carregarTabela();
    carregarDashboard();
  } catch (e) {
    setFeedback(fb, "err", "Erro ao cadastrar.");
  }
}

// ── IMPORTAR JSON ────────────────────────────────────────
async function importarJSON() {
  const raw = document.getElementById("jsonImport")?.value.trim();
  const fb  = document.getElementById("feedbackImport");

  if (!raw) { setFeedback(fb, "err", "Cole o JSON antes de importar."); return; }

  let lista;
  try {
    lista = JSON.parse(raw);
    if (!Array.isArray(lista)) throw new Error();
  } catch {
    setFeedback(fb, "err", "JSON inválido. Verifique o formato."); return;
  }

  try {
    const res  = await fetch("/fornecedor/importar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lista),
    });
    const data = await res.json();
    const erros = data.erros?.length ? ` (${data.erros.length} erro(s))` : "";
    setFeedback(fb, data.importados > 0 ? "ok" : "err",
      `${data.importados} fornecedor(es) importado(s)${erros}.`);
    if (data.importados > 0) {
      document.getElementById("jsonImport").value = "";
      carregarTabela();
      carregarDashboard();
    }
  } catch (e) {
    setFeedback(fb, "err", "Erro ao importar.");
  }
}

// ── ANÁLISE IA ────────────────────────────────────────────
async function analisarFornecedor() {
  const nome = document.getElementById("iaNome")?.value.trim();
  const cnpj = document.getElementById("iaCnpj")?.value.replace(/\D/g, "");
  const div  = document.getElementById("iaResultado");

  if (!nome && !cnpj) {
    div.innerHTML = `<p style="color:var(--red);text-align:center">Informe nome ou CNPJ.</p>`;
    return;
  }

  let url = "/ia/avaliar?";
  if (cnpj) url += `cnpj=${cnpj}`;
  else       url += `nome=${encodeURIComponent(nome)}`;

  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (data.erro) {
      div.innerHTML = `<p style="color:var(--red);text-align:center;padding:40px">${data.erro}</p>`;
      return;
    }

    const score   = Number(data.score);
    const ringCls = score >= 70 ? "" : score >= 60 ? " amber" : " red";
    const cls     = data.classificacao?.charAt(0) || "C";
    const clsBadge = cls === "A" ? "status-a" : cls === "B" ? "status-b" : "status-c";

    const dimRow = (label, val) => {
      const cls = val >= 70 ? "" : val >= 60 ? " warn" : " danger";
      return `<div class="ia-dim-row">
        <div class="ia-dim-name">${label}</div>
        <div class="ia-dim-track"><div class="ia-dim-fill${cls}" style="width:${val}%"></div></div>
        <div class="ia-dim-val">${val}</div>
      </div>`;
    };

    const alertasHTML = data.alertas?.length
      ? data.alertas.map(a => {
          const isCrit = a.toLowerCase().includes("crítico");
          return `<div class="ia-alerta-item ${isCrit ? "critica" : ""}">${a}</div>`;
        }).join("")
      : `<div class="ia-alerta-item" style="color:var(--green)">✓ Nenhum alerta identificado para este fornecedor.</div>`;

    div.innerHTML = `
      <div class="ia-resultado">
        <div class="ia-score-card">
          <div class="ia-nome">${data.nome}</div>
          <div class="ia-cnpj">${formatarCNPJ(data.cnpj)}</div>
          <div class="ia-score-ring${ringCls}">
            <div class="ia-score-val">${score}</div>
            <div class="ia-score-label">Score</div>
          </div>
          <span class="ia-class ${clsBadge}">${data.classificacao}</span>
          <div class="ia-decisao">${data.decisao}</div>
          ${data.dimensao_critica ? `<p style="margin-top:12px;font-size:12px;color:var(--amber)">⚠ Dimensão crítica: <strong>${data.dimensao_critica}</strong></p>` : ""}
        </div>

        <div class="ia-details">
          <div class="ia-dimensoes">
            <div class="card-header">Breakdown por Dimensão</div>
            ${dimRow("Compliance", data.compliance)}
            ${dimRow("ESG", data.esg)}
            ${dimRow("Reputação", data.reputacao)}
            ${dimRow("Performance", data.performance)}
          </div>
          <div class="ia-alertas">
            <div class="card-header">Alertas e Recomendações</div>
            ${alertasHTML}
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    div.innerHTML = `<p style="color:var(--red);text-align:center;padding:40px">Erro ao buscar análise.</p>`;
  }
}

// ── EXCLUSÃO ──────────────────────────────────────────────
function confirmarExclusao(cnpj, nome) {
  cnpjParaExcluir = cnpj;
  document.getElementById("modalMsg").textContent =
    `Tem certeza que deseja remover "${nome}" da base? Esta ação não pode ser desfeita.`;
  document.getElementById("modalExcluir").style.display = "flex";
  document.getElementById("btnConfirmarExcluir").onclick = () => excluirFornecedor(cnpj);
}

function fecharModal() {
  document.getElementById("modalExcluir").style.display = "none";
  cnpjParaExcluir = null;
}

async function excluirFornecedor(cnpj) {
  fecharModal();
  try {
    await fetch(`/fornecedor/${cnpj}`, { method: "DELETE" });
    carregarTabela();
    carregarDashboard();
  } catch (e) {
    console.error("Erro ao excluir:", e);
  }
}

// ── HELPERS ───────────────────────────────────────────────
function setFeedback(el, tipo, msg) {
  if (!el) return;
  el.className = `feedback ${tipo}`;
  el.textContent = msg;
  if (tipo === "ok") setTimeout(() => { el.textContent = ""; }, 5000);
}

function mascaraCNPJ(input) {
  let v = input.value.replace(/\D/g, "").slice(0, 14);
  if (v.length > 12) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/, "$1.$2.$3/$4-$5");
  else if (v.length > 8) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
  else if (v.length > 5) v = v.replace(/^(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
  else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,3})/, "$1.$2");
  input.value = v;
}

function formatarCNPJ(cnpj) {
  cnpj = String(cnpj).replace(/\D/g, "").padStart(14, "0");
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  let t = 12, n = cnpj.slice(0, t), d = cnpj.slice(t), s = 0, p = t - 7;
  for (let i = t; i >= 1; i--) { s += n.charAt(t - i) * p--; if (p < 2) p = 9; }
  let r = s % 11 < 2 ? 0 : 11 - s % 11;
  if (r != d.charAt(0)) return false;
  t++; n = cnpj.slice(0, t); s = 0; p = t - 7;
  for (let i = t; i >= 1; i--) { s += n.charAt(t - i) * p--; if (p < 2) p = 9; }
  r = s % 11 < 2 ? 0 : 11 - s % 11;
  return r == d.charAt(1);
}
