import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Simulated CoAP client and constrained server (GET /temp) on a link with adjustable loss and delay",
    "CoAP header inspector and Observe demonstration",
  ],
  theory:
    "CoAP (Constrained Application Protocol) is a light, REST-style protocol for small devices. It runs over UDP and has a fixed header of only 4 bytes. A Confirmable (CON) message must be acknowledged: if no ACK arrives within 2 to 3 seconds, the client resends it, doubling the wait each time, up to 4 resends. A Non-confirmable (NON) message is sent once and never resent. The Observe option lets a client register once and then receive a notification whenever the resource changes, instead of polling.",
  procedure: [
    "Open lab L08, CoAP client–server simulator. Choose CON with 0% packet loss and press Send request. Note the time of the answer and the wait shown.",
    "Set Packet loss to 40% and press Send request several times. Note how many times the request is sent and how the wait doubles.",
    "Choose NON and send again at 40% loss. Note that a lost request is not resent.",
    "Set Packet loss to 0%, 20% and 40% in turn and press Record observation each time.",
    "In the header inspector, build CON GET /temp with a 2-byte token and note each byte. Compare its size with the same HTTP request.",
    "In Observe vs polling, compare the number of messages for the steady room and the sunny afternoon.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "loss", label: "Loss", unit: "%" },
    { key: "delay", label: "Delay", unit: "ms" },
    { key: "type", label: "Type" },
    { key: "success", label: "Answered (of 100)" },
    { key: "tries", label: "Average tries" },
    { key: "time", label: "Average time" },
    { key: "bytes", label: "Average bytes" },
  ],
  resultHint:
    "Compare CON and NON at each loss level: how many requests were answered, how many tries and how long they took. Add what you learned about the header size and about Observe.",
  viva: [
    {
      q: "Why does CON get far more answers than NON on a lossy link?",
      a: "A CON message is resent until an ACK arrives, up to 4 times. A NON message is sent once, so if it or its reply is lost, the request fails.",
    },
    {
      q: "Why does the wait double after each resend?",
      a: "This is exponential back-off. If the network is congested, waiting longer each time avoids making the congestion worse.",
    },
    {
      q: "What do the Message ID and the Token do?",
      a: "The Message ID matches an ACK to its CON message and lets the server spot duplicates. The Token matches a response to its request.",
    },
    {
      q: "How big is the CoAP fixed header, and what is in it?",
      a: "4 bytes: version, type and token length in the first byte, then the code, then a 2-byte message ID.",
    },
    {
      q: "How does Observe save messages compared with polling?",
      a: "The client registers once, and the server sends a notification only when the value changes, instead of answering a request every few minutes.",
    },
    {
      q: "When would you choose NON messages?",
      a: "For frequent readings where losing one now and then does not matter, such as a temperature sent every few seconds, because NON uses fewer bytes and no waiting.",
    },
  ],
};

export default record;
