import { describe, expect, it } from "vitest";
import { PARTS, SCENARIOS, check, describePath, getScenario, readingAt, ruleFires, type Placement } from "./engine";

const cooling = getScenario("cooling");
const irrigation = getScenario("irrigation");
const parking = getScenario("parking");

const goodCooling: Placement = {
  sense: "dht11",
  process: "esp32",
  connect: "wifi",
  cloud: "cloud",
  app: "app",
  act: "fan",
};

describe("L01 check", () => {
  it("accepts a correct system", () => {
    const result = check(cooling, goodCooling);
    expect(result.valid).toBe(true);
    expect(result.problem).toBeUndefined();
    expect(Object.values(result.slots).every((s) => s === "ok")).toBe(true);
    expect(result.tips).toHaveLength(0);
  });

  it("reports the first empty slot", () => {
    const result = check(cooling, { ...goodCooling, cloud: undefined });
    expect(result.valid).toBe(false);
    expect(result.problem?.slot).toBe("cloud");
    expect(result.problem?.message).toContain("stored and analysed");
    expect(result.slots.cloud).toBe("empty");
  });

  it("explains a part in the wrong role", () => {
    const result = check(cooling, { ...goodCooling, sense: "fan" });
    expect(result.slots.sense).toBe("wrong");
    expect(result.problem?.message).toMatch(/Fan with relay is an actuator, not a sensor/);
  });

  it("explains a sensor that measures the wrong thing", () => {
    const result = check(cooling, { ...goodCooling, sense: "soil" });
    expect(result.problem?.message).toBe(
      "Soil moisture probe measures soil moisture, but this system must measure temperature.",
    );
  });

  it("explains an actuator that does the wrong job", () => {
    const result = check(cooling, { ...goodCooling, act: "pump" });
    expect(result.problem?.slot).toBe("act");
    expect(result.problem?.message).toContain("must cool the room");
  });

  it("only reports the first problem but marks every slot", () => {
    const result = check(cooling, { sense: "pump", act: "dht11" });
    expect(result.problem?.slot).toBe("sense");
    expect(result.slots.act).toBe("wrong");
    expect(result.slots.process).toBe("empty");
  });

  it("gives tips for an Arduino without Wi-Fi and Wi-Fi in a field", () => {
    const field = check(irrigation, {
      sense: "soil",
      process: "esp32",
      connect: "wifi",
      cloud: "cloud",
      app: "app",
      act: "pump",
    });
    expect(field.valid).toBe(true);
    expect(field.tips.join(" ")).toContain("LoRa");

    const uno = check(cooling, { ...goodCooling, process: "uno" });
    expect(uno.valid).toBe(true);
    expect(uno.tips.join(" ")).toContain("no built-in Wi-Fi");
  });

  it("offers every correct part in each scenario's tray", () => {
    for (const s of SCENARIOS) {
      const roles = new Set(s.tray.map((id) => PARTS[id].role));
      expect(roles.size).toBe(6);
      expect(s.tray.some((id) => PARTS[id].measures === s.quantity)).toBe(true);
      expect(s.tray.some((id) => PARTS[id].does === s.action)).toBe(true);
    }
  });

  it("describes the data path", () => {
    expect(describePath(goodCooling)).toBe(
      "DHT11 sensor → ESP32 → Wi-Fi router → IoT cloud platform → Mobile app → Fan with relay",
    );
    expect(describePath({ sense: "dht11" })).toMatch(/^DHT11 sensor → \? → /);
  });
});

describe("L01 running system", () => {
  it("crosses each rule's threshold during one cycle", () => {
    for (const s of [cooling, irrigation, parking]) {
      const states = Array.from({ length: 20 }, (_, i) => ruleFires(s, readingAt(s, i)));
      expect(states).toContain(true);
      expect(states).toContain(false);
    }
  });

  it("applies the rules correctly", () => {
    expect(ruleFires(cooling, 31)).toBe(true);
    expect(ruleFires(cooling, 29.9)).toBe(false);
    expect(ruleFires(irrigation, 20)).toBe(true);
    expect(ruleFires(parking, 30)).toBe(true);
    expect(ruleFires(parking, 150)).toBe(false);
  });
});
