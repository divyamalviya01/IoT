import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Simulated IoT device (device.local) with a temperature sensor, a humidity sensor, an LED and a REST API",
    "Client app that sends HTTP/1.1 requests",
  ],
  theory:
    "REST is a style of building web APIs over HTTP. Each thing on the device, such as a sensor or an LED, is a resource with its own path, for example /sensors/temperature. The client uses a method to say what it wants: GET reads a resource, PUT replaces it, POST creates a new one and DELETE removes one. The device answers with a status code: 2xx means success, 4xx means the request was wrong, and 5xx means the server failed. HTTP is simple and works everywhere, but its text headers are often much larger than a small sensor value.",
  procedure: [
    "Open lab L07, REST API playground. Press the example Read temperature, then Send request. Note the status and sizes and press Record observation.",
    "Use Turn LED on and Send request. Watch the LED on the device, then read it back with GET /actuators/led. Record both.",
    "Use Add a reading and Send request. Note the 201 Created status and the Location header. Record it.",
    "Use Wrong path, Wrong method and Bad body in turn, sending and recording each.",
    "Tick Device requires a token and send a request. Then tick Send token and send again. Record both.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "method", label: "Method" },
    { key: "path", label: "Path" },
    { key: "status", label: "Status" },
    { key: "meaning", label: "Meaning" },
    { key: "bytes", label: "Request + response", unit: "bytes" },
    { key: "headerPct", label: "Response headers", unit: "%" },
  ],
  resultHint:
    "List the status codes you saw and what caused each. Say which methods changed the device, and comment on how much of each response was headers.",
  viva: [
    {
      q: "What is the difference between GET and PUT?",
      a: "GET only reads a resource and does not change the device. PUT sends a new value that replaces the resource, such as setting the LED to on.",
    },
    {
      q: "Why did POST /readings return 201 instead of 200?",
      a: "201 Created means a new resource was made. The Location header gives the path of the new reading.",
    },
    {
      q: "What is the difference between 404 and 405?",
      a: "404 means there is no resource at that path. 405 means the path exists but does not accept that method; the Allow header lists the methods it does accept.",
    },
    {
      q: "When does the device answer 400 Bad Request?",
      a: "When it cannot understand the request body, for example invalid JSON or a value like \"blue\" for the LED state.",
    },
    {
      q: "What does 401 Unauthorized mean, and how did you fix it?",
      a: "The device needs a valid token before it answers. Sending the correct token in the Authorization header fixed it.",
    },
    {
      q: "Why is HTTP considered heavy for small IoT devices?",
      a: "Every request and response carries text headers that are often larger than the data itself, and HTTP runs over TCP, which needs a connection.",
    },
  ],
};

export default record;
