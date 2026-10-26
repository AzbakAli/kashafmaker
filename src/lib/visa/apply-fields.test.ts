import { describe, expect, it } from "vitest";
import { applyVisaFieldsToPassengerForm } from "./apply-fields";

describe("applyVisaFieldsToPassengerForm", () => {
  it("fills only the four visa fields and keeps other passenger form values", () => {
    const form = {
      fullName: "Old",
      passportNumber: "",
      nationality: "",
      gender: "FEMALE",
      visaType: "",
      phone: "+966500000000",
      notes: "keep me",
    };
    const next = applyVisaFieldsToPassengerForm(form, {
      fullName: "ALEXANDRE MARTIN",
      passportNumber: "12AB34567",
      nationality: "France",
      visaType: "Tourism Visit",
    });
    expect(next.fullName).toBe("ALEXANDRE MARTIN");
    expect(next.passportNumber).toBe("12AB34567");
    expect(next.nationality).toBe("France");
    expect(next.visaType).toBe("Tourism Visit");
    expect(next.gender).toBe("FEMALE");
    expect(next.phone).toBe("+966500000000");
    expect(next.notes).toBe("keep me");
  });

  it("allows manual edits to overwrite extracted values later", () => {
    const filled = applyVisaFieldsToPassengerForm(
      { fullName: "", passportNumber: "", nationality: "", visaType: "" },
      { fullName: "A", passportNumber: "1", nationality: "France", visaType: "Tourism Visit" }
    );
    filled.fullName = "Corrected Name";
    expect(filled.fullName).toBe("Corrected Name");
  });
});
