import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Simulated XMPP server (home.example) with two clients: a kitchen temperature sensor and a phone app",
    "Built-in size calculator for the closest MQTT message (QoS 0 PUBLISH)",
  ],
  theory:
    "XMPP is an open messaging and presence protocol that sends small XML documents called stanzas over TCP. Every device has a Jabber ID (JID) such as sensor1@home.example/kitchen: a local name, the server's domain and a resource. There are three stanzas: presence announces whether a device is online, away or offline; message pushes data to another device; and iq is a request and response, where the reply carries the same id as the request. Devices log in to their server, which routes stanzas between them and stores messages for a device that is offline. Because XML repeats tag names and full addresses, a stanza is several times larger than an MQTT message that carries the same reading.",
  procedure: [
    "Open lab L09, XMPP device messaging. Both devices start offline.",
    "Set the Phone to Online, then the Sensor to Online. Watch the presence stanza and press Record observation.",
    "Press Send reading and record the message stanza.",
    "Set the Phone to Offline and press Send reading. Note that the server stores the message. Set the Phone to Online and record the delivered message.",
    "Press Ask for reading. Check that the iq get and the iq result have the same id, and record the result.",
    "Set the Sensor to Offline, press Ask for reading and record the iq error. Then press Send reading and note the error.",
    "Compare the XML size and the MQTT size in your rows, then open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "action", label: "Action" },
    { key: "sensor", label: "Sensor" },
    { key: "phone", label: "Phone" },
    { key: "stanza", label: "Stanza" },
    { key: "outcome", label: "Outcome" },
    { key: "xmlBytes", label: "XML size", unit: "bytes" },
    { key: "mqttBytes", label: "MQTT size", unit: "bytes" },
    { key: "ratio", label: "Times larger" },
  ],
  resultHint:
    "Say what happened to a reading sent while the phone was offline, how the phone matched an iq reply to its request, and how many times larger the XML stanzas were than the MQTT messages.",
  viva: [
    {
      q: "What are the three kinds of XMPP stanza?",
      a: "presence announces whether a device is online, away or offline. message pushes data, such as a reading, to another device. iq is a request and response, such as the phone asking the sensor for its reading.",
    },
    {
      q: "Explain the parts of the JID sensor1@home.example/kitchen.",
      a: "sensor1 is the local name of the device, home.example is the domain of its XMPP server, and kitchen is the resource, which names one particular connection.",
    },
    {
      q: "What happened to the reading sent while the phone was offline?",
      a: "The server stored the message and delivered it as soon as the phone came back online, so the reading was not lost.",
    },
    {
      q: "How does the phone know which iq result answers which question?",
      a: "Every iq get carries an id, such as r1, and the sensor's iq result carries the same id. The phone matches the two by their id.",
    },
    {
      q: "What happened when the phone asked an offline sensor for its reading?",
      a: "The server answered for the sensor with an iq error of type service-unavailable, with the same id as the request. A message from an offline sensor also failed, because a device must be logged in to send.",
    },
    {
      q: "Why is an XMPP stanza larger than the MQTT message for the same reading?",
      a: "XMPP is XML text that repeats tag names and full JIDs in every stanza. MQTT uses a 2-byte binary header and a short topic. For a reading of 28.5 °C the message stanza is 129 bytes but the MQTT message is only 32 bytes, about four times smaller.",
    },
  ],
};

export default record;
