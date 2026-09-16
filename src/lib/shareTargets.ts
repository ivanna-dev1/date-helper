// Messengers that can open with a ready message.
// Every value goes through encodeURIComponent: spaces, "&", "#" and emoji
// would break the address otherwise.
//
// Not in the list, on purpose:
// - Facebook Messenger needs a registered Facebook app_id;
// - Instagram and Signal have no link with a ready message.
// All three are still reachable through the phone menu ("More…").
type ShareTarget = {
  name: string;
  // true for https links; false for app links like viber: or sms:
  isWebLink: boolean;
  buildUrl: (text: string, link: string) => string;
};

const encode = encodeURIComponent;

export const SHARE_TARGETS: ShareTarget[] = [
  {
    // Telegram takes the link separately and shows the text above it.
    // So the text must not contain the link, or it shows twice.
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
    // Works only when the Viber app is installed.
    name: "Viber",
    isWebLink: false,
    buildUrl: (text, link) =>
      `viber://forward?text=${encode(`${text} ${link}`)}`,
  },
  {
    // iPhone and Android read the body a bit differently.
    // "?&body=" is the common form that both understand.
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
