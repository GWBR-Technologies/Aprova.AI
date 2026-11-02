import { Banner } from '@/components/Banner';

// A oferta (texto, preço, período de teste) depende do produto e da fonte do plano Premium,
// ainda em aberto (§1.6 do guia); a tela só informa o que o servidor já determina.
export function PremiumGate() {
  return (
    <Banner
      tone="info"
      message="A correção de redação é um recurso Premium. A oferta do plano ainda não está disponível neste app."
    />
  );
}
