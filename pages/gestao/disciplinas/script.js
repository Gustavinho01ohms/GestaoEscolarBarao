// ==========================================
// LÓGICA DE ALTERNAR ABAS (TABS)
// ==========================================
function abrirAba(evento, idAba) {
    // 1. Esconde todo o conteúdo de todas as abas
    const conteudos = document.getElementsByClassName("tab-content");
    for (let i = 0; i < conteudos.length; i++) {
        conteudos[i].classList.remove("active");
    }

    // 2. Remove o visual de "selecionado" de todos os botões
    const botoes = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < botoes.length; i++) {
        botoes[i].classList.remove("active");
    }

    // 3. Mostra a aba que foi clicada e acende o botão
    document.getElementById(idAba).classList.add("active");
    evento.currentTarget.classList.add("active");
}
document.addEventListener('DOMContentLoaded', carregarDisciplinas);

// ==========================================
// 1. SALVAR (CRIAR OU ATUALIZAR)
// ==========================================
document.getElementById('formDisciplina').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('disciplinaId').value;
    const nome = document.getElementById('nomeDisciplina').value;
    const quantidade_aulas = document.getElementById('qtdAulas').value;
    const divMensagem = document.getElementById('mensagem');

    // Se tem ID, é atualização (PUT). Se não tem, é criação (POST).
    const metodo = id ? 'PUT' : 'POST';
    const url = id ? `http://localhost:3000/api/disciplinas/${id}` : 'http://localhost:3000/api/disciplinas';

    try {
        const resposta = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, quantidade_aulas })
        });

        const dados = await resposta.json();

        divMensagem.className = 'mensagem';
        if (resposta.ok) {
            divMensagem.classList.add('sucesso');
            divMensagem.innerText = dados.mensagem;
            
            cancelarEdicao(); // Limpa o form e volta ao modo "Criação"
            carregarDisciplinas(); // Recarrega a tabela
        } else {
            divMensagem.classList.add('erro');
            divMensagem.innerText = dados.erro;
        }
        
        setTimeout(() => { divMensagem.classList.add('oculta'); }, 3000);

    } catch (erro) {
        alert('Erro ao conectar com o servidor.');
    }
});

// ==========================================
// 2. LISTAR DISCIPLINAS NA TABELA
// ==========================================
async function carregarDisciplinas() {
    const tbody = document.getElementById('tabelaDisciplinas');

    try {
        const resposta = await fetch('http://localhost:3000/api/disciplinas');
        const disciplinas = await resposta.json();

        tbody.innerHTML = '';

        if (disciplinas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Nenhuma disciplina cadastrada.</td></tr>';
            return;
        }

        disciplinas.forEach(disc => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${disc.nome}</strong></td>
                <td>${disc.quantidade_aulas} aulas</td>
                <td>
                    <!-- Botões de Editar e Excluir -->
                    <button class="btn-acao btn-aprovar" style="background-color: #3b82f6;" onclick="prepararEdicao(${disc.id}, '${disc.nome}', ${disc.quantidade_aulas})">Editar</button>
                    <button class="btn-acao btn-recusar" onclick="excluirDisciplina(${disc.id})">Excluir</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (erro) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">Erro ao carregar dados.</td></tr>';
    }
}

// ==========================================
// 3. PREPARAR EDIÇÃO (Joga os dados pro form)
// ==========================================
function prepararEdicao(id, nome, qtdAulas) {
    document.getElementById('disciplinaId').value = id;
    document.getElementById('nomeDisciplina').value = nome;
    document.getElementById('qtdAulas').value = qtdAulas;
    
    // Mostra o botão de cancelar e muda o texto do botão salvar
    document.getElementById('btnCancelar').style.display = 'inline-block';
    document.getElementById('btnSalvar').innerText = 'Atualizar';
}

// ==========================================
// 4. CANCELAR EDIÇÃO (Limpa o form)
// ==========================================
function cancelarEdicao() {
    document.getElementById('formDisciplina').reset();
    document.getElementById('disciplinaId').value = '';
    
    // Esconde o botão de cancelar e volta o texto normal
    document.getElementById('btnCancelar').style.display = 'none';
    document.getElementById('btnSalvar').innerText = 'Adicionar';
}

// ==========================================
// 5. EXCLUIR DISCIPLINA
// ==========================================
async function excluirDisciplina(id) {
    // Pede confirmação antes de apagar do banco
    if (!confirm("Tem certeza que deseja excluir esta disciplina? Isso não poderá ser desfeito.")) {
        return;
    }

    try {
        const resposta = await fetch(`http://localhost:3000/api/disciplinas/${id}`, {
            method: 'DELETE'
        });

        if (resposta.ok) {
            carregarDisciplinas(); // Recarrega a tabela para a disciplina sumir
        } else {
            const dados = await resposta.json();
            alert(dados.erro || 'Erro ao excluir a disciplina.');
        }
    } catch (erro) {
        alert('Erro ao conectar com o servidor.');
    }
}

// ==========================================
// LÓGICA DAS SALAS / TURMAS
// ==========================================
document.getElementById('formSala').addEventListener('submit', async function(e) {
    e.preventDefault();
    const nome = document.getElementById('nomeSala').value;
    const turno = document.getElementById('turnoSala').value;
    const divMensagem = document.getElementById('mensagem');

    try {
        const resposta = await fetch('http://localhost:3000/api/turmas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, turno })
        });
        const dados = await resposta.json();

        divMensagem.className = `mensagem ${resposta.ok ? 'sucesso' : 'erro'}`;
        divMensagem.innerText = dados.mensagem || dados.erro;
        divMensagem.style.display = 'block';

        if (resposta.ok) {
            document.getElementById('formSala').reset();
            carregarTurmas(); // Recarrega a tabela de turmas
            carregarSelectsAtribuicao(); // Atualiza a caixinha de turmas na aba de atribuição
        }
        setTimeout(() => { divMensagem.style.display = 'none'; }, 3000);
    } catch (erro) {
        alert('Erro ao salvar turma.');
    }
});

async function carregarTurmas() {
    const tbody = document.getElementById('tabelaSalas');
    try {
        const resposta = await fetch('http://localhost:3000/api/turmas');
        const turmas = await resposta.json();
        
        tbody.innerHTML = turmas.length === 0 ? '<tr><td colspan="3" style="text-align: center;">Nenhuma turma cadastrada.</td></tr>' : '';
        
        turmas.forEach(t => {
            tbody.innerHTML += `<tr>
                <td><strong>${t.nome}</strong></td>
                <td>${t.turno}</td>
                <td><button class="btn-acao btn-recusar" onclick="alert('Função de excluir em breve!')">Excluir</button></td>
            </tr>`;
        });
    } catch (erro) {
        tbody.innerHTML = '<tr><td colspan="3">Erro ao carregar.</td></tr>';
    }
}

// ==========================================
// LÓGICA DA ATRIBUIÇÃO DE PROFESSORES
// ==========================================
async function carregarSelectsAtribuicao() {
    try {
        // Carrega Professores
        const resProf = await fetch('http://localhost:3000/api/professores');
        const professores = await resProf.json();
        const selProf = document.getElementById('selectProfessor');
        selProf.innerHTML = '<option value="">Selecione um professor...</option>';
        professores.forEach(p => selProf.innerHTML += `<option value="${p.id}">${p.nome}</option>`);

        // Carrega Turmas
        const resTurma = await fetch('http://localhost:3000/api/turmas');
        const turmas = await resTurma.json();
        const selTurma = document.getElementById('selectSala');
        selTurma.innerHTML = '<option value="">Selecione a turma...</option>';
        turmas.forEach(t => selTurma.innerHTML += `<option value="${t.id}">${t.nome} (${t.turno})</option>`);

        // Carrega Disciplinas
        const resDisc = await fetch('http://localhost:3000/api/disciplinas');
        const disciplinas = await resDisc.json();
        const selDisc = document.getElementById('selectDisc');
        selDisc.innerHTML = '<option value="">Selecione a disciplina...</option>';
        disciplinas.forEach(d => selDisc.innerHTML += `<option value="${d.id}">${d.nome}</option>`);

    } catch (e) {
        console.error("Erro ao carregar selects:", e);
    }
}

document.getElementById('formAtribuicao').addEventListener('submit', async function(e) {
    e.preventDefault();
    const professor_id = document.getElementById('selectProfessor').value;
    const turma_id = document.getElementById('selectSala').value;
    const disciplina_id = document.getElementById('selectDisc').value;
    const divMensagem = document.getElementById('mensagem');

    if (!professor_id || !turma_id || !disciplina_id) {
        alert("Por favor, selecione todas as opções.");
        return;
    }

    try {
        const resposta = await fetch('http://localhost:3000/api/atribuicoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ professor_id, turma_id, disciplina_id })
        });
        
        if (resposta.ok) {
            alert("Aula atribuída com sucesso!");
            document.getElementById('formAtribuicao').reset();
            carregarAtribuicoes();
        } else {
            alert("Erro: Verifique se essa aula já não foi atribuída a este professor.");
        }
    } catch (erro) {
        alert('Erro ao atribuir aula.');
    }
});

async function carregarAtribuicoes() {
    const tbody = document.getElementById('tabelaAtribuicoes');
    try {
        const resposta = await fetch('http://localhost:3000/api/atribuicoes');
        const atribs = await resposta.json();
        
        tbody.innerHTML = atribs.length === 0 ? '<tr><td colspan="4" style="text-align: center;">Nenhuma atribuição feita.</td></tr>' : '';
        
        atribs.forEach(a => {
            tbody.innerHTML += `<tr>
                <td><strong>${a.usuarios.nome}</strong></td>
                <td>${a.turmas.nome}</td>
                <td>${a.disciplinas.nome}</td>
                <td><button class="btn-acao btn-recusar" onclick="alert('Em breve!')">Remover</button></td>
            </tr>`;
        });
    } catch (erro) {
        tbody.innerHTML = '<tr><td colspan="4">Erro ao carregar.</td></tr>';
    }
}

// Carregar tudo assim que a página abrir
document.addEventListener('DOMContentLoaded', () => {
    carregarTurmas();
    carregarAtribuicoes();
    carregarSelectsAtribuicao();
});