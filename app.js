document.addEventListener('DOMContentLoaded', () => {
    // Lista de produtos conforme catálogo da loja
    const bolos = [
        {
            id: 'chocolate',
            nome: 'Bolo de Chocolate',
            descricao: 'Delicioso bolo de chocolate com cobertura cremosa.',
            preco: 35.00,
            imagem: 'img/chocolate.jpg'
        },
        {
            id: 'cenoura',
            nome: 'Bolo de Cenoura',
            descricao: 'Massa fofinha de cenoura com cobertura generosa de brigadeiro.',
            preco: 35.00,
            imagem: 'img/cenoura.jpg'
        },
        {
            id: 'milho',
            nome: 'Bolo de Milho',
            descricao: 'Massa aveludada com gosto de casa de vó.',
            preco: 30.00,
            imagem: 'img/milho.jpg'
        },
        {
            id: 'chocoDePote',
            nome: 'Chocolate de Pote',
            descricao: 'Aquele Bolo de pote delicioso e pratico.',
            preco: 8.00,
            imagem: 'img/poteChoco.jpg'
        },
        {
            id: 'cenouDePote',
            nome: 'Cenoura de Pote',
            descricao: 'Aquele Bolo de pote delicioso e pratico.',
            preco: 8.00,
            imagem: 'img/poteCenoura.jpg'
        }
    ];

    // Quantidades iniciais
    const quantidades = {
        chocolate: 0,
        cenoura: 0,
        milho: 0,
        chocoDePote: 0,
        cenouDePote: 0
    };

    // Método de pagamento selecionado (padrão: pix)
    let metodoPagamento = 'pix';

    // Elementos do DOM mapeados pelos IDs do HTML
    const listaBolosContainer = document.getElementById('iListaBolos');
    const totalGeralElement = document.getElementById('iTotalGeral');
    const btnComprar = document.getElementById('iBtnComprar');
    const containerElement = document.getElementById('iContainer');
    const btnModoLista = document.getElementById('btnModoLista');
    const btnModoGrade = document.getElementById('btnModoGrade');

    // Elementos do Modal de Checkout
    const modalCheckout = document.getElementById('iModalCheckout');
    const btnFecharModal = document.getElementById('btnFecharModal');
    const listaItensCheckout = document.getElementById('listaItensCheckout');
    const totalCheckoutValor = document.getElementById('totalCheckoutValor');
    const formCheckout = document.getElementById('formCheckout');

    // Abas de Pagamento Mercado Pago
    const tabPix = document.getElementById('tabPix');
    const tabCartao = document.getElementById('tabCartao');
    const painelPix = document.getElementById('painelPix');
    const painelCartao = document.getElementById('painelCartao');
    const areaChavePix = document.getElementById('areaChavePix');
    const inputPixCodigo = document.getElementById('inputPixCodigo');
    const btnCopiarPix = document.getElementById('btnCopiarPix');
    const msgPixCopiado = document.getElementById('msgPixCopiado');
    const imgQrCodePix = document.getElementById('imgQrCodePix');
    const containerQrCodeImg = document.getElementById('containerQrCodeImg');
    const btnFinalizarPagamento = document.getElementById('btnFinalizarPagamento');

    // Formatação BRL (R$)
    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    // Alternar entre modo Lista e modo Galeria/Grade
    function alternarModoVisualizacao(modo) {
        if (!listaBolosContainer || !containerElement) return;

        if (modo === 'grade') {
            listaBolosContainer.classList.remove('modo-lista');
            listaBolosContainer.classList.add('modo-grade');
            containerElement.classList.add('modo-grade-active');

            if (btnModoGrade) btnModoGrade.classList.add('active');
            if (btnModoLista) btnModoLista.classList.remove('active');
        } else {
            listaBolosContainer.classList.remove('modo-grade');
            listaBolosContainer.classList.add('modo-lista');
            containerElement.classList.remove('modo-grade-active');

            if (btnModoLista) btnModoLista.classList.add('active');
            if (btnModoGrade) btnModoGrade.classList.remove('active');
        }
    }

    if (btnModoLista) {
        btnModoLista.addEventListener('click', () => alternarModoVisualizacao('lista'));
    }

    if (btnModoGrade) {
        btnModoGrade.addEventListener('click', () => alternarModoVisualizacao('grade'));
    }

    // Renderiza a lista de cards
    function renderizarBolos() {
        if (!listaBolosContainer) return;
        listaBolosContainer.innerHTML = '';

        bolos.forEach(bolo => {
            const qtd = quantidades[bolo.id] || 0;
            const subtotal = qtd * bolo.preco;

            const card = document.createElement('article');
            card.className = 'bolo-card';
            card.innerHTML = `
                <div class="bolo-image-container">
                    <img src="${bolo.imagem}" alt="${bolo.nome}" class="bolo-imagem">
                </div>
                <div class="bolo-info">
                    <h2 class="bolo-title">${bolo.nome}</h2>
                    <p class="bolo-descricao">${bolo.descricao}</p>
                    
                    <div class="preco-tag">
                        <span>Preço unitário:</span>
                        <strong>${formatCurrency(bolo.preco)}</strong>
                    </div>

                    <div class="quantidade-seletor">
                        <label>Quantidade:</label>
                        <div class="controle-quantidade">
                            <button type="button" class="btn-qtd" data-id="${bolo.id}" data-acao="diminuir" aria-label="Diminuir ${bolo.nome}">-</button>
                            <input type="number" value="${qtd}" readonly aria-label="Quantidade de ${bolo.nome}">
                            <button type="button" class="btn-qtd" data-id="${bolo.id}" data-acao="aumentar" aria-label="Aumentar ${bolo.nome}">+</button>
                        </div>
                    </div>

                    <div class="subtotal-container">
                        <span>Subtotal item:</span>
                        <strong>${formatCurrency(subtotal)}</strong>
                    </div>
                </div>
            `;
            listaBolosContainer.appendChild(card);
        });

        atualizarTotalGeral();
    }

    // Calcula o total geral
    function atualizarTotalGeral() {
        let total = 0;
        bolos.forEach(bolo => {
            const qtd = quantidades[bolo.id] || 0;
            total += qtd * bolo.preco;
        });

        if (totalGeralElement) {
            totalGeralElement.textContent = formatCurrency(total);
        }
    }

    // Evento de clique para os botões + e -
    if (listaBolosContainer) {
        listaBolosContainer.addEventListener('click', (event) => {
            const btn = event.target.closest('.btn-qtd');
            if (!btn) return;

            const id = btn.dataset.id;
            const acao = btn.dataset.acao;

            if (acao === 'aumentar') {
                if (quantidades[id] < 10) {
                    quantidades[id]++;
                }
            } else if (acao === 'diminuir') {
                if (quantidades[id] > 0) {
                    quantidades[id]--;
                }
            }

            renderizarBolos();
        });
    }

    // --- LÓGICA DO MODAL DE CHECKOUT & CONEXÃO COM BACKEND ---

    // Alternar abas de pagamento
    if (tabPix && tabCartao) {
        tabPix.addEventListener('click', () => {
            metodoPagamento = 'pix';
            tabPix.classList.add('active');
            tabCartao.classList.remove('active');
            painelPix.classList.remove('hidden');
            painelCartao.classList.add('hidden');
        });

        tabCartao.addEventListener('click', () => {
            metodoPagamento = 'cartao';
            tabCartao.classList.add('active');
            tabPix.classList.remove('active');
            painelCartao.classList.remove('hidden');
            painelPix.classList.add('hidden');
        });
    }

    // Abrir o modal ao clicar em 'Continuar para pagamento'
    if (btnComprar) {
        btnComprar.addEventListener('click', () => {
            let totalItens = 0;
            let itensSelecionados = [];

            bolos.forEach(bolo => {
                const qtd = quantidades[bolo.id] || 0;
                if (qtd > 0) {
                    totalItens += qtd;
                    itensSelecionados.push({
                        nome: bolo.nome,
                        qtd: qtd,
                        subtotal: qtd * bolo.preco
                    });
                }
            });

            if (totalItens === 0) {
                alert("Por favor, selecione pelo menos 1 bolo usando os botões (+) para continuar!");
                return;
            }

            if (!modalCheckout) {
                alert("Erro: Modal de pagamento não encontrado no HTML!");
                return;
            }

            // Preenche o resumo do carrinho dentro do modal
            if (listaItensCheckout) {
                listaItensCheckout.innerHTML = '';
                let totalFinal = 0;
                itensSelecionados.forEach(item => {
                    totalFinal += item.subtotal;
                    const li = document.createElement('li');
                    li.innerHTML = `<span>${item.qtd}x ${item.nome}</span> <strong>${formatCurrency(item.subtotal)}</strong>`;
                    listaItensCheckout.appendChild(li);
                });
            }

            if (totalCheckoutValor) {
                const totalFinal = bolos.reduce((acc, b) => acc + (quantidades[b.id] * b.preco), 0);
                totalCheckoutValor.textContent = formatCurrency(totalFinal);
            }
            
            // Oculta área de chave PIX e QR Code anteriores se houver
            if (areaChavePix) areaChavePix.classList.add('hidden');
            if (msgPixCopiado) msgPixCopiado.classList.add('hidden');
            if (containerQrCodeImg) containerQrCodeImg.classList.add('hidden');

            modalCheckout.classList.remove('hidden');
        });
    }

    // Fechar modal ao clicar no botão 'X' ou fora do modal (backdrop)
    if (btnFecharModal) {
        btnFecharModal.addEventListener('click', () => {
            modalCheckout.classList.add('hidden');
        });
    }

    if (modalCheckout) {
        modalCheckout.addEventListener('click', (e) => {
            if (e.target === modalCheckout) {
                modalCheckout.classList.add('hidden');
            }
        });
    }

    // Copiar código PIX com a API moderna do Clipboard
    if (btnCopiarPix) {
        btnCopiarPix.addEventListener('click', async () => {
            if (inputPixCodigo && inputPixCodigo.value) {
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(inputPixCodigo.value);
                    } else {
                        inputPixCodigo.select();
                        document.execCommand('copy');
                    }
                    if (msgPixCopiado) msgPixCopiado.classList.remove('hidden');
                } catch (err) {
                    inputPixCodigo.select();
                    document.execCommand('copy');
                    if (msgPixCopiado) msgPixCopiado.classList.remove('hidden');
                }
            }
        });
    }

    // Submeter Checkout -> Comunicação REAL com o Backend Node.js
    if (formCheckout) {
        formCheckout.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (metodoPagamento === 'cartao') {
                alert('ℹ️ No momento o pagamento online está habilitado exclusivamente via PIX (Aprovação Instantânea). Selecionando PIX para você...');
                if (tabPix) tabPix.click();
                return;
            }

            const nome = document.getElementById('clienteNome').value;
            const email = document.getElementById('clienteEmail').value;
            const cpf = document.getElementById('clienteCPF').value;
            const cep = document.getElementById('clienteCEP').value;
            const rua = document.getElementById('clienteRua').value;
            const numero = document.getElementById('clienteNumero').value;
            const bairro = document.getElementById('clienteBairro').value;

            // Calcula total
            const totalFinal = bolos.reduce((acc, b) => acc + (quantidades[b.id] * b.preco), 0);

            // Mapeia os itens do pedido com nome, quantidade e valores
            const itensComprados = bolos
                .filter(b => (quantidades[b.id] || 0) > 0)
                .map(b => ({
                    id: b.id,
                    nome: b.nome,
                    quantidade: quantidades[b.id],
                    preco_unitario: b.preco,
                    subtotal: Number((quantidades[b.id] * b.preco).toFixed(2))
                }));

            // Payload formatado para o Backend Node.js
            const payload = {
                transaction_amount: Number(totalFinal.toFixed(2)),
                description: 'Pedido Bolos Caseirinhos',
                payment_method_id: 'pix',
                itens: itensComprados,
                payer: {
                    email: email,
                    first_name: nome.split(' ')[0],
                    last_name: nome.split(' ').slice(1).join(' ') || 'Cliente',
                    identification: {
                        type: 'CPF',
                        number: cpf.replace(/\D/g, '')
                    },
                    address: {
                        zip_code: cep.replace(/\D/g, ''),
                        street_name: rua,
                        street_number: numero,
                        neighborhood: bairro
                    }
                }
            };

            if (btnFinalizarPagamento) {
                btnFinalizarPagamento.disabled = true;
                btnFinalizarPagamento.textContent = 'Processando Pagamento...';
            }

            try {
                // Determina a URL da API dinamicamente (desenvolvimento local vs produção no Render)
                const isLocalDev = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port === '5500';
                const apiUrl = isLocalDev
                    ? 'http://localhost:3000/api/processar-pagamento'
                    : 'https://bolos-caseirinhos.onrender.com/api/processar-pagamento';

                // Chamada de API para o Servidor Backend Node.js
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const resultado = await response.json();

                if (response.ok) {
                    if (metodoPagamento === 'pix') {
                        const qrCodePix = resultado.qr_code || resultado.point_of_interaction?.transaction_data?.qr_code;
                        const qrCodeBase64 = resultado.qr_code_base64 || resultado.point_of_interaction?.transaction_data?.qr_code_base64;

                        // Exibe a Imagem do QR Code se retornada
                        if (qrCodeBase64 && imgQrCodePix && containerQrCodeImg) {
                            imgQrCodePix.src = qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`;
                            containerQrCodeImg.classList.remove('hidden');
                        }

                        // Exibe a Chave PIX Copia e Cola
                        if (qrCodePix && inputPixCodigo && areaChavePix) {
                            inputPixCodigo.value = qrCodePix;
                            areaChavePix.classList.remove('hidden');
                            alert('✅ PIX gerado com sucesso pelo Mercado Pago! Escaneie o QR Code ou copie a chave abaixo.');
                        } else {
                            alert('✅ Pedido PIX gerado com sucesso! ID Mercado Pago: ' + resultado.id);
                        }
                    } else {
                        alert('✅ Pagamento processado com sucesso via Mercado Pago! Status: ' + resultado.status);
                    }
                } else {
                    alert('⚠️ Erro ao processar pagamento: ' + (resultado.message || resultado.error || 'Verifique se o backend está rodando.'));
                }
            } catch (error) {
                console.error('Erro de conexão com o servidor:', error);
                alert('❌ Não foi possível conectar ao servidor backend na porta 3000. Certifique-se de que rodou "node server.js" no terminal.');
            } finally {
                if (btnFinalizarPagamento) {
                    btnFinalizarPagamento.disabled = false;
                    btnFinalizarPagamento.textContent = 'Confirmar e Pagar com Mercado Pago';
                }
            }
        });
    }

    // Inicialização
    renderizarBolos();
});