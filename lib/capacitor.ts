export function isCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof window !== 'undefined' &&
    typeof (window as any).Capacitor !== 'undefined' &&
    (window as any).Capacitor.isNativePlatform()
  );
}

export function isIOS(): boolean {
  if (!isCapacitor()) return false;
  const platform = (window as any).Capacitor.getPlatform();
  return platform === 'ios';
}

export function isAndroid(): boolean {
  if (!isCapacitor()) return false;
  const platform = (window as any).Capacitor.getPlatform();
  return platform === 'android';
}
