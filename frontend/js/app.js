// =====================================
// CONFIG INICIAL
// =====================================

let rankingChart = null;

document.addEventListener("DOMContentLoaded", () => {

    console.log("✅ App carregado");

    const inputCnpj =
        document.getElementById("cnpj");

    const inputNome =
        document.getElementById("nome");

    if(inputCnpj){

        inputCnpj.addEventListener(
            "input",
            debounce(avaliarFornecedor,600)
        );
    }

    if(inputNome){

        inputNome.addEventListener(
            "input",
            debounce(avaliarFornecedor,600)
        );
    }

    carregarRanking();
});


// =====================================
// DEBOUNCE
// =====================================

function debounce(fn,delay){

    let timeout;

    return (...args)=>{

        clearTimeout(timeout);

        timeout = setTimeout(
            ()=> fn(...args),
            delay
        );
    };
}


// =====================================
// CONSULTA IA
// =====================================

async function avaliarFornecedor(){

    const resultado =
        document.getElementById(
            "resultado"
        );

    try{

        let nome =
            document
            .getElementById("nome")
            ?.value || "";

        let cnpj =
            document
            .getElementById("cnpj")
            ?.value || "";

        nome = nome.trim();

        cnpj = cnpj
            .trim()
            .replace(/\D/g,"");

        if(!nome && !cnpj){

            resultado.innerHTML=`
                <p class="text-gray-400">
                    Digite nome ou CNPJ
                </p>
            `;

            return;
        }

        let url="/ia/avaliar?";

        if(cnpj){

            url += `cnpj=${cnpj}`;

        }else{

            url +=
            `nome=${encodeURIComponent(nome)}`;
        }

        const response =
            await fetch(url);

        const data =
            await response.json();

        if(data.erro){

            resultado.innerHTML=`
                <p class="text-red-500">
                    ${data.erro}
                </p>
            `;

            return;
        }

        resultado.innerHTML=`

            <div class="space-y-2">

                <p class="font-bold text-xl">
                    ${data.nome}
                </p>

                <p>
                    <strong>CNPJ:</strong>
                    ${data.cnpj}
                </p>

                <p>
                    <strong>Score:</strong>
                    ${data.score}
                </p>

                <p class="text-green-600 font-semibold">
                    ${data.classificacao}
                </p>

                <p class="text-blue-600">
                    ${data.decisao_ia}
                </p>

            </div>
        `;

    }

    catch(error){

        console.error(error);

        resultado.innerHTML=`
            <p class="text-red-500">
                Erro ao buscar fornecedor
            </p>
        `;
    }
}


// =====================================
// CADASTRO
// =====================================

async function cadastrarFornecedor(){

    try{

        const nome =
            document
            .getElementById("novoNome")
            .value
            .trim();

        let cnpj =
            document
            .getElementById("novoCnpj")
            .value
            .trim();

        cnpj =
            cnpj.replace(/\D/g,"");

        if(!nome || !cnpj){

            alert(
                "Preencha nome e CNPJ"
            );

            return;
        }

        const response =
            await fetch(

                `/fornecedor?nome=${encodeURIComponent(nome)}&cnpj=${cnpj}`,

                {
                    method:"POST"
                }
            );

        const data =
            await response.json();

        if(data.erro){

            alert(data.erro);

            return;
        }

        alert(data.mensagem);

        document.getElementById(
            "novoNome"
        ).value="";

        document.getElementById(
            "novoCnpj"
        ).value="";

        await carregarRanking();

    }

    catch(error){

        console.error(error);

        alert(
            "Erro ao cadastrar fornecedor"
        );
    }
}

// =====================================
// VALIDADOR CNPJ
// =====================================

function validarCNPJ(cnpj){

    cnpj = cnpj.replace(/\D/g,'');

    if(cnpj.length !== 14)
        return false;

    // elimina repetidos
    if(/^(\d)\1+$/.test(cnpj))
        return false;

    let tamanho =
        cnpj.length - 2;

    let numeros =
        cnpj.substring(0,tamanho);

    let digitos =
        cnpj.substring(tamanho);

    let soma = 0;
    let pos = tamanho - 7;

    for(let i=tamanho;i>=1;i--){

        soma +=
            numeros.charAt(
                tamanho-i
            ) * pos--;

        if(pos < 2)
            pos = 9;
    }

    let resultado =
        soma % 11 < 2
        ? 0
        : 11 - soma % 11;

    if(resultado != digitos.charAt(0))
        return false;

    tamanho += 1;

    numeros =
        cnpj.substring(
            0,
            tamanho
        );

    soma = 0;

    pos =
        tamanho - 7;

    for(let i=tamanho;i>=1;i--){

        soma +=
            numeros.charAt(
                tamanho-i
            ) * pos--;

        if(pos < 2)
            pos = 9;
    }

    resultado =
        soma % 11 < 2
        ? 0
        : 11 - soma % 11;

    if(resultado != digitos.charAt(1))
        return false;

    return true;
}

// =====================================
// KPI DASHBOARD
// =====================================

function atualizarDashboard(data){

    const total =
        data.length;

    let scoreTotal = 0;
    let aprovados = 0;
    let criticos = 0;

    data.forEach(f=>{

        scoreTotal +=
            Number(f.score || 0);

        if(
            f.classificacao
            ?.startsWith("A")
        ){
            aprovados++;
        }

        if(
            f.classificacao
            ?.startsWith("C")
        ){
            criticos++;
        }
    });

    const scoreMedio =

        total > 0

        ? (
            scoreTotal / total
        ).toFixed(1)

        : 0;

    document.getElementById(
        "kpiTotal"
    ).innerText = total;

    document.getElementById(
        "kpiScore"
    ).innerText = scoreMedio;

    document.getElementById(
        "kpiAprovados"
    ).innerText = aprovados;

    document.getElementById(
        "kpiCriticos"
    ).innerText = criticos;
}


// =====================================
// GRÁFICO
// =====================================

function atualizarGrafico(data){

    const canvas =
        document.getElementById(
            "rankingChart"
        );

    if(!canvas){

        console.log(
            "Canvas não encontrado"
        );

        return;
    }

    const nomes =
        data.map(
            f=>f.nome
        );

    const cores =
        data.map(f => {

            if(
                f.classificacao?.startsWith("A")
            )
                return "#16a34a"; // verde

            else if(
                f.classificacao?.startsWith("B")
            )
                return "#eab308"; // amarelo

            else if(
                f.classificacao?.startsWith("C")
            )
                return "#dc2626"; // vermelho

            return "#2563eb"; // padrão
        });

    const scores =
        data.map(
            f=>Number(f.score)
        );

            if(rankingChart){

                rankingChart.destroy();
            }

            rankingChart = new Chart(

        canvas,

        {

            type:"bar",

            data:{

                labels:nomes,

                datasets:[{

                    label:"Score ESG",

                    data:scores,

                    backgroundColor:cores,

                    borderColor:cores,

                    borderWidth:1

                }]
            },

            options:{

                responsive:true,

                maintainAspectRatio:false,

                plugins:{

                    legend:{
                        display:false
                    }
                },

                scales:{

                    y:{

                        beginAtZero:true,

                        max:100
                    }
                }
            }
        }
    );
}


// =====================================
// RANKING
// =====================================

async function carregarRanking(){

    try{

        const response =
            await fetch(
                "/ia/ranking"
            );

        const data =
            await response.json();

        atualizarDashboard(data);

        atualizarGrafico(data);

        const ranking =
            document.getElementById(
                "ranking"
            );

        if(!ranking) return;

        let html="";

        data.forEach(
            (f,index)=>{

                let cor =
                    "text-gray-700";

                if(
                    f.classificacao
                    ?.startsWith("A")
                )
                    cor="text-green-600";

                else if(
                    f.classificacao
                    ?.startsWith("B")
                )
                    cor="text-yellow-600";

                else if(
                    f.classificacao
                    ?.startsWith("C")
                )
                    cor="text-red-600";

                html += `

                <tr class="border-b hover:bg-gray-50">

                    <td class="p-2">

                        ${index+1}º — ${f.nome}

                    </td>

                    <td class="p-2 text-center">

                        ${f.score}

                    </td>

                    <td class="p-2 text-center ${cor} font-semibold">

                        ${f.classificacao}

                    </td>

                </tr>
                `;
            }
        );

        ranking.innerHTML = html;

    }

    catch(error){

        console.error(
            "Erro ranking:",
            error
        );
    }
}