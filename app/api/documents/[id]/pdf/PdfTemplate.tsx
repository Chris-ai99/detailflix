import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Circle,
  Path,
  Image,
} from "@react-pdf/renderer";

export const COMPANY = {
  name: "Autoaufbereitung Köhler",
  owner: "Inhaber Chris Köhler",
  street: "Fabrikstraße 17",
  zipCity: "33659 Bielefeld",
  phone: "+49171/1115710",
  email: "info@autoaufbereitung-bi.de",
  website: "www.autoaufbereitung-bi.de",
  bankName: "Sparkasse Bielefeld",
  iban: "DE15 4805 0161 0100 0406 74",
  bic: "SPBIDE3BXXX",
  vatId: "DE 348645807",
  noticeRed: "Bitte beachten Sie die geänderte Bankverbindung!",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingHorizontal: 40,
    paddingBottom: 28,
    fontSize: 10,
    color: "#1a1a1a",
  },
  watermark: {
    position: "absolute",
    top: 330,
    left: 40,
    fontSize: 60,
    color: "#000",
    opacity: 0.06,
    transform: "rotate(-25deg)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  logoBlock: { width: 240 },
  logoText: {
    fontSize: 12,
    letterSpacing: 1,
    color: "#6d6d6d",
    marginTop: 4,
  },
  companyBlock: {
    textAlign: "right",
    fontSize: 10,
    lineHeight: 1.35,
  },
  senderLine: { fontSize: 9, color: "#4b4b4b" },
  senderUnderline: {
    marginTop: 2,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2f2f2f",
    width: 260,
  },
  addressBlock: {
    marginBottom: 18,
    fontSize: 10,
    lineHeight: 1.35,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  titleLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  titleMark: {
    width: 14,
    height: 1,
    backgroundColor: "#000",
  },
  title: { fontSize: 18, fontWeight: 700 },
  docInfo: { textAlign: "right", fontSize: 9, lineHeight: 1.4 },
  paragraph: { fontSize: 10, lineHeight: 1.4, marginBottom: 6 },
  table: { marginTop: 10, borderTopWidth: 1, borderTopColor: "#d7d7d7" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f1f1",
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  colPos: { width: 28 },
  colArticle: { flex: 1, paddingRight: 8 },
  colPrice: { width: 70, textAlign: "right" },
  colQty: { width: 50, textAlign: "right" },
  colTotal: { width: 70, textAlign: "right" },
  subText: { fontSize: 8, color: "#6f6f6f", marginTop: 2 },
  totals: { alignSelf: "flex-end", marginTop: 8, width: 220 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  totalsStrong: { fontWeight: 700 },
  notice: { color: "#d40000", marginTop: 8, marginBottom: 6 },
  dividerLine: {
    marginVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#cfcfcf",
  },
  bankRow: { flexDirection: "row", justifyContent: "space-between" },
  qrBlock: { alignItems: "center", gap: 4 },
  footer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#cfcfcf",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    lineHeight: 1.4,
  },
  footerCol: { width: "32%" },
  footerRed: { color: "#d40000" },
});

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("de-DE");
}

function formatMoney(cents?: number | null) {
  if (typeof cents !== "number") return "-";
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

export function buildEpcQrPayload(amountCents: number, reference?: string) {
  const amount = (Math.max(amountCents, 0) / 100).toFixed(2);
  return [
    "BCD",
    "001",
    "1",
    "SCT",
    COMPANY.bic,
    COMPANY.name,
    COMPANY.iban.replace(/\s+/g, ""),
    `EUR${amount}`,
    "",
    reference ?? "",
    "",
  ].join("\n");
}

export function buildPdfDocument(doc: any, qrDataUrl?: string) {
  const customerName =
    doc.customer?.name || (doc.customer?.isBusiness ? "Gewerbekunde" : "-");
  const vehicleLabel =
    (doc.vehicle?.make ?? "-") + " " + (doc.vehicle?.model ?? "");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {!doc.isFinal && <Text style={styles.watermark}>ENTWURF</Text>}
        {doc.isFinal && doc.status === "CANCELLED" && (
          <Text style={styles.watermark}>STORNIERT</Text>
        )}

        <View style={styles.header}>
          <View style={styles.logoBlock}>
            <Svg width={46} height={46}>
              <Circle cx={23} cy={23} r={21} stroke="#6d6d6d" strokeWidth={1.2} />
              <Path
                d="M10 25 C16 20, 30 20, 36 25"
                stroke="#6d6d6d"
                strokeWidth={1}
                fill="none"
              />
              <Path
                d="M12 30 C18 27, 28 27, 34 30"
                stroke="#6d6d6d"
                strokeWidth={1}
                fill="none"
              />
            </Svg>
            <Text style={styles.logoText}>AUTOAUFBEREITUNG KÖHLER</Text>
          </View>
          <View style={styles.companyBlock}>
            <Text style={{ fontWeight: 700 }}>{COMPANY.name}</Text>
            <Text>{COMPANY.street}</Text>
            <Text>{COMPANY.zipCity}</Text>
            <Text>Tel.: {COMPANY.phone}</Text>
            <Text>Mail: {COMPANY.email}</Text>
          </View>
        </View>

        <Text style={styles.senderLine}>
          {COMPANY.name} {COMPANY.street} {COMPANY.zipCity}
        </Text>
        <View style={styles.senderUnderline} />

        <View style={styles.addressBlock}>
          <Text>{customerName}</Text>
          <Text>{doc.customer?.street ?? "-"}</Text>
          <Text>
            {(doc.customer?.zip ?? "")} {(doc.customer?.city ?? "")}
          </Text>
        </View>

        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <View style={styles.titleMark} />
            <Text style={styles.title}>
              {doc.docType === "INVOICE"
                ? "Rechnung"
                : doc.docType === "OFFER"
                  ? "Angebot"
                  : doc.docType === "CREDIT_NOTE"
                    ? "Gutschrift"
                    : "Kaufvertrag"}
            </Text>
          </View>
          <View style={styles.docInfo}>
            <Text>Rechnungsnummer: {doc.docNumber}</Text>
            <Text>Erstelldatum: {formatDate(doc.issueDate)}</Text>
            <Text>Fällig am: {formatDate(doc.dueDate)}</Text>
          </View>
        </View>

        <Text style={styles.paragraph}>
          Vielen Dank für Ihren Auftrag. Hiermit stellen wir Ihnen folgenden Leistungen in
          Rechnung:
        </Text>
        <Text style={styles.paragraph}>
          Die Leistung wurde an folgendem Fahrzeug erbracht: {vehicleLabel.trim()}
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colPos}>Pos.</Text>
            <Text style={styles.colArticle}>Artikel</Text>
            <Text style={styles.colPrice}>Preis</Text>
            <Text style={styles.colQty}>Anzahl</Text>
            <Text style={styles.colTotal}>Gesamt</Text>
          </View>

          {(doc.lines ?? []).map((l: any, idx: number) => (
            <View key={l.id} style={styles.tableRow}>
              <Text style={styles.colPos}>{idx + 1}</Text>
              <View style={styles.colArticle}>
                <Text>{l.title ?? "-"}</Text>
                {l.description && <Text style={styles.subText}>{l.description}</Text>}
              </View>
              <Text style={styles.colPrice}>{formatMoney(l.unitNetCents)}</Text>
              <Text style={styles.colQty}>{l.qty}</Text>
              <Text style={styles.colTotal}>{formatMoney(l.lineNetCents)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text>Zwischensumme (netto):</Text>
            <Text>{formatMoney(doc.netTotalCents)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>zzgl. MwSt. (19%):</Text>
            <Text>{formatMoney(doc.vatTotalCents)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsStrong}>Gesamtbetrag (brutto):</Text>
            <Text style={styles.totalsStrong}>{formatMoney(doc.grossTotalCents)}</Text>
          </View>
        </View>

        <Text style={styles.paragraph}>
          Wir danken Ihnen für Ihr Vertrauen und die gute Zusammenarbeit. Wir freuen uns über Ihre
          Weiterempfehlung.
        </Text>

        <Text style={styles.notice}>{COMPANY.noticeRed}</Text>
        <Text style={styles.paragraph}>Leistungsdatum ist Rechnungsdatum.</Text>

        <View style={styles.dividerLine} />

        <View style={styles.bankRow}>
          <View>
            <Text>Bitte überweisen Sie den Rechnungsbetrag auf unser Bankkonto.</Text>
          </View>
          {qrDataUrl && (
            <View style={styles.qrBlock}>
              <Text style={{ fontSize: 8 }}>Zahlen mit EPC-QR</Text>
              <Image src={qrDataUrl} style={{ width: 90, height: 90 }} />
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerCol}>
            <Text style={{ fontWeight: 700 }}>{COMPANY.name}</Text>
            <Text>{COMPANY.owner}</Text>
            <Text>{COMPANY.street}</Text>
            <Text>{COMPANY.zipCity}</Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={{ fontWeight: 700 }}>Kontakt</Text>
            <Text>{COMPANY.website}</Text>
            <Text>{COMPANY.email}</Text>
            <Text>Tel.: {COMPANY.phone}</Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={styles.footerRed}>{COMPANY.noticeRed}</Text>
            <Text>{COMPANY.bankName}</Text>
            <Text>{COMPANY.iban}</Text>
            <Text>{COMPANY.bic}</Text>
            <Text>USt.-IdNr.: {COMPANY.vatId}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}