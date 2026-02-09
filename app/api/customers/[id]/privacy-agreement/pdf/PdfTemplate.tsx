import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

type PrivacyAgreementPdfInput = {
  company: {
    name: string;
    ownerName: string;
    street: string;
    zip: string;
    city: string;
    phone: string;
    email: string;
    logoDataUrl: string;
  };
  customer: {
    firstName: string;
    lastName: string;
    company: string;
    street: string;
    postalCode: string;
    city: string;
    email: string;
    phone: string;
    vehicle: string;
    plate: string;
  };
  placeDate: string;
  accepted?: boolean;
  signatureDataUrl?: string;
  signedAtIso?: string;
};

const mm = (value: number) => (value * 72) / 25.4;

const styles = StyleSheet.create({
  page: {
    paddingTop: mm(10),
    paddingHorizontal: mm(11),
    paddingBottom: mm(10),
    fontSize: 9.5,
    color: "#111",
    lineHeight: 1.32,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  companyBlock: {
    width: "58%",
    fontSize: 10.2,
    lineHeight: 1.45,
  },
  logoBlock: {
    width: "40%",
    alignItems: "flex-end",
  },
  logoImage: {
    width: 95,
    height: 58,
    objectFit: "contain",
  },
  logoText: {
    marginTop: 3,
    color: "#666",
    fontSize: 12.4,
    letterSpacing: 0.9,
  },
  body: {
    flex: 1,
    justifyContent: "flex-start",
  },
  sectionTitle: {
    fontSize: 15.6,
    fontWeight: 700,
    marginBottom: 6,
  },
  fieldGroup: {
    gap: 6,
  },
  row2: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  half: {
    width: "49%",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 19.5,
  },
  label: {
    width: 90,
    fontSize: 9.8,
  },
  valueLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    minHeight: 15,
    justifyContent: "flex-end",
    paddingBottom: 2,
  },
  policyBox: {
    marginTop: 9,
    borderWidth: 1.2,
    borderColor: "#0f766e",
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  policyTitle: {
    textAlign: "left",
    fontSize: 10.3,
    fontWeight: 700,
    marginBottom: 3,
  },
  policyText: {
    textAlign: "left",
    fontSize: 8.7,
    lineHeight: 1.36,
    marginBottom: 2,
  },
  dataTitle: {
    textAlign: "left",
    marginTop: 5,
    marginBottom: 3,
    fontSize: 10.3,
    fontWeight: 700,
  },
  dataItem: {
    textAlign: "left",
    fontSize: 8.8,
    lineHeight: 1.36,
    marginBottom: 2,
  },
  bottom: {
    marginTop: 5,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxMark: {
    fontSize: 8,
    fontWeight: 700,
  },
  checkboxLabel: {
    fontSize: 9.8,
  },
  metaRow: {
    marginTop: 5,
    width: "62%",
  },
  signatureWrap: {
    marginTop: 5,
    width: 220,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    minHeight: 42,
    justifyContent: "flex-end",
  },
  signatureImg: {
    width: 206,
    height: 36,
    objectFit: "contain",
  },
  signatureLabel: {
    marginTop: 2,
    fontSize: 8.2,
  },
  signedAt: {
    marginTop: 3,
    fontSize: 6.7,
    color: "#555",
  },
});

function clean(value: string | null | undefined): string {
  return (value || "").trim();
}

function safe(value: string | null | undefined): string {
  return clean(value) || " ";
}

function zipCity(zip: string, city: string): string {
  return [clean(zip), clean(city)].filter(Boolean).join(" ") || "-";
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueLine}>
        <Text>{safe(value)}</Text>
      </View>
    </View>
  );
}

export function buildPrivacyAgreementPdfDocument(input: PrivacyAgreementPdfInput) {
  const companyName = clean(input.company.name) || "Unternehmen";
  const companyOwner = clean(input.company.ownerName);
  const companyStreet = clean(input.company.street);
  const companyZipCity = zipCity(input.company.zip, input.company.city);
  const companyEmail = clean(input.company.email);
  const companyPhone = clean(input.company.phone);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.companyBlock}>
            <Text>{companyName}</Text>
            <Text>{companyStreet || "-"}</Text>
            <Text>{companyZipCity || "-"}</Text>
            {companyPhone ? <Text>Tel: {companyPhone}</Text> : null}
            {companyEmail ? <Text>E-Mail: {companyEmail}</Text> : null}
          </View>
          <View style={styles.logoBlock}>
            {input.company.logoDataUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={input.company.logoDataUrl} style={styles.logoImage} />
            ) : null}
            <Text style={styles.logoText}>{companyName}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View>
            <Text style={styles.sectionTitle}>Persoenliche Informationen:</Text>

            <View style={styles.fieldGroup}>
              <View style={styles.row2}>
                <View style={styles.half}>
                  <Field label="Vorname:" value={input.customer.firstName} />
                </View>
                <View style={styles.half}>
                  <Field label="Nachname:" value={input.customer.lastName} />
                </View>
              </View>

              <Field label="Unternehmen:" value={input.customer.company} />

              <View style={styles.row2}>
                <View style={styles.half}>
                  <Field label="Strasse, Nr.:" value={input.customer.street} />
                </View>
                <View style={styles.half}>
                  <Field label="Postleizahl:" value={input.customer.postalCode} />
                </View>
              </View>

              <Field label="Stadt:" value={input.customer.city} />
              <Field label="E-Mail:" value={input.customer.email} />
              <Field label="Telefon:" value={input.customer.phone} />

              <View style={styles.row2}>
                <View style={styles.half}>
                  <Field label="Fahrzeug:" value={input.customer.vehicle} />
                </View>
                <View style={styles.half}>
                  <Field label="Kennzeichen:" value={input.customer.plate} />
                </View>
              </View>
            </View>

            <View style={styles.policyBox}>
              <Text style={styles.policyTitle}>Einverstaendniserklaerung zur Nutzung von Fotos des Fahrzeugs:</Text>
              <Text style={styles.policyText}>
                • Ich gewaehre {companyName} das uneingeschraenkte und unwiderrufliche Recht, Fotos meines
                Fahrzeugs zu erstellen und fuer Dokumentation, Praesentation und Werbung zu verwenden.
              </Text>
              <Text style={styles.policyText}>
                • Das Kennzeichen kann auf Wunsch unkenntlich gemacht werden.
              </Text>
              <Text style={styles.policyText}>
                • Ich bin einverstanden, dass Bilder in Print- und Online-Publikationen, auf Webseiten und in
                sozialen Medien verwendet werden duerfen.
              </Text>
              <Text style={styles.policyText}>
                • Ich verzichte auf gesonderte Verguetung fuer die Nutzung dieser Fotoaufnahmen.
              </Text>

              <Text style={styles.dataTitle}>Datenschutzerklaerung:</Text>
              <Text style={styles.dataItem}>
                <Text style={{ fontWeight: 700 }}>1. Verantwortlicher:</Text> {companyName}
                {companyOwner ? `, Inhaber ${companyOwner}` : ""}
                {companyStreet ? `, ${companyStreet}` : ""}
                {companyZipCity ? `, ${companyZipCity}` : ""}
              </Text>
              <Text style={styles.dataItem}>
                <Text style={{ fontWeight: 700 }}>2. Verarbeitete Daten:</Text> Name, Anschrift,
                Telefonnummer, E-Mail-Adresse und Fahrzeugdaten.
              </Text>
              <Text style={styles.dataItem}>
                <Text style={{ fontWeight: 700 }}>3. Zwecke:</Text> Werkstattleistungen, Terminplanung,
                Kundenkommunikation, Rechnungsstellung und Zahlungsabwicklung.
              </Text>
              <Text style={styles.dataItem}>
                <Text style={{ fontWeight: 700 }}>4. Kontakt/Newsletter-Einwilligung:</Text> Ich willige ein,
                dass mich {companyName} per E-Mail, Telefon oder Messenger zu Rueckfragen, Servicehinweisen,
                Angeboten und einem Newsletter kontaktieren darf. Widerruf jederzeit mit Wirkung fuer die
                Zukunft moeglich.
              </Text>
              <Text style={styles.dataItem}>
                <Text style={{ fontWeight: 700 }}>5. Rechtsgrundlagen:</Text> Art. 6 Abs. 1 lit. b, c, f
                DSGVO sowie lit. a DSGVO fuer Kontakt/Newsletter.
              </Text>
              <Text style={styles.dataItem}>
                <Text style={{ fontWeight: 700 }}>6. Weitergabe/Speicherung:</Text> Weitergabe nur wenn
                noetig oder gesetzlich vorgeschrieben. Speicherung nur solange erforderlich.
              </Text>
              <Text style={styles.dataItem}>
                <Text style={{ fontWeight: 700 }}>7. Ihre Rechte:</Text> Auskunft, Berichtigung, Loeschung,
                Einschraenkung, Datenuebertragbarkeit, Widerspruch.
              </Text>
              <Text style={styles.dataItem}>
                <Text style={{ fontWeight: 700 }}>8. Kontakt:</Text> {companyName}
                {companyOwner ? `, ${companyOwner}` : ""}
                {companyStreet ? `, ${companyStreet}` : ""}
                {companyZipCity ? `, ${companyZipCity}` : ""}
                {companyEmail ? `, ${companyEmail}` : ""}
                {companyPhone ? `, ${companyPhone}` : ""}
              </Text>
            </View>
          </View>

          <View style={styles.bottom}>
            <View style={styles.checkboxRow}>
              <View style={styles.checkbox}>
                {input.accepted ? <Text style={styles.checkboxMark}>X</Text> : null}
              </View>
              <Text style={styles.checkboxLabel}>
                Ich habe die Bedingungen gelesen und akzeptiert, inkl. Kontakt/Newsletter-Einwilligung.
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Field label="Datum und Ort:" value={input.placeDate} />
            </View>

            <View style={styles.signatureWrap}>
              {input.signatureDataUrl ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={input.signatureDataUrl} style={styles.signatureImg} />
              ) : null}
            </View>
            <Text style={styles.signatureLabel}>Unterschrift des Fahrzeughalters / Fahrers</Text>

            {input.signedAtIso ? <Text style={styles.signedAt}>Digital signiert am {input.signedAtIso}</Text> : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}
