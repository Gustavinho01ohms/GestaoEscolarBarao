const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// CONFIGURAÇÃO DO SUPABASE (COLE SEUS DADOS AQUI)
// ==========================================
const supabaseUrl = 'https://mdqlznxqxtfxuyswtbxo.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kcWx6bnhxeHRmeHV5c3d0YnhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMyNzUyOSwiZXhwIjoyMTAyOTAzNTI5fQ.y36drqYroyxUII_bLWN-m13rrAxSM3knSGZrFfhb4bk'; 
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// ROTA 1: LOGIN DE USUÁRIOS
// ==========================================
app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        // Busca o usuário no Supabase
        const { data: usuarios, error } = await supabase
            .from('usuarios')
            .select('id, senha_hash, status, perfil_id')
            .eq('email', email);

        if (error) throw error;

        // Se não achou nenhum usuário com esse email
        if (!usuarios || usuarios.length === 0) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' });
        }

        const usuario = usuarios[0];
        
        // Verifica a senha
        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaValida) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' });
        }

        // Verifica o Status (Aprovação da Gestão)
        if (usuario.status === 'PENDENTE') {
            return res.status(403).json({ erro: 'Acesso negado.', motivo: 'PENDENTE' });
        }
        if (usuario.status === 'INATIVO') {
            return res.status(403).json({ erro: 'Sua conta foi desativada. Procure a direção.' });
        }

        // Tudo certo!
        res.status(200).json({ 
            mensagem: 'Login realizado com sucesso',
            perfil_id: usuario.perfil_id 
        });

    } catch (erro) {
        console.error("Erro no login:", erro);
        res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
});

// ==========================================
// ROTA 2: CADASTRO DE NOVOS USUÁRIOS
// ==========================================
app.post('/api/cadastro', async (req, res) => {
    const { nome, cpf, email, senha, perfil_id } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        // Insere os dados usando a API do Supabase
        const { error } = await supabase
            .from('usuarios')
            .insert([
                { nome, cpf, email, senha_hash: senhaHash, perfil_id }
            ]);

        if (error) {
            // Verifica se é erro de duplicação (CPF ou Email já existem)
            if (error.code === '23505') {
                return res.status(400).json({ erro: 'Este e-mail ou CPF já está cadastrado no sistema.' });
            }
            throw error;
        }

        res.status(201).json({ mensagem: 'Cadastro recebido com sucesso. Aguardando aprovação.' });

    } catch (erro) {
        console.error("Erro no cadastro:", erro);
        res.status(500).json({ erro: 'Erro interno ao tentar salvar no banco.' });
    }
});

// ==========================================
// ROTA 3: LISTAR USUÁRIOS PENDENTES
// ==========================================
app.get('/api/usuarios/pendentes', async (req, res) => {
    try {
        // Busca no Supabase apenas quem tem o status PENDENTE
        const { data: usuarios, error } = await supabase
            .from('usuarios')
            .select('id, nome, cpf, email, criado_em')
            .eq('status', 'PENDENTE')
            .order('criado_em', { ascending: false }); // Os mais recentes primeiro

        if (error) throw error;

        res.status(200).json(usuarios);

    } catch (erro) {
        console.error("Erro ao buscar pendentes:", erro);
        res.status(500).json({ erro: 'Erro ao buscar lista de usuários.' });
    }
});

// ==========================================
// ROTA 4: APROVAR OU RECUSAR ACESSO
// ==========================================
app.put('/api/usuarios/status/:id', async (req, res) => {
    const { id } = req.params;
    const { novoStatus } = req.body; // 'ATIVO' ou 'INATIVO'

    try {
        const { error } = await supabase
            .from('usuarios')
            .update({ status: novoStatus })
            .eq('id', id);

        if (error) throw error;

        res.status(200).json({ mensagem: `Status atualizado para ${novoStatus}` });

    } catch (erro) {
        console.error("Erro ao atualizar status:", erro);
        res.status(500).json({ erro: 'Erro ao atualizar o usuário.' });
    }
});

// ==========================================
// ROTA 5: CRIAR NOVA DISCIPLINA
// ==========================================
app.post('/api/disciplinas', async (req, res) => {
    const { nome, quantidade_aulas } = req.body;

    try {
        const { error } = await supabase
            .from('disciplinas')
            .insert([{ nome, quantidade_aulas }]);

        if (error) {
            // Se tentar salvar uma matéria com o mesmo nome, o banco devolve 23505 e o Node envia o status 400
            if (error.code === '23505') {
                return res.status(400).json({ erro: 'Esta disciplina já existe no sistema.' });
            }
            throw error;
        }

        res.status(201).json({ mensagem: 'Disciplina cadastrada com sucesso!' });
    } catch (erro) {
        console.error("Erro ao cadastrar disciplina:", erro);
        res.status(500).json({ erro: 'Erro interno ao salvar disciplina.' });
    }
});

// ==========================================
// ROTA 6: LISTAR DISCIPLINAS
// ==========================================
app.get('/api/disciplinas', async (req, res) => {
    try {
        const { data: disciplinas, error } = await supabase
            .from('disciplinas')
            .select('*')
            .order('nome', { ascending: true }); // Traz em ordem alfabética

        if (error) throw error;

        // Devolve a lista para o JavaScript (frontend) desenhar a tabela
        res.status(200).json(disciplinas);
    } catch (erro) {
        console.error("Erro ao buscar disciplinas:", erro);
        res.status(500).json({ erro: 'Erro ao listar disciplinas.' });
    }
});
// ==========================================
// ROTA 7: ALTERAR DISCIPLINA (UPDATE)
// ==========================================
app.put('/api/disciplinas/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, quantidade_aulas } = req.body;

    try {
        const { error } = await supabase
            .from('disciplinas')
            .update({ nome, quantidade_aulas })
            .eq('id', id);

        if (error) {
            if (error.code === '23505') return res.status(400).json({ erro: 'Já existe outra disciplina com este nome.' });
            throw error;
        }

        res.status(200).json({ mensagem: 'Disciplina atualizada com sucesso!' });
    } catch (erro) {
        console.error("Erro ao atualizar disciplina:", erro);
        res.status(500).json({ erro: 'Erro ao atualizar a disciplina.' });
    }
});

// ==========================================
// ROTA 8: EXCLUIR DISCIPLINA (DELETE)
// ==========================================
app.delete('/api/disciplinas/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('disciplinas')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.status(200).json({ mensagem: 'Disciplina excluída com sucesso!' });
    } catch (erro) {
        console.error("Erro ao excluir disciplina:", erro);
        res.status(500).json({ erro: 'Erro ao excluir a disciplina.' });
    }
});

// ==========================================
// ROTAS PARA SALAS / TURMAS
// ==========================================
app.post('/api/turmas', async (req, res) => {
    const { nome, turno } = req.body;
    try {
        const { error } = await supabase.from('turmas').insert([{ nome, turno }]);
        if (error) {
            if (error.code === '23505') return res.status(400).json({ erro: 'Esta turma já existe.' });
            throw error;
        }
        res.status(201).json({ mensagem: 'Turma cadastrada com sucesso!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao salvar turma.' });
    }
});

app.get('/api/turmas', async (req, res) => {
    try {
        const { data, error } = await supabase.from('turmas').select('*').order('nome');
        if (error) throw error;
        res.status(200).json(data);
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar turmas.' });
    }
});

// ==========================================
// ROTAS PARA ATRIBUIÇÕES DE AULAS
// ==========================================
// 1. Buscar apenas usuários que são PROFESSORES (perfil_id = 2) para o Select
app.get('/api/professores', async (req, res) => {
    try {
        const { data, error } = await supabase.from('usuarios').select('id, nome').eq('perfil_id', 2).eq('status', 'ATIVO').order('nome');
        if (error) throw error;
        res.status(200).json(data);
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar professores.' });
    }
});

// 2. Salvar uma nova Atribuição
app.post('/api/atribuicoes', async (req, res) => {
    const { professor_id, turma_id, disciplina_id } = req.body;
    try {
        const { error } = await supabase.from('atribuicoes').insert([{ professor_id, turma_id, disciplina_id }]);
        if (error) throw error;
        res.status(201).json({ mensagem: 'Aula atribuída com sucesso!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao atribuir. Verifique se já não existe.' });
    }
});

// 3. Listar as Atribuições juntando os nomes das 3 tabelas
app.get('/api/atribuicoes', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('atribuicoes')
            .select(`
                id,
                usuarios (nome),
                turmas (nome),
                disciplinas (nome)
            `);
        if (error) throw error;
        res.status(200).json(data);
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar atribuições.' });
    }
});

// ==========================================
// ROTAS DO QUADRO DE HORÁRIOS
// ==========================================

// 1. Busca as Atribuições de uma Turma específica
app.get('/api/atribuicoes/turma/:turma_id', async (req, res) => {
    const { turma_id } = req.params;
    try {
        const { data, error } = await supabase
            .from('atribuicoes')
            // ADICIONADO: Puxa também a 'quantidade_aulas' da disciplina
            .select('id, usuarios(nome), disciplinas(nome, quantidade_aulas)')
            .eq('turma_id', turma_id);
            
        if (error) throw error;
        res.status(200).json(data);
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar opções de aula.' });
    }
});

// 2. Busca o Horário salvo daquela turma
app.get('/api/horarios/:turma_id', async (req, res) => {
    const { turma_id } = req.params;
    try {
        const { data, error } = await supabase
            .from('grade_horaria')
            // ADICIONADO: Puxa também o 'atribuicao_id' para podermos contar matematicamente
            .select('dia_semana, aula_num, atribuicao_id, atribuicoes(usuarios(nome), disciplinas(nome))')
            .eq('turma_id', turma_id);
            
        if (error) throw error;
        res.status(200).json(data);
    } catch (erro) {
        console.error("ERRO REAL DO SUPABASE:", erro);
        res.status(500).json({ erro: 'Erro ao carregar o horário.' });
    }
});

// 3. Salva uma aula em um horário específico
app.post('/api/horarios', async (req, res) => {
    const { turma_id, dia_semana, aula_num, atribuicao_id } = req.body;
    try {
        // Primeiro, apagamos qualquer aula que já estivesse neste quadradinho
        await supabase.from('grade_horaria')
            .delete()
            .match({ turma_id, dia_semana, aula_num });

        // Se o usuário selecionou uma matéria (e não a opção "Livre"), nós salvamos
        if (atribuicao_id) {
            await supabase.from('grade_horaria')
                .insert([{ turma_id, dia_semana, aula_num, atribuicao_id }]);
        }
        
        res.status(200).json({ mensagem: 'Horário salvo!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao salvar o horário.' });
    }
});


app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000 conectado via API Supabase!');
});