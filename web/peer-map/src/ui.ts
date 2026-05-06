import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export class UI {
  static get el() {
    return {
      hex: document.querySelector<HTMLTextAreaElement>('#hex')!,
      go: document.querySelector<HTMLButtonElement>('#go')!,
      clearDecode: document.querySelector<HTMLButtonElement>('#clear-decode')!,
      copyShareLink: document.querySelector<HTMLButtonElement>('#copy-share-link')!,
      decodeOk: document.querySelector<HTMLDivElement>('#decode-ok')!,
      decodeStats: document.querySelector<HTMLParagraphElement>('#decode-stats')!,
      err: document.querySelector<HTMLDivElement>('#err')!,
      fitAll: document.querySelector<HTMLButtonElement>('#fit-all')!,
      metaTheme: document.querySelector<HTMLMetaElement>('#meta-theme-color')!,
      copyPlottedHex: document.querySelector<HTMLButtonElement>('#copy-plotted-hex')!,
      exportGpx: document.querySelector<HTMLButtonElement>('#export-gpx')!,
      exportCsv: document.querySelector<HTMLButtonElement>('#export-csv')!,
      exportGeojson: document.querySelector<HTMLButtonElement>('#export-geojson')!,
      netOffline: document.querySelector<HTMLDivElement>('#net-offline')!,
      themeSystem: document.querySelector<HTMLButtonElement>('#theme-system')!,
      themeLight: document.querySelector<HTMLButtonElement>('#theme-light')!,
      themeDark: document.querySelector<HTMLButtonElement>('#theme-dark')!,
      deviceIdHex: document.querySelector<HTMLSpanElement>('#device-id-hex')!,
      encodeSos: document.querySelector<HTMLInputElement>('#encode-sos')!,
      encodeRelay: document.querySelector<HTMLInputElement>('#encode-relay')!,
      encodeText: document.querySelector<HTMLInputElement>('#encode-text')!,
      encodeTextBytes: document.querySelector<HTMLParagraphElement>('#encode-text-bytes')!,
      encodeLocate: document.querySelector<HTMLButtonElement>('#encode-locate')!,
      encodePlot: document.querySelector<HTMLButtonElement>('#encode-plot')!,
      encodeStatus: document.querySelector<HTMLParagraphElement>('#encode-status')!,
      encodeErr: document.querySelector<HTMLDivElement>('#encode-err')!,
      encodeSummary: document.querySelector<HTMLDivElement>('#encode-summary')!,
      outFull: document.querySelector<HTMLTextAreaElement>('#out-full')!,
      outBle: document.querySelector<HTMLTextAreaElement>('#out-ble')!,
      outMesh: document.querySelector<HTMLTextAreaElement>('#out-mesh')!,
      copyFull: document.querySelector<HTMLButtonElement>('#copy-full')!,
      copyBle: document.querySelector<HTMLButtonElement>('#copy-ble')!,
      copyMesh: document.querySelector<HTMLButtonElement>('#copy-mesh')!,
      meshToDecode: document.querySelector<HTMLButtonElement>('#mesh-to-decode')!,
      copyAllWires: document.querySelector<HTMLButtonElement>('#copy-all-wires')!,
      hexLineMeter: document.querySelector<HTMLParagraphElement>('#hex-line-meter')!,
      hexFile: document.querySelector<HTMLInputElement>('#hex-file')!,
      sampleHex: document.querySelector<HTMLButtonElement>('#sample-hex')!,
      loadHexFile: document.querySelector<HTMLButtonElement>('#load-hex-file')!,
      pasteHexClipboard: document.querySelector<HTMLButtonElement>('#paste-hex-clipboard')!,
      decodeDetail: document.querySelector<HTMLPreElement>('#decode-detail')!,
      historySlider: document.querySelector<HTMLInputElement>('#history-slider')!,
      historyClear: document.querySelector<HTMLButtonElement>('#history-clear')!,
      serialConnect: document.querySelector<HTMLButtonElement>('#serial-connect')!,
      serialDisconnect: document.querySelector<HTMLButtonElement>('#serial-disconnect')!,
      bleConnect: document.querySelector<HTMLButtonElement>('#ble-connect')!,
      bleDisconnect: document.querySelector<HTMLButtonElement>('#ble-disconnect')!,
      ingestStatus: document.querySelector<HTMLParagraphElement>('#ingest-status')!,
      toasts: document.querySelector<HTMLDivElement>('#toast-container')!,
    };
  }

  static async vibrate() {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else {
      try { navigator.vibrate?.(14); } catch { /* ignore */ }
    }
  }

  static toast(message: string, type: 'ok' | 'err' | 'info' = 'info') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = message;
    const container = UI.el.toasts || UI.createToastContainer();
    container.appendChild(t);
    setTimeout(() => {
      t.classList.add('fade-out');
      setTimeout(() => t.remove(), 400);
    }, 3000);
  }

  private static createToastContainer() {
    const c = document.createElement('div');
    c.id = 'toast-container';
    document.body.appendChild(c);
    return c;
  }

  static setStatus(el: HTMLElement, msg: string, isErr = false) {
    el.textContent = msg;
    el.classList.toggle('err', isErr);
  }
}
