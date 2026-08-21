document.addEventListener('DOMContentLoaded', carregarPendentes);

async function carregarPendentes() {
    const tbody = document.getElementById('tabelaPendentes');

    try {
        const resposta = await fetch('http://localhost:3000/api/usuarios/pendentes');
        const usuarios = await resposta.json();

        // Limpa a tabela
        tbody.innerHTML = '';

        if (usuarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhum cadastro pendente.</td></tr>';
            return;
        }

        // Monta as linhas da tabela
        usuarios.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.nome}</td>
                <td>${user.cpf}</td>
                <td>${user.email}</td>
                <td>
                    <button class="btn-acao btn-aprovar" onclick="atualizarStatus(${user.id}, 'ATIVO')">Aprovar</button>
                    <button class="btn-acao btn-recusar" onclick="atualizarStatus(${user.id}, 'INATIVO')">Recusar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (erro) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Erro ao carregar dados.</td></tr>';
    }
}

async function atualizarStatus(id, novoStatus) {
    const divMensagem = document.getElementById('mensagem');
    
    // Pequena confirmação antes de recusar
    if (novoStatus === 'INATIVO' && !confirm('Tem certeza que deseja recusar este acesso?')) return;

    try {
        const resposta = await fetch(`http://localhost:3000/api/usuarios/status/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novoStatus })
        });

        if (resposta.ok) {
            divMensagem.className = 'mensagem sucesso';
            divMensagem.innerText = `Acesso ${novoStatus === 'ATIVO' ? 'aprovado' : 'recusado'} com sucesso!`;
            
            // Recarrega a tabela para sumir com o usuário aprovado
            carregarPendentes();
            
            // Esconde a mensagem após 3 segundos
            setTimeout(() => { divMensagem.classList.add('oculta'); }, 3000);
        } else {
            alert('Erro ao atualizar status.');
        }

    } catch (erro) {
        alert('Erro de conexão com o servidor.');
    }
}