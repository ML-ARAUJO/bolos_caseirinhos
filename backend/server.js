require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { createClient } = require('@supabase/supabase-js');

const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de Middlewares
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do Front-end (index.html, style.css, app.js, img/)
app.use(express.static(path.join(__dirname, '..')));

// 1. Inicialização do Mercado Pago
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
let paymentClient = null;

if (accessToken) {
    const client = new MercadoPagoConfig({ accessToken: accessToken });
    paymentClient = new Payment(client);
    console.log('✅ Mercado Pago SDK inicializado com sucesso.');
} else {
    console.warn('⚠️ AVISO: MERCADOPAGO_ACCESS_TOKEN não foi configurado no arquivo .env!');
}

// 2. Inicialização do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Cliente do Supabase conectado com sucesso.');
} else {
    console.warn('⚠️ AVISO: SUPABASE_URL ou chaves do Supabase (SUPABASE_SECRET_KEY / SUPABASE_KEY) não configuradas no arquivo .env!');
}

// Rota de Healthcheck
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        servico: 'Backend Bolos Caseirinhos',
        mercadopago: !!paymentClient,
        supabase: !!supabase
    });
});

// 3. Rota de Processamento de Pagamento PIX e Registro no Supabase
app.post('/api/processar-pagamento', async (req, res) => {
    try {
        if (!paymentClient) {
            return res.status(500).json({ error: 'Mercado Pago não configurado no servidor.' });
        }

        const { transaction_amount, description, payment_method_id, payer, itens } = req.body;

        console.log('📥 Recebendo pedido de pagamento:', {
            valor: transaction_amount,
            comprador: payer?.first_name,
            email: payer?.email,
            itens_qtd: itens?.length || 0
        });

        // Validação do método de pagamento
        if (payment_method_id !== 'pix') {
            return res.status(400).json({
                error: 'Método não suportado temporariamente',
                message: 'No momento, o pagamento online está disponível exclusivamente via PIX com aprovação instantânea.'
            });
        }

        // Estrutura o payload para a API do Mercado Pago
        const paymentData = {
            body: {
                transaction_amount: Number(transaction_amount),
                description: description || 'Pedido Bolos Caseirinhos',
                payment_method_id: 'pix',
                payer: {
                    email: payer.email,
                    first_name: payer.first_name,
                    last_name: payer.last_name || 'Cliente',
                    identification: payer.identification,
                    address: payer.address
                }
            }
        };

        // Gera o pagamento no Mercado Pago
        const mpResponse = await paymentClient.create(paymentData);

        console.log('✅ Pagamento gerado no Mercado Pago! ID:', mpResponse.id);

        // Extrai dados do PIX
        const qrCodeText = mpResponse.point_of_interaction?.transaction_data?.qr_code || '';
        const qrCodeBase64 = mpResponse.point_of_interaction?.transaction_data?.qr_code_base64 || '';

        // Se o Supabase estiver configurado, salva o pedido na tabela 'pedidos' com os itens
        let pedidoSalvo = null;
        if (supabase) {
            const nomeCompleto = `${payer.first_name || ''} ${payer.last_name || ''}`.trim();
            
            const { data, error } = await supabase
                .from('pedidos')
                .insert([{
                    cliente_nome: nomeCompleto || 'Cliente',
                    cliente_email: payer.email,
                    cliente_cpf: payer.identification?.number || '',
                    cliente_cep: payer.address?.zip_code || '',
                    cliente_rua: payer.address?.street_name || '',
                    cliente_numero: payer.address?.street_number || '',
                    cliente_bairro: payer.address?.neighborhood || '',
                    itens: Array.isArray(itens) ? itens : [],
                    valor_total: Number(transaction_amount),
                    forma_pagamento: payment_method_id || 'pix',
                    status_pagamento: mpResponse.status || 'pending',
                    mercadopago_id: String(mpResponse.id)
                }])
                .select();

            if (error) {
                console.error('❌ Erro ao salvar pedido no Supabase:', error.message);
            } else {
                console.log('📦 Pedido gravado no Supabase com sucesso!');
                pedidoSalvo = data;
            }
        }

        // Retorna a resposta completa para o Front-end
        res.status(201).json({
            id: mpResponse.id,
            status: mpResponse.status,
            qr_code: qrCodeText,
            qr_code_base64: qrCodeBase64,
            pedido_banco: pedidoSalvo
        });

    } catch (error) {
        console.error('❌ Erro no processamento do pagamento:', error);
        res.status(500).json({
            error: 'Erro ao processar pagamento',
            message: error.message || 'Erro interno no servidor'
        });
    }
});

// 4. Webhook do Mercado Pago (Atualização automática de status no Supabase ao pagar o PIX)
app.post('/api/webhooks/mercadopago', async (req, res) => {
    try {
        const { type, data } = req.body;

        if (type === 'payment' && data?.id && paymentClient && supabase) {
            const paymentInfo = await paymentClient.get({ id: data.id });
            console.log(`🔔 Webhook recebido - Pagamento ${data.id} Status: ${paymentInfo.status}`);

            if (paymentInfo.status === 'approved') {
                const { error } = await supabase
                    .from('pedidos')
                    .update({ status_pagamento: 'pago' })
                    .eq('mercadopago_id', String(data.id));

                if (error) {
                    console.error('❌ Erro ao atualizar status no Supabase via Webhook:', error.message);
                } else {
                    console.log(`🎉 Pedido MP #${data.id} atualizado para 'pago' no Supabase!`);
                }
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('❌ Erro ao processar Webhook:', error);
        res.status(500).send('Erro no Webhook');
    }
});

// Inicialização do Servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor Backend do Bolos Caseirinhos rodando na porta ${PORT}`);
    console.log(`👉 Teste de saúde: http://localhost:${PORT}/api/health`);
    console.log(`👉 API de Pagamentos: http://localhost:${PORT}/api/processar-pagamento`);
});
