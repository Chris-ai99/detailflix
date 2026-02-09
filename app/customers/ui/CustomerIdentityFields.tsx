"use client";

import { useState } from "react";

type CustomerIdentityFieldsProps = {
  inputClass: string;
  labelClass: string;
  initialIsBusiness?: boolean;
  initialCompanyName?: string;
  initialFirstName?: string;
  initialLastName?: string;
  initialContactUseZh?: boolean;
};

export default function CustomerIdentityFields({
  inputClass,
  labelClass,
  initialIsBusiness = false,
  initialCompanyName = "",
  initialFirstName = "",
  initialLastName = "",
  initialContactUseZh = false,
}: CustomerIdentityFieldsProps) {
  const [isBusiness, setIsBusiness] = useState(initialIsBusiness);

  return (
    <>
      <div className="md:col-span-2">
        <span className={labelClass}>Kundentyp</span>
        <div className="flex flex-wrap gap-2 rounded border border-slate-600 bg-slate-900 p-1.5">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-200">
            <input
              type="radio"
              name="isBusiness"
              value="0"
              checked={!isBusiness}
              onChange={() => setIsBusiness(false)}
              className="h-4 w-4"
            />
            Privat
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-200">
            <input
              type="radio"
              name="isBusiness"
              value="1"
              checked={isBusiness}
              onChange={() => setIsBusiness(true)}
              className="h-4 w-4"
            />
            Unternehmen
          </label>
        </div>
      </div>

      {isBusiness ? (
        <div className="md:col-span-2">
          <label className={labelClass}>Unternehmensname *</label>
          <input
            name="companyName"
            required={isBusiness}
            defaultValue={initialCompanyName}
            placeholder="Beispiel GmbH"
            className={inputClass}
          />
        </div>
      ) : (
        <input type="hidden" name="companyName" value={initialCompanyName} />
      )}

      <div>
        <label className={labelClass}>{isBusiness ? "Ansprechpartner Vorname" : "Vorname"}</label>
        <input
          name="firstName"
          defaultValue={initialFirstName}
          placeholder="Max"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>{isBusiness ? "Ansprechpartner Nachname" : "Nachname"}</label>
        <input
          name="lastName"
          defaultValue={initialLastName}
          placeholder="Mustermann"
          className={inputClass}
        />
      </div>

      {isBusiness ? (
        <div className="md:col-span-2">
          <label className="inline-flex items-center gap-2 rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200">
            <input
              type="checkbox"
              name="contactUseZh"
              defaultChecked={initialContactUseZh}
              className="h-4 w-4"
            />
            Zusatz &quot;z. H.&quot; beim Ansprechpartner verwenden
          </label>
        </div>
      ) : (
        <input type="hidden" name="contactUseZh" value="" />
      )}
    </>
  );
}
