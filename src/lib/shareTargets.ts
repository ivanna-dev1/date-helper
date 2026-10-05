// Messengers that open with a ready message. Values are URL-encoded.
// Left out: Facebook Messenger (needs app_id), Instagram and Signal (no link); reachable via "More…".
type ShareTarget = {
  name: string;
  isWebLink: boolean;
  buildUrl: (text: string, link: string) => string;
};

const encode = encodeURIComponent;

export const SHARE_TARGETS: ShareTarget[] = [
  {
    // Telegram shows the text above the link, so the text must not contain it.
    name: "Telegram",
    isWebLink: true,
    buildUrl: (text, link) =>
      `https://t.me/share/url?url=${encode(link)}&text=${encode(text)}`,
  },
  {
    name: "WhatsApp",
    isWebLink: true,
    buildUrl: (text, link) => `https://wa.me/?text=${encode(`${text} ${link}`)}`,
  },
  {
    // Needs the Viber app.
    name: "Viber",
    isWebLink: false,
    buildUrl: (text, link) =>
      `viber://forward?text=${encode(`${text} ${link}`)}`,
  },
  {
    // "?&body=" is understood by both iPhone and Android.
    name: "SMS",
    isWebLink: false,
    buildUrl: (text, link) => `sms:?&body=${encode(`${text} ${link}`)}`,
  },
  {
    name: "Email",
    isWebLink: false,
    buildUrl: (text, link) =>
      `mailto:?subject=${encode("Date Helper")}&body=${encode(`${text} ${link}`)}`,
  },
];
