"use client";

import { useEffect, useState } from "react";
import { searchCustomers } from "@/app/documents/serverActions";

type CustomerSuggestion = {
  id: string;
  name: string | null;
  companyName: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  isBusiness: boolean;
  email: string | null;
  phone: string | null;
  city: string | null;
};

function getCustomerLabel(customer: CustomerSuggestion): string {
  const byName = String(customer.name ?? "").trim();
  if (byName) return byName;

  const company = String(customer.companyName ?? "").trim();
  if (company) return company;

  const contact = `${String(customer.contactFirstName ?? "").trim()} ${String(
    customer.contactLastName ?? ""
  ).trim()}`.trim();
  if (contact) return contact;

  return customer.isBusiness ? "Gewerbekunde" : "Privatkunde";
}

export default function CustomerSearchField() {
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerSuggestion[]>([]);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showCustomerResults) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const results = await searchCustomers(customerQuery.trim());
        if (cancelled) return;
        setCustomerResults(results as CustomerSuggestion[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customerQuery, showCustomerResults]);

  function handleQueryChange(value: string) {
    setCustomerQuery(value);
    setShowCustomerResults(true);

    const normalizedValue = value.trim();
    const normalizedSelected = selectedCustomerLabel.trim();
    if (selectedCustomerId && normalizedValue !== normalizedSelected) {
      setSelectedCustomerId("");
      setSelectedCustomerLabel("");
    }
  }

  function pickCustomer(customer: CustomerSuggestion) {
    const label = getCustomerLabel(customer);
    setSelectedCustomerId(customer.id);
    setSelectedCustomerLabel(label);
    setCustomerQuery(label);
    setShowCustomerResults(false);
  }

  function clearCustomer() {
    setSelectedCustomerId("");
    setSelectedCustomerLabel("");
    setCustomerQuery("");
    setShowCustomerResults(false);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="customerId" value={selectedCustomerId} />
      <label className="mb-1 block text-sm text-slate-300">Kunde (optional)</label>
      <div className="flex gap-2">
        <input
          name="customerName"
          value={customerQuery}
          onChange={(event) => handleQueryChange(event.target.value)}
          onFocus={() => setShowCustomerResults(true)}
          placeholder="Suche oder Freitext"
          className="w-full rounded border border-slate-700 bg-slate-800 p-2"
        />
        <button
          type="button"
          className="rounded bg-cyan-600 px-3 py-2 text-sm text-white hover:bg-cyan-500"
          onClick={() => setShowCustomerResults((value) => !value)}
          aria-label="Kundenliste ein- oder ausklappen"
        >
          \u2261
        </button>
      </div>

      <div
        className={`max-h-40 overflow-auto rounded border border-slate-700 bg-slate-900 ${
          showCustomerResults ? "" : "hidden"
        }`}
      >
        {loading ? (
          <div className="p-3 text-sm text-slate-500">{"Suche l\u00e4uft..."}</div>
        ) : customerResults.length === 0 ? (
          <div className="p-3 text-sm text-slate-500">
            {customerQuery.trim() ? "Keine Treffer" : "Vorschl\u00e4ge werden geladen..."}
          </div>
        ) : (
          customerResults.map((customer) => {
            const label = getCustomerLabel(customer);
            return (
              <button
                key={customer.id}
                type="button"
                onClick={() => pickCustomer(customer)}
                className="flex w-full items-start justify-between gap-2 border-b border-slate-800 p-3 text-left hover:bg-slate-800/60"
              >
                <div>
                  <div className="font-semibold text-slate-100">{label}</div>
                  <div className="text-xs text-slate-400">
                    {customer.city ?? ""}
                    {customer.email ? ` | ${customer.email}` : ""}
                    {customer.phone ? ` | ${customer.phone}` : ""}
                  </div>
                </div>
                <div className="text-xs text-slate-500">{customer.id.slice(0, 6)}...</div>
              </button>
            );
          })
        )}
      </div>

      {selectedCustomerId ? (
        <button
          type="button"
          onClick={clearCustomer}
          className="rounded bg-rose-700 px-3 py-1 text-xs text-white hover:bg-rose-600"
        >
          Kunde entfernen
        </button>
      ) : null}
    </div>
  );
}
