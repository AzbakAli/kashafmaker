export type PassengerVisaFields = {
  fullName: string;
  passportNumber: string;
  nationality: string;
  visaType: string;
};

export function applyVisaFieldsToPassengerForm<T extends PassengerVisaFields>(
  form: T,
  fields: PassengerVisaFields
): T {
  return {
    ...form,
    fullName: fields.fullName,
    passportNumber: fields.passportNumber,
    nationality: fields.nationality,
    visaType: fields.visaType,
  };
}
