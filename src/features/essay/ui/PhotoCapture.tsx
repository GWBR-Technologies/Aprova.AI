import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/constants/theme';

export type CapturedPhoto = {
  uri: string;
  width: number;
  height: number;
};

export type PhotoCaptureProps = {
  onCaptured: (photo: CapturedPhoto) => void;
  onCancel: () => void;
};

// Qualidade 0,9: o texto manuscrito precisa continuar legível para a transcrição, e a imagem
// ainda fica bem menor que a original sem compressão.
const PICTURE_QUALITY = 0.9;

export function PhotoCapture({ onCaptured, onCancel }: PhotoCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [taking, setTaking] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!permission) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel="Verificando a permissão da câmera" />
      </Screen>
    );
  }

  if (!permission.granted) {
    // Se o sistema não pergunta mais, só os ajustes do aparelho podem liberar a câmera.
    const canAsk = permission.canAskAgain;
    return (
      <Screen
        footer={<Button label="Cancelar" variant="outline" onPress={onCancel} />}
      >
        <AppText variant="title">Câmera</AppText>
        <Banner
          tone={canAsk ? 'info' : 'warning'}
          message={
            canAsk
              ? 'Precisamos da câmera para fotografar a folha da sua redação. A foto só é usada para a correção.'
              : 'O acesso à câmera está desativado. Ative-o nos ajustes do aparelho para fotografar a folha.'
          }
        >
          <Button
            label={canAsk ? 'Permitir câmera' : 'Abrir ajustes'}
            onPress={() => (canAsk ? void requestPermission() : void Linking.openSettings())}
          />
        </Banner>
      </Screen>
    );
  }

  async function capture() {
    if (!camera.current || !ready || taking) return;
    setTaking(true);
    setFailed(false);
    try {
      const picture = await camera.current.takePictureAsync({ quality: PICTURE_QUALITY });
      onCaptured({ uri: picture.uri, width: picture.width, height: picture.height });
    } catch {
      setFailed(true);
    } finally {
      setTaking(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Button label="Cancelar" variant="outline" onPress={onCancel} />
        <AppText tone="onPrimary" style={styles.hint}>
          Enquadre a folha inteira, com boa luz e sem sombras.
        </AppText>
      </View>

      <View style={styles.viewfinder}>
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          onCameraReady={() => setReady(true)}
          accessibilityLabel="Visor da câmera"
        />
      </View>

      <View style={styles.bottom}>
        {failed ? <Banner tone="error" announce message="Não foi possível tirar a foto. Tente de novo." /> : null}
        <View style={styles.controls}>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Lanterna"
            accessibilityState={{ checked: torch }}
            onPress={() => setTorch((on) => !on)}
            style={styles.torch}
          >
            <AppText variant="caption" tone="onPrimary">
              {torch ? 'Lanterna ligada' : 'Lanterna desligada'}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Capturar foto"
            accessibilityState={{ disabled: !ready || taking, busy: taking }}
            disabled={!ready || taking}
            onPress={() => void capture()}
            style={[styles.shutter, (!ready || taking) && styles.shutterDisabled]}
          >
            {taking ? <ActivityIndicator color={Colors.primary} /> : <View style={styles.shutterCore} />}
          </Pressable>
          <View style={styles.torch} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ink, padding: Spacing.three, gap: Spacing.three },
  top: { gap: Spacing.two },
  hint: { textAlign: 'center' },
  viewfinder: { flex: 1, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Colors.inkMuted },
  bottom: { gap: Spacing.two },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  torch: { minWidth: 96, minHeight: MinTouchTarget, justifyContent: 'center' },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 4,
    borderColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: { opacity: 0.5 },
  shutterCore: { width: 52, height: 52, borderRadius: Radius.pill, backgroundColor: Colors.surfaceRaised, borderWidth: 2, borderColor: Colors.ink },
});
