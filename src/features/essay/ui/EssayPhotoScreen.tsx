import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { PhotoCapture, type CapturedPhoto } from './PhotoCapture';

// Índice da página que será substituída, ou `'new'` para acrescentar uma página.
type Capturing = number | 'new' | null;

const SEND_UNAVAILABLE =
  'O envio da foto para correção ainda não está disponível nesta versão do app.';

/**
 * Captura e revisão local das páginas da redação. As fotos ficam só em memória e no cache do
 * aparelho: o contrato de envio de imagem ainda não existe, então nada sai daqui (§18 do guia).
 */
export function EssayPhotoScreen({ onClose }: { onClose: () => void }) {
  const [pages, setPages] = useState<CapturedPhoto[]>([]);
  const [capturing, setCapturing] = useState<Capturing>(null);

  if (capturing !== null) {
    return (
      <PhotoCapture
        onCancel={() => setCapturing(null)}
        onCaptured={(photo) => {
          setPages((current) =>
            capturing === 'new' ? [...current, photo] : current.map((page, i) => (i === capturing ? photo : page)),
          );
          setCapturing(null);
        }}
      />
    );
  }

  return (
    <Screen
      footer={
        <Button
          label="Enviar para correção"
          variant="accent"
          disabled
          disabledReason={pages.length === 0 ? 'Fotografe a folha para poder enviar.' : SEND_UNAVAILABLE}
          onPress={() => undefined}
        />
      }
    >
      <AppText variant="title">Foto da redação</AppText>

      <Banner tone="info" message={SEND_UNAVAILABLE} />

      {pages.length === 0 ? (
        <View style={styles.empty}>
          <AppText variant="bodyStrong">Nenhuma foto ainda</AppText>
          <AppText tone="muted">
            Fotografe a folha inteira, com boa luz e sem sombras, para a correção funcionar bem.
          </AppText>
          <Button label="Tirar foto da redação" onPress={() => setCapturing('new')} />
        </View>
      ) : (
        <>
          {pages.map((page, index) => (
            <View key={page.uri} style={styles.page}>
              <Image
                source={{ uri: page.uri }}
                accessibilityLabel={`Foto da página ${index + 1} de ${pages.length}`}
                style={styles.image}
                resizeMode="contain"
              />
              <AppText variant="caption" tone="muted">
                Página {index + 1} de {pages.length}
              </AppText>
              <View style={styles.row}>
                <View style={styles.cell}>
                  <Button label={`Tirar outra da página ${index + 1}`} variant="outline" onPress={() => setCapturing(index)} />
                </View>
                <View style={styles.cell}>
                  <Button
                    label={`Remover a página ${index + 1}`}
                    variant="outline"
                    onPress={() => setPages((current) => current.filter((_, i) => i !== index))}
                  />
                </View>
              </View>
            </View>
          ))}
          <Button label="Adicionar página" variant="outline" onPress={() => setCapturing('new')} />
        </>
      )}

      <AppText variant="caption" tone="muted">
        A correção é feita por IA e traz uma nota estimada. Não substitui a nota oficial da prova.
      </AppText>
      <Button label="Voltar" variant="outline" onPress={onClose} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceRaised,
  },
  page: { gap: Spacing.two },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceRaised,
  },
  row: { flexDirection: 'row', gap: Spacing.two },
  cell: { flex: 1 },
});
