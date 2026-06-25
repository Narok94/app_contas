
/**
 * Utilitário para enviar notificações via WhatsApp
 */
export const notifyPaymentViaWhatsApp = (accountName: string, value: number, groupLink?: string) => {
  const formattedValue = value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const message = `✅ *Pagamento Confirmado!*\n\n` +
                  `*Conta:* ${accountName}\n` +
                  `*Valor:* ${formattedValue}\n` +
                  `*Status:* Pago via App TATU. 🐢`;

  const encodedMessage = encodeURIComponent(message);
  
  // Se tiver link do grupo, tentamos usar o chat.whatsapp.com
  // Caso contrário, usamos a API de envio genérica
  let whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
  
  if (groupLink && groupLink.includes('chat.whatsapp.com')) {
    // Nota: O WhatsApp não permite preencher a mensagem automaticamente via link de convite direto.
    // Mas podemos abrir o grupo primeiro para facilitar.
    // Para uma experiência melhor, abrimos o link de envio que permite escolher o grupo,
    // mas se o usuário forneceu o link, ele pode querer apenas o atalho.
    // Vamos manter a API de envio pois ela é mais funcional para mensagens.
    whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
  }
  
  // Abre em uma nova aba/janela
  window.open(whatsappUrl, '_blank');
};
