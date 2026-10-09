-- ============================================================
-- SCRIPT DE CRIAÇÃO DA TABELA DE PEDIDOS NO SUPABASE
-- Projeto: Bolos Caseirinhos
-- ============================================================

-- 1. Criação da tabela 'pedidos'
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    cliente_nome TEXT NOT NULL,
    cliente_email TEXT NOT NULL,
    cliente_cpf TEXT,
    cliente_cep TEXT,
    cliente_rua TEXT,
    cliente_numero TEXT,
    cliente_bairro TEXT,
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    valor_total NUMERIC(10,2) NOT NULL,
    forma_pagamento TEXT DEFAULT 'pix',
    status_pagamento TEXT DEFAULT 'pending', -- 'pending', 'approved', 'pago', 'cancelled'
    mercadopago_id TEXT
);

-- 2. Índices para agilizar consultas e webhooks
CREATE INDEX IF NOT EXISTS idx_pedidos_mercadopago_id ON public.pedidos (mercadopago_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON public.pedidos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos (status_pagamento);

-- 3. Configuração de Políticas de Segurança (Row Level Security - RLS)
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Permite inserção e atualização pela service_role (backend Node.js)
CREATE POLICY "Permitir operacoes completas para service_role" 
ON public.pedidos 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Permite leitura autenticada ou anônima conforme necessidade da loja
CREATE POLICY "Permitir leitura para usuarios autenticados" 
ON public.pedidos 
FOR SELECT 
TO authenticated 
USING (true);
