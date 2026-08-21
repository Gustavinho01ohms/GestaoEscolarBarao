let turmaSelecionada = null;
let slotSelecionado = { dia: null, aula: null };
let opcoesDeAula = []; 
let gradeAtual = []; // Guarda a grade toda na memória para fazermos as contas

const horariosAulas = [
    { num: 1, tempo: "14:20 - 15:10" },
    { num: 2, tempo: "15:10 - 16:00" },
    { num: 3, tempo: "16:00 - 16:50" },
    { tipo: "break", texto: "☕ 1º Intervalo (16:50 - 17:05)" },
    { num: 4, tempo: "17:05 - 17:55" },
    { num: 5, tempo: "17:55 - 18:45" },
    { tipo: "break", texto: "🍽️ Jantar (18:45 - 19:50)", classe: "major-break" },
    { num: 6, tempo: "19:50 - 20:40" },
    { num: 7, tempo: "20:40 - 21:30" }
];

document.addEventListener('DOMContentLoaded', carregarListaTurmas);

async function carregarListaTurmas() {
    try {
        const resposta = await fetch('http://localhost:3000/api/turmas');
        const turmas = await resposta.json();
        const select = document.getElementById('filtroTurma');
        select.innerHTML = '<option value="">Escolha uma turma...</option>';
        turmas.forEach(t => select.innerHTML += `<option value="${t.id}">${t.nome}</option>`);
    } catch (e) {
        alert("Erro ao carregar turmas.");
    }
}

async function carregarGrade() {
    turmaSelecionada = document.getElementById('filtroTurma').value;
    
    if (!turmaSelecionada) {
        document.getElementById('tabelaGrade').style.display = 'none';
        return;
    }

    // CORREÇÃO 1: Adicionado o { cache: 'no-store' } para obrigar a buscar dados novos
    const resAtrib = await fetch(`http://localhost:3000/api/atribuicoes/turma/${turmaSelecionada}`, { cache: 'no-store' });
    opcoesDeAula = await resAtrib.json();

    desenharTabela();
    document.getElementById('tabelaGrade').style.display = 'table';
    
    // CORREÇÃO 2: Adicionado o { cache: 'no-store' } aqui também
    const resGrade = await fetch(`http://localhost:3000/api/horarios/${turmaSelecionada}`, { cache: 'no-store' });
    const gradeSalva = await resGrade.json();
    
    if (!resGrade.ok) return;

    gradeAtual = gradeSalva; // Salva na memória

    gradeAtual.forEach(item => {
        const celula = document.getElementById(`slot-${item.dia_semana}-${item.aula_num}`);
        if (celula) {
            celula.innerHTML = `
                <div class="subject">${item.atribuicoes.disciplinas.nome}</div>
                <div class="details">${item.atribuicoes.usuarios.nome}</div>
            `;
        }
    });
}

function desenharTabela() {
    const tbody = document.getElementById('corpoGrade');
    tbody.innerHTML = '';

    horariosAulas.forEach(linha => {
        if (linha.tipo === 'break') {
            tbody.innerHTML += `<tr class="break-row ${linha.classe || ''}"><td colspan="6">${linha.texto}</td></tr>`;
        } else {
            let tr = `<tr><td class="time-cell">${linha.tempo}<small>${linha.num}ª Aula</small></td>`;
            for (let dia = 1; dia <= 5; dia++) {
                tr += `<td>
                    <div class="editable" id="slot-${dia}-${linha.num}" onclick="abrirModal(${dia}, ${linha.num})">
                        <div class="details" style="text-align:center;">Livre</div>
                    </div>
                </td>`;
            }
            tr += `</tr>`;
            tbody.innerHTML += tr;
        }
    });
}

// A MÁGICA DOS LIMITES ACONTECE AQUI
function abrirModal(dia, aula) {
    slotSelecionado = { dia, aula };
    
    const diasNomes = ["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
    document.getElementById('textoSlot').innerText = `${diasNomes[dia]} - ${aula}ª Aula`;

    const select = document.getElementById('selectAtribuicao');
    select.innerHTML = '<option value="">-- Horário Livre --</option>';
    
    opcoesDeAula.forEach(op => {
        // Conta quantas vezes essa matéria JÁ está na grade da semana
        let usadas = 0;
        gradeAtual.forEach(g => {
            // CORREÇÃO 3: Usando parseInt() para garantir que compara número com número
            if (parseInt(g.atribuicao_id) === parseInt(op.id)) usadas++;
        });

        const limite = op.disciplinas.quantidade_aulas;
        const restam = limite - usadas;

        // Se clicarmos no quadrado que JÁ É daquela matéria, não consideramos como limite estourado
        const itemAtual = gradeAtual.find(g => g.dia_semana === dia && g.aula_num === aula);
        // CORREÇÃO 4: parseInt()
        const ehEstaAula = (itemAtual && parseInt(itemAtual.atribuicao_id) === parseInt(op.id));

        let textoExtra = `(Restam ${restam} de ${limite})`;
        let bloqueado = '';

        if (restam <= 0 && !ehEstaAula) {
            textoExtra = `(LIMITE ATINGIDO - Max. ${limite})`;
            bloqueado = 'disabled'; // Trava a opção!
        }

        select.innerHTML += `<option value="${op.id}" ${bloqueado}>
            ${op.disciplinas.nome} (${op.usuarios.nome}) ${textoExtra}
        </option>`;
    });

    document.getElementById('qtdAulas').value = "1";
    document.getElementById('modalAula').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modalAula').style.display = 'none';
}

// VALIDAÇÃO RIGOROSA NA HORA DE SALVAR
async function salvarAula() {
    const atribuicao_id = document.getElementById('selectAtribuicao').value;
    const qtd = parseInt(document.getElementById('qtdAulas').value);

    // Se salvou como Livre, chamamos a função de limpar
    if (!atribuicao_id) return limparAula();

    // CORREÇÃO 5: parseInt()
    const atribuicao = opcoesDeAula.find(op => parseInt(op.id) === parseInt(atribuicao_id));
    const limiteAulas = atribuicao.disciplinas.quantidade_aulas;

    // Calcula quais slots serão alterados
    const slotsParaAlterar = [];
    for (let i = 0; i < qtd; i++) {
        const aulaAtual = slotSelecionado.aula + i;
        if (aulaAtual > 7) break;
        slotsParaAlterar.push({ dia: slotSelecionado.dia, aula: aulaAtual });
    }

    // Calcula qual será o total de aulas DESSA MATÉRIA na grade DEPOIS de salvar
    let quantidadeFutura = 0;
    for (let d = 1; d <= 5; d++) {
        for (let a = 1; a <= 7; a++) {
            const sendoAlterado = slotsParaAlterar.find(s => s.dia === d && s.aula === a);
            if (sendoAlterado) {
                quantidadeFutura++;
            } else {
                const itemAtual = gradeAtual.find(g => g.dia_semana === d && g.aula_num === a);
                // CORREÇÃO 6: parseInt()
                if (itemAtual && parseInt(itemAtual.atribuicao_id) === parseInt(atribuicao_id)) {
                    quantidadeFutura++;
                }
            }
        }
    }

    // A TRAVA FINAL!
    if (quantidadeFutura > limiteAulas) {
        alert(`❌ Limite excedido!\nEssa matéria permite no máximo ${limiteAulas} aula(s), mas sua ação resultaria em ${quantidadeFutura} aulas.`);
        return;
    }

    try {
        const requisicoes = [];
        for (let s of slotsParaAlterar) {
            requisicoes.push(
                fetch('http://localhost:3000/api/horarios', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        turma_id: turmaSelecionada,
                        dia_semana: s.dia,
                        aula_num: s.aula,
                        atribuicao_id: atribuicao_id
                    })
                })
            );
        }

        await Promise.all(requisicoes);
        fecharModal();
        carregarGrade();
    } catch (e) {
        alert("Erro ao salvar horário.");
    }
}

async function limparAula() {
    const qtd = parseInt(document.getElementById('qtdAulas').value);

    try {
        const requisicoes = [];

        for (let i = 0; i < qtd; i++) {
            const aulaAtual = slotSelecionado.aula + i;
            if (aulaAtual > 7) break;

            requisicoes.push(
                fetch('http://localhost:3000/api/horarios', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        turma_id: turmaSelecionada,
                        dia_semana: slotSelecionado.dia,
                        aula_num: aulaAtual,
                        atribuicao_id: null 
                    })
                })
            );
        }

        await Promise.all(requisicoes);
        fecharModal();
        carregarGrade();
    } catch (e) {
        alert("Erro ao tentar limpar as aulas.");
    }
}