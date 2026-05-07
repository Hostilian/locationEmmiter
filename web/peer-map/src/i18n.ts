import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "app_title": "Location Emitter",
      "connect_ble": "Connect BLE",
      "disconnect_ble": "Disconnect BLE",
      "manual_input": "Manual Hex Input",
      "decode": "Decode",
      "demo": "✨ Demo",
      "active_peers": "Active Peers",
      "ago": "s ago",
      "battery": "Battery",
      "units_metric": "Metric",
      "units_imperial": "Imperial",
      "export_data": "Export Data",
      "delete_account": "Delete Account",
      "weak_signal": "Weak GPS Signal",
      "onboarding_title": "Before you start",
      "onboarding_text": "Location Emitter tracks your location to share it with your mesh group. This works even offline."
    }
  },
  ar: {
    translation: {
      "app_title": "باعث الموقع",
      "connect_ble": "اتصال BLE",
      "disconnect_ble": "قطع اتصال BLE",
      "manual_input": "إدخال يدوي",
      "decode": "فك التشفير",
      "demo": "✨ عرض تجريبي",
      "active_peers": "الأقران النشطون",
      "ago": "ثانية مضت",
      "battery": "البطارية",
      "units_metric": "متري",
      "units_imperial": "إمبراطوري",
      "export_data": "تصدير البيانات",
      "delete_account": "حذف الحساب",
      "weak_signal": "إشارة GPS ضعيفة",
      "onboarding_title": "قبل البدء",
      "onboarding_text": "يتتبع باعث الموقع موقعك لمشاركته مع مجموعة الشبكة الخاصة بك. هذا يعمل حتى بدون اتصال بالإنترنت."
    }
  },
  fr: {
    translation: {
      "app_title": "Émetteur de Localisation",
      "connect_ble": "Connecter BLE",
      "disconnect_ble": "Déconnecter BLE",
      "manual_input": "Entrée Hex Manuelle",
      "decode": "Décoder",
      "demo": "✨ Démo",
      "active_peers": "Pairs Actifs",
      "ago": "s",
      "battery": "Batterie"
    }
  },
  es: {
    translation: {
      "app_title": "Emisor de Ubicación",
      "connect_ble": "Conectar BLE",
      "disconnect_ble": "Desconectar BLE",
      "manual_input": "Entrada Hex Manual",
      "decode": "Decodificar",
      "demo": "✨ Demo",
      "active_peers": "Pares Activos",
      "ago": "s atrás",
      "battery": "Batería"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
