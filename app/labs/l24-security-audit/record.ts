import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Simulated smart home with eight devices and ten weaknesses, one for each item of the OWASP IoT Top 10 (2018), and a simulated attack check",
  ],
  theory:
    "A security audit looks for weaknesses before attackers do, with the owner's permission. The OWASP IoT Top 10 (2018) lists the most common IoT weaknesses: weak or default passwords, insecure network services, insecure ecosystem interfaces, no secure update mechanism, outdated components, poor privacy protection, insecure data transfer, poor device management, insecure defaults and weak physical hardening. A proper fix removes the weakness; a partial fix only reduces it. An attack succeeds if every weakness on at least one of its paths is still open, so all paths must be closed (defence in depth).",
  procedure: [
    "Open lab L24, Smart home security audit. Press Run attack simulation and record the starting point.",
    "Tap each device and press Inspect; read what the check finds.",
    "Choose a fix for each weakness and read the feedback. Try one partial fix.",
    "Run the simulation again after some fixes and record it.",
    "Fix everything properly, run the simulation, record it, then open the lab record and print it.",
  ],
  observationColumns: [
    { key: "check", label: "Check" },
    { key: "found", label: "Weaknesses found" },
    { key: "fixed", label: "Fixed properly" },
    { key: "score", label: "Score", unit: "/ 100" },
    { key: "blocked", label: "Attacks blocked" },
    { key: "possible", label: "Still possible" },
  ],
  resultHint: "State how the score and the blocked attacks changed, which fixes were partial and why they were not enough, and which weakness each remaining attack used.",
  viva: [
    {
      q: "What is the OWASP IoT Top 10?",
      a: "A list of the ten most common IoT weaknesses published by OWASP in 2018, starting with weak, guessable or hardcoded passwords and insecure network services.",
    },
    {
      q: "Why was \"change admin to admin123\" only a partial fix?",
      a: "admin123 is on every common password list, so automated attacks can still guess it. A long, unique password is needed.",
    },
    {
      q: "Why did closing Telnet not stop the botnet on its own?",
      a: "The botnet had a second path: UPnP had opened the camera to the internet, and the camera still used its default password. Both paths had to be closed.",
    },
    {
      q: "Why is moving MQTT to another port not a fix?",
      a: "Changing the port number does not encrypt anything; anyone who finds the port can still read the messages. Turning on TLS and per-device logins fixes it.",
    },
    {
      q: "What does 'lack of device management' mean in the forgotten camera?",
      a: "Nobody knew the old camera was on the network, so it was never updated or watched. Keeping an inventory of every device and removing unknown ones fixes it.",
    },
    {
      q: "Why must an audit have the owner's permission?",
      a: "Testing someone else's devices or network without permission is illegal. A security audit is done for, and with the agreement of, the owner.",
    },
  ],
};

export default record;
