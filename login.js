document.getElementById('formLogin').addEventListener('submit', async function(event) {
    event.preventDefault(); // Evita que a página recarregue

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const divMensagem = document.getElementById('mensagem');
    const btnEntrar = document.getElementById('btnEntrar');

    // Desativa o botão enquanto processa
    btnEntrar.disabled = true;
    btnEntrar.innerText = 'Verificando...';

    try {
        // Envia os dados para a API
        const resposta = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email, senha: senha })
        });

        const dados = await resposta.json();

        // Limpa as classes da mensagem
        divMensagem.className = 'mensagem'; 

        if (resposta.ok) {
            divMensagem.classList.add('sucesso');
            divMensagem.innerText = 'Login aprovado! Redirecionando...';
            
            // Salva o perfil no navegador para manter o usuário logado
            localStorage.setItem('perfilLogado', dados.perfil_id);

            // Redirecionamento baseado no perfil retornado pelo banco (1 = Gestão, 2 = Professor)
            setTimeout(() => { 
                if (dados.perfil_id === 1) {
                    // Direciona para a página da Gestão
                    window.location.href = '/pages/gestao/index.html';
                } else if (dados.perfil_id === 2) {
                    // Direciona para a página do Professor
                    window.location.href = '/pages/professor/index.html'; 
                }
            }, 1500);

        } else {
            // Se o status for 403, a conta ainda não foi aprovada pela gestão
            if (resposta.status === 403 && dados.motivo === 'PENDENTE') {
                divMensagem.classList.add('aviso');
                divMensagem.innerText = 'Sua conta foi criada, mas aguarda a aprovação da Gestão.';
            } else {
                divMensagem.classList.add('erro');
                divMensagem.innerText = dados.erro || 'E-mail ou senha incorretos.';
            }
        }
    } catch (erro) {
        divMensagem.className = 'mensagem erro';
        divMensagem.innerText = 'Erro ao conectar com o servidor.';
    } finally {
        btnEntrar.disabled = false;
        btnEntrar.innerText = 'Entrar';
    }
});