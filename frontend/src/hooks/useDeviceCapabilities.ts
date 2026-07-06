import { useCallback } from 'react';

export function useDeviceCapabilities() {
  const getGPS = useCallback(async (): Promise<{ lat: number; lng: number; accuracy?: number } | null> => {
    if (!navigator.geolocation) return null;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        }),
      );
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
    } catch {
      return null;
    }
  }, []);

  const capturePhoto = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.click();
    });
  }, []);

  const pickFromGallery = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf';
      input.multiple = false;
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.click();
    });
  }, []);

  const scanQR = useCallback(async (): Promise<string | null> => {
    const Detector = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
    if (!Detector) return null;
    const file = await capturePhoto();
    if (!file) return null;
    try {
      const bitmap = await createImageBitmap(file);
      const detector = new Detector({ formats: ['qr_code', 'code_128', 'ean_13'] });
      const codes = await detector.detect(bitmap);
      return codes[0]?.rawValue ?? null;
    } catch {
      return null;
    }
  }, [capturePhoto]);

  const share = useCallback(async (data: ShareData) => {
    if (navigator.share) {
      await navigator.share(data);
      return true;
    }
    return false;
  }, []);

  const haptic = useCallback((pattern: number | number[] = 10) => {
    navigator.vibrate?.(pattern);
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
  }, []);

  return {
    getGPS,
    capturePhoto,
    pickFromGallery,
    scanQR,
    share,
    haptic,
    copyToClipboard,
    hasShare: typeof navigator !== 'undefined' && Boolean(navigator.share),
    hasCamera: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
    hasQR: typeof window !== 'undefined' && 'BarcodeDetector' in window,
  };
}
