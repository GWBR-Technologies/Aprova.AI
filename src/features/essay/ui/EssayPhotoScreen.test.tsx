import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { EssayPhotoScreen } from './EssayPhotoScreen';

type Permission = { granted: boolean; canAskAgain: boolean } | null;

let mockPermission: Permission = { granted: true, canAskAgain: true };
const mockRequestPermission = jest.fn(async () => undefined);
const mockTakePicture = jest.fn();

jest.mock('expo-camera', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const CameraView = React.forwardRef(
    (props: { onCameraReady?: () => void; accessibilityLabel?: string }, ref: React.Ref<unknown>) => {
      const { onCameraReady } = props;
      React.useImperativeHandle(ref, () => ({ takePictureAsync: (options: unknown) => mockTakePicture(options) }));
      React.useEffect(() => {
        onCameraReady?.();
      }, [onCameraReady]);
      return <View accessibilityLabel={props.accessibilityLabel} />;
    },
  );
  CameraView.displayName = 'CameraView';
  return { CameraView, useCameraPermissions: () => [mockPermission, mockRequestPermission] };
});
jest.mock('@/hooks/use-is-online', () => ({ useIsOnline: () => true }));

let pictureCount = 0;

beforeEach(() => {
  mockPermission = { granted: true, canAskAgain: true };
  mockRequestPermission.mockClear();
  pictureCount = 0;
  mockTakePicture.mockReset();
  mockTakePicture.mockImplementation(async () => ({
    uri: `file:///cache/foto-${++pictureCount}.jpg`,
    width: 3000,
    height: 4000,
  }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function takePhoto(openLabel: string) {
  await fireEvent.press(screen.getByRole('button', { name: openLabel }));
  const shutter = await screen.findByRole('button', { name: 'Capturar foto' });
  await waitFor(() => expect(shutter).toBeEnabled());
  await fireEvent.press(shutter);
}

describe('EssayPhotoScreen', () => {
  it('começa vazio, com orientação e o envio desabilitado com o motivo', async () => {
    await render(<EssayPhotoScreen onClose={jest.fn()} />);

    expect(screen.getByText('Nenhuma foto ainda')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Enviar para correção' })).toBeDisabled();
    expect(screen.getByText('Fotografe a folha para poder enviar.')).toBeOnTheScreen();
  });

  it('pede a permissão da câmera quando o sistema ainda pergunta', async () => {
    mockPermission = { granted: false, canAskAgain: true };
    await render(<EssayPhotoScreen onClose={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Tirar foto da redação' }));

    await fireEvent.press(await screen.findByRole('button', { name: 'Permitir câmera' }));
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('leva aos ajustes quando a permissão foi negada de vez', async () => {
    mockPermission = { granted: false, canAskAgain: false };
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await render(<EssayPhotoScreen onClose={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Tirar foto da redação' }));

    expect(await screen.findByText(/desativado/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Abrir ajustes' }));
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it('captura uma página, mostra a revisão e continua sem enviar nada', async () => {
    await render(<EssayPhotoScreen onClose={jest.fn()} />);
    await takePhoto('Tirar foto da redação');

    expect(await screen.findByText('Página 1 de 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('Foto da página 1 de 1')).toBeOnTheScreen();
    expect(mockTakePicture).toHaveBeenCalledWith({ quality: 0.9 });
    expect(screen.getByRole('button', { name: 'Enviar para correção' })).toBeDisabled();
    expect(screen.getAllByText(/ainda não está disponível/).length).toBeGreaterThan(0);
  });

  it('adiciona, substitui e remove páginas', async () => {
    await render(<EssayPhotoScreen onClose={jest.fn()} />);
    await takePhoto('Tirar foto da redação');
    await takePhoto('Adicionar página');
    expect(await screen.findByText('Página 2 de 2')).toBeOnTheScreen();

    await takePhoto('Tirar outra da página 1');
    expect(await screen.findByText('Página 2 de 2')).toBeOnTheScreen();
    expect(mockTakePicture).toHaveBeenCalledTimes(3);

    await fireEvent.press(screen.getByRole('button', { name: 'Remover a página 1' }));
    expect(await screen.findByText('Página 1 de 1')).toBeOnTheScreen();
    expect(screen.queryByText('Página 2 de 2')).not.toBeOnTheScreen();
  });

  it('cancelar a captura volta à revisão sem criar página', async () => {
    await render(<EssayPhotoScreen onClose={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Tirar foto da redação' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(await screen.findByText('Nenhuma foto ainda')).toBeOnTheScreen();
  });

  it('mostra erro com nova tentativa quando a captura falha', async () => {
    mockTakePicture.mockRejectedValueOnce(new Error('falha nativa'));
    await render(<EssayPhotoScreen onClose={jest.fn()} />);
    await takePhoto('Tirar foto da redação');

    expect(await screen.findByText('Não foi possível tirar a foto. Tente de novo.')).toBeOnTheScreen();
    expect(screen.queryByText(/falha nativa/)).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Capturar foto' }));
    expect(await screen.findByText('Página 1 de 1')).toBeOnTheScreen();
  });

  it('o botão Voltar fecha a tela', async () => {
    const onClose = jest.fn();
    await render(<EssayPhotoScreen onClose={onClose} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
