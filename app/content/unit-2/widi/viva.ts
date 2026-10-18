import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What was WiDi?",
    a: "Intel Wireless Display, launched in 2010: a technology for mirroring a laptop's screen and sound on a TV over a direct Wi-Fi link, without cables.",
  },
  {
    q: "How did WiDi work?",
    a: "The laptop captured and compressed its screen into a video stream, sent it over a direct peer-to-peer Wi-Fi link to a WiDi TV or receiver, which decoded and displayed it.",
  },
  {
    q: "Why was WiDi discontinued?",
    a: "It needed Intel hardware. Once the open Miracast standard was built into Windows, Android phones and TVs, Intel ended WiDi around 2016.",
  },
  {
    q: "What is Miracast?",
    a: "A Wi-Fi Alliance standard (2012) for mirroring a screen to a display over Wi-Fi Direct, without a router.",
  },
  {
    q: "Differentiate Miracast and Google Cast.",
    a: "Miracast mirrors the whole screen over a direct Wi-Fi link. Google Cast goes through the home Wi-Fi: the phone tells the TV what to play and the TV fetches the stream from the internet itself.",
  },
  {
    q: "Why is WiDi relevant to IoT?",
    a: "Smart TVs and streaming devices are common IoT devices, and WiDi and Miracast are examples of peer-to-peer Wi-Fi between two devices without an access point.",
  },
];

export default viva;
