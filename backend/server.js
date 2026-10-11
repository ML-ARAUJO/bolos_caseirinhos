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

        let mpResponse = null;
        let qrCodeText = '';
        let qrCodeBase64 = '';
        let paymentId = '';
        let paymentStatus = 'pending';

        // 1. Tenta gerar via Orders API (/v1/orders) - padrão do novo Checkout Transparente via Orders
        let ordersErrorDetail = null;
        try {
            console.log('🔄 Tentando criar PIX via Orders API (/v1/orders)...');
            const idempotencyKey = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
            const totalAmountStr = Number(transaction_amount).toFixed(2);

            // De acordo com a documentação oficial para teste de PIX no Orders API:
            // payer.email deve ser test_user_br@testuser.com e first_name deve ser 'APRO'
            const orderPayload = {
                type: 'online',
                external_reference: `PEDIDO-${Date.now()}`,
                total_amount: totalAmountStr,
                payer: {
                    email: 'test_user_br@testuser.com',
                    first_name: 'APRO'
                },
                transactions: {
                    payments: [
                        {
                            amount: totalAmountStr,
                            payment_method: {
                                id: 'pix',
                                type: 'bank_transfer'
                            }
                        }
                    ]
                }
            };

            console.log('📦 Enviando payload para /v1/orders:', JSON.stringify(orderPayload));

            const orderRes = await fetch('https://api.mercadopago.com/v1/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'X-Idempotency-Key': idempotencyKey
                },
                body: JSON.stringify(orderPayload)
            });

            const orderData = await orderRes.json();
            console.log(`📡 Status da Orders API: ${orderRes.status}`, orderData);

            if (orderRes.ok && (orderData.id || orderData.transactions)) {
                console.log('✅ Pedido PIX gerado via Orders API com sucesso! ID:', orderData.id);
                const paymentTx = orderData.transactions?.payments?.[0];
                paymentId = paymentTx?.id || orderData.id;
                paymentStatus = paymentTx?.status || orderData.status || 'pending';
                qrCodeText = paymentTx?.payment_method?.qr_code || '';
                qrCodeBase64 = paymentTx?.payment_method?.qr_code_base64 || '';
                mpResponse = orderData;
            } else {
                ordersErrorDetail = orderData;
                const errMsg = orderData.message || (orderData.cause && orderData.cause[0]?.description) || JSON.stringify(orderData);
                throw new Error(`Orders API erro (${orderRes.status}): ${errMsg}`);
            }
        } catch (ordersErr) {
            console.warn('⚠️ Falha na Orders API:', ordersErr.message);
            console.warn('⚠️ Tentando fallback para Payments API (/v1/payments)...');

            // 2. Fallback para Payments API legada (/v1/payments)
            const paymentData = {
                body: {
                    transaction_amount: Number(transaction_amount),
                    description: description || 'Pedido Bolos Caseirinhos',
                    payment_method_id: 'pix',
                    notification_url: 'https://bolos-caseirinhos.onrender.com/api/webhooks/mercadopago',
                    payer: {
                        email: payer.email,
                        first_name: payer.first_name,
                        last_name: payer.last_name || 'Cliente',
                        identification: payer.identification,
                        address: payer.address
                    }
                }
            };

            const legacyResponse = await paymentClient.create(paymentData);
            console.log('✅ Pagamento gerado via Payments API! ID:', legacyResponse.id);
            paymentId = legacyResponse.id;
            paymentStatus = legacyResponse.status || 'pending';
            qrCodeText = legacyResponse.point_of_interaction?.transaction_data?.qr_code || '';
            qrCodeBase64 = legacyResponse.point_of_interaction?.transaction_data?.qr_code_base64 || '';
            mpResponse = legacyResponse;
        }

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
                    status_pagamento: paymentStatus || 'pending',
                    mercadopago_id: String(paymentId)
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
            id: paymentId,
            status: paymentStatus,
            qr_code: qrCodeText,
            qr_code_base64: qrCodeBase64,
            pedido_banco: pedidoSalvo
        });

    } catch (error) {
        console.error('❌ Erro no processamento do pagamento:', error);
        res.status(500).json({
            error: 'Erro ao processar pagamento',
            message: error.message || 'Erro interno no servidor',
            orders_error: ordersErrorDetail
        });
    }
});

// 4. Webhook do Mercado Pago (Atualização automática de status no Supabase ao pagar o PIX)
app.post('/api/webhooks/mercadopago', async (req, res) => {
    try {
        const { type, data, action } = req.body || {};
        const paymentId = data?.id || req.body?.id || req.query?.['data.id'] || req.query?.id;
        const eventType = type || action || req.query?.type || req.query?.topic;

        console.log('🔔 Notificação Webhook recebida:', { eventType, paymentId });

        if (paymentId && paymentClient && supabase) {
            const paymentInfo = await paymentClient.get({ id: paymentId });
            console.log(`📊 Status atualizado do Pagamento ${paymentId}: ${paymentInfo.status}`);

            if (paymentInfo.status === 'approved') {
                const { error } = await supabase
                    .from('pedidos')
                    .update({ status_pagamento: 'pago' })
                    .eq('mercadopago_id', String(paymentId));

                if (error) {
                    console.error('❌ Erro ao atualizar status no Supabase via Webhook:', error.message);
                } else {
                    console.log(`🎉 Pedido MP #${paymentId} atualizado para 'pago' no Supabase!`);
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
