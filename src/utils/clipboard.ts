import { NativeModules } from 'react-native';

/**
 * Lightweight and robust clipboard utility using app's native module.
 * Eliminates dependency on @react-native-clipboard/clipboard and avoids TurboModule crash.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (NativeModules.PermissionModule?.copyToClipboard) {
      await NativeModules.PermissionModule.copyToClipboard(text);
      return true;
    }
  } catch (error) {
    console.warn('[Clipboard] Failed to copy text:', error);
  }
  return false;
};

const Clipboard = {
  setString: (text: string) => {
    copyToClipboard(text);
  },
  getString: async (): Promise<string> => '',
};

export default Clipboard;
