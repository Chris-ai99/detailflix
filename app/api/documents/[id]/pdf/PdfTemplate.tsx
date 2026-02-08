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

export type CompanyProfile = {
  name: string;
  owner?: string | null;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  bankName?: string | null;
  iban?: string | null;
  bic?: string | null;
  vatId?: string | null;
  noticeRed?: string | null;
  logoDataUrl?: string | null;
};

export const DEFAULT_COMPANY: CompanyProfile = {
  name: "Autoaufbereitung Köhler",
  owner: "Inhaber Chris Köhler",
  street: "Fabrikstraße 17",
  zip: "33659",
  city: "Bielefeld",
  phone: "+49171/1115710",
  email: "info@autoaufbereitung-bi.de",
  website: "www.autoaufbereitung-bi.de",
  bankName: "Sparkasse Bielefeld",
  iban: "DE15 4805 0161 0100 0406 74",
  bic: "SPBIDE3BXXX",
  vatId: "DE 348645807",
  noticeRed: "Bitte beachten Sie die geänderte Bankverbindung!",
  logoDataUrl: null,
};

export function companyFromSettings(settings: any | null | undefined): CompanyProfile {
  if (!settings) return DEFAULT_COMPANY;

  const clean = (value: unknown) => {
    if (typeof value !== "string") return null;
    const v = value.trim();
    return v.length ? v : null;
  };

  const hasNoticeRed = Object.prototype.hasOwnProperty.call(settings, "noticeRed");

  // Merge mit Defaults: wenn in den Einstellungen noch etwas leer ist,
  // bleibt der Default aktiv (z.B. damit EPC-QR weiterhin funktioniert).
  return {
    name: clean(settings.companyName) ?? DEFAULT_COMPANY.name,
    owner: clean(settings.ownerName) ?? DEFAULT_COMPANY.owner,
    street: clean(settings.street) ?? DEFAULT_COMPANY.street,
    zip: clean(settings.zip) ?? DEFAULT_COMPANY.zip,
    city: clean(settings.city) ?? DEFAULT_COMPANY.city,
    phone: clean(settings.phone) ?? DEFAULT_COMPANY.phone,
    email: clean(settings.email) ?? DEFAULT_COMPANY.email,
    website: clean(settings.website) ?? DEFAULT_COMPANY.website,
    bankName: clean(settings.bankName) ?? DEFAULT_COMPANY.bankName,
    iban: clean(settings.iban) ?? DEFAULT_COMPANY.iban,
    bic: clean(settings.bic) ?? DEFAULT_COMPANY.bic,
    vatId: clean(settings.vatId) ?? DEFAULT_COMPANY.vatId,
    noticeRed: hasNoticeRed ? clean(settings.noticeRed) : DEFAULT_COMPANY.noticeRed,
    logoDataUrl: clean(settings.logoDataUrl) ?? null,
  };
}

// DIN 5008 (Fensterumschlag): MaÃŸe in mm, Umrechnung in PDF-Punkte.
const mm = (value: number) => (value * 72) / 25.4;

const styles = StyleSheet.create({
  page: {
    // Mehr Bottom-Padding, damit Footer (fixed) nie Ã¼ber den Content lÃ¤uft.
    paddingTop: mm(12),
    paddingHorizontal: mm(20),
    paddingBottom: mm(45),
    fontSize: 10,
    color: "#1a1a1a",
  },
  watermark: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 60,
    color: "#000",
    opacity: 0.06,
    transform: "rotate(-25deg)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    // Header ist absolut positioniert, damit das DIN-5008 Anschriftenfeld fix bleibt.
    position: "absolute",
    left: mm(20),
    right: mm(20),
    top: mm(12),
  },
  logoBlock: { width: 260 },
  // Logo bewusst grÃ¶ÃŸer, damit es wie in deiner Vorlage wirkt.
  logoImage: { width: 160, height: 80, objectFit: "contain" },
  companyBlock: {
    textAlign: "right",
    fontSize: 10,
    lineHeight: 1.35,
  },
  senderLine: {
    position: "absolute",
    left: mm(27),
    top: mm(40),
    fontSize: 9,
    color: "#4b4b4b",
  },
  senderUnderline: {
    position: "absolute",
    left: mm(27),
    top: mm(43),
    borderBottomWidth: 1,
    borderBottomColor: "#2f2f2f",
    width: mm(92),
  },
  addressBlock: {
    // DIN 5008 Anschriftenfeld (Fenster): ca. 27mm von links, 45mm von oben
    position: "absolute",
    left: mm(27),
    top: mm(45),
    width: mm(85),
    height: mm(45),
    fontSize: 10,
    lineHeight: 1.35,
  },
  // Platzhalter, damit der FlieÃŸtext erst unterhalb des Anschriftenfeldes beginnt.
  topGap: { height: mm(70) },
  topGapSecondary: { height: mm(40) },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleLeft: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: mm(6) },
  titleMark: {
    width: 14,
    height: 1,
    backgroundColor: "#000",
  },
  title: { fontSize: 18, fontWeight: 700 },
  docInfo: { textAlign: "right", fontSize: 9, lineHeight: 1.4, marginTop: mm(-16) },
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
  taxNote: { fontSize: 9, lineHeight: 1.4, color: "#4b4b4b", marginTop: 6 },
  dividerLine: {
    marginVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#cfcfcf",
  },
  bankRow: { flexDirection: "row", justifyContent: "space-between" },
  qrBlock: { alignItems: "center", gap: 4 },
  qrLastPage: {
    position: "absolute",
    right: mm(20),
    // Oberhalb der Fußzeile platzieren, damit QR nicht im Footer sitzt
    bottom: mm(55),
    alignItems: "center",
    gap: 4,
  },
  footer: {
    position: "absolute",
    left: mm(20),
    right: mm(20),
    bottom: mm(10),
    zIndex: 10,
    borderTopWidth: 1,
    borderTopColor: "#cfcfcf",
    paddingTop: 10,
    fontSize: 9,
    lineHeight: 1.4,
  },
  footerRow: { flexDirection: "row", justifyContent: "space-between" },
  footerCol: { width: "32%" },
  footerRed: { color: "#d40000" },
  pageNumber: {
    alignSelf: "flex-end",
    marginTop: 6,
    fontSize: 8,
    color: "#6f6f6f",
  },
});

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatStreet(value?: string | null) {
  if (!value) return "-";
  const trimmed = value.trim();
  if (!trimmed) return "-";
  const match = trimmed.match(/^(\d+[a-zA-Z]?)\s+(.+)$/);
  if (match) {
    return `${match[2]} ${match[1]}`;
  }
  return trimmed;
}

function formatMoney(cents?: number | null) {
  if (typeof cents !== "number") return "-";
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

function formatZipCity(company: CompanyProfile) {
  const zip = (company.zip ?? "").trim();
  const city = (company.city ?? "").trim();
  return `${zip} ${city}`.trim();
}

export function buildEpcQrPayload(
  amountCents: number,
  reference: string | undefined,
  company: CompanyProfile
) {
  const amount = (Math.max(amountCents, 0) / 100).toFixed(2);
  return [
    "BCD",
    "001",
    "1",
    "SCT",
    (company.bic ?? "").replace(/\s+/g, ""),
    company.name,
    (company.iban ?? "").replace(/\s+/g, ""),
    `EUR${amount}`,
    "",
    reference ?? "",
    "",
  ].join("\n");
}

export function buildPdfDocument(doc: any, company: CompanyProfile, qrDataUrl?: string) {
  const customerName =
    doc.customer?.name || (doc.customer?.isBusiness ? "Gewerbekunde" : "-");
  const vehicleLabel = (doc.vehicle?.make ?? "-") + " " + (doc.vehicle?.model ?? "");
  const zipCity = formatZipCity(company);

  const lines = ([...(doc.lines ?? [])] as any[]).sort(
    (a, b) => Number(a.position ?? 0) - Number(b.position ?? 0)
  );
  const marginLines = lines.filter((l) => Boolean(l.isMarginScheme));
  const standardLines = lines.filter((l) => !Boolean(l.isMarginScheme));

  const sum = (arr: any[], key: string) =>
    arr.reduce((acc, l) => acc + Number(l?.[key] ?? 0), 0);

  const standardNetCents = sum(standardLines, "lineNetCents");
  const standardVatCents = sum(standardLines, "lineVatCents");
  const marginTotalCents = sum(marginLines, "lineNetCents");
  const grossTotalCents = standardNetCents + standardVatCents + marginTotalCents;

  const vatRatesUsed = Array.from(
    new Set(
      standardLines
        .map((l) => Number(l.vatRate ?? 19))
        .filter((r) => r === 7 || r === 19)
    )
  ).sort((a, b) => a - b);
  const vatLabel =
    vatRatesUsed.length === 1
      ? `${vatRatesUsed[0]}%`
      : vatRatesUsed.length > 1
        ? `${vatRatesUsed.join("% / ")}%`
        : "";

  const docTitle =
    doc.docType === "INVOICE"
      ? "Rechnung"
      : doc.docType === "OFFER"
        ? doc.offerType === "ESTIMATE"
          ? "Kostenvoranschlag"
          : "Angebot"
        : doc.docType === "CREDIT_NOTE"
          ? "Gutschrift"
          : doc.docType === "STORNO"
            ? "Storno"
            : doc.docType === "PURCHASE_CONTRACT"
              ? "Auftragsbestätigung"
              : "Dokument";

  const docNumberLabel =
    doc.docType === "INVOICE"
      ? "Rechnungsnummer"
      : doc.docType === "OFFER"
        ? doc.offerType === "ESTIMATE"
          ? "Kostenvoranschlagsnummer"
          : "Angebotsnummer"
        : doc.docType === "CREDIT_NOTE"
          ? "Gutschriftnummer"
          : doc.docType === "STORNO"
            ? "Stornonummer"
            : doc.docType === "PURCHASE_CONTRACT"
              ? "Auftragsnummer"
              : "Dokumentnummer";

  const introText =
    doc.docType === "INVOICE"
      ? "Vielen Dank für Ihren Auftrag. Hiermit stellen wir Ihnen folgenden Leistungen in Rechnung:"
      : doc.docType === "OFFER"
        ? "Vielen Dank für Ihr Interesse. Hiermit bieten wir Ihnen folgende Leistungen an:"
        : doc.docType === "CREDIT_NOTE"
          ? "Hiermit erstellen wir eine Gutschrift für folgende Positionen:"
          : doc.docType === "STORNO"
            ? "Hiermit erstellen wir einen Storno‑Beleg für folgende Positionen:"
            : doc.docType === "PURCHASE_CONTRACT"
              ? "Wir bedanken uns für Ihr Vertrauen und bestätigen den nachfolgenden Auftrag."
              : "Hiermit erstellen wir folgendes Dokument:";

  // Dynamische Seiteneinteilung basierend auf geschätzter Zeilenhöhe.
  const PAGE_HEIGHT_MM = 297;
  const PAGE_BODY_HEIGHT_MM = PAGE_HEIGHT_MM - 12 - 45; // top/bottom padding
  const TABLE_HEADER_MM = 8;
  const FIRST_PAGE_FIXED_MM = 70 + 18 + 16; // TopGap + Titel + Einleitung
  const OTHER_PAGE_FIXED_MM = 40; // TopGapSecondary
  const LINE_HEIGHT_MM = 4;
  const ROW_BASE_MM = 5;
  const titleLineChars = 34;
  const descLineChars = 48;

  const estimateRowHeightMm = (line: any) => {
    const title = String(line?.title ?? "-");
    const desc = String(line?.description ?? "");
    const titleLines = Math.max(1, Math.ceil(title.length / titleLineChars));
    const descLines = desc.trim().length
      ? Math.max(1, Math.ceil(desc.length / descLineChars))
      : 0;
    const vatLine = 1;
    const totalLines = titleLines + descLines + vatLine;
    return ROW_BASE_MM + totalLines * LINE_HEIGHT_MM;
  };

  const sumRowsHeight = (arr: any[]) =>
    arr.reduce((acc, line) => acc + estimateRowHeightMm(line), 0);

  const availableFirst = PAGE_BODY_HEIGHT_MM - FIRST_PAGE_FIXED_MM - TABLE_HEADER_MM;
  const availableOther = PAGE_BODY_HEIGHT_MM - OTHER_PAGE_FIXED_MM - TABLE_HEADER_MM;

  const extraLastBase = doc.docType === "INVOICE" ? 70 : 40;
  const extraLast =
    extraLastBase +
    (marginLines.length > 0 ? 6 : 0) +
    (company.noticeRed ? 6 : 0);

  const lineChunks: any[][] = [];
  let current: any[] = [];
  let remaining = availableFirst;

  lines.forEach((line) => {
    const rowHeight = estimateRowHeightMm(line);
    if (current.length && rowHeight > remaining) {
      lineChunks.push(current);
      current = [];
      remaining = availableOther;
    }
    current.push(line);
    remaining -= rowHeight;
  });
  if (current.length || lineChunks.length === 0) {
    lineChunks.push(current);
  }

  // Sicherstellen, dass die letzte Seite genug Platz für Summen/Bank/QR hat.
  // Falls nicht, werden Zeilen auf eine neue (zusätzliche) Seite ausgelagert.
  while (lineChunks.length > 0) {
    const lastIndex = lineChunks.length - 1;
    const lastCapacity =
      (lineChunks.length === 1 ? availableFirst : availableOther) - extraLast;
    const lastRows = lineChunks[lastIndex];
    const lastHeight = sumRowsHeight(lastRows);

    if (lastCapacity <= 0 || lastHeight <= lastCapacity || lastRows.length <= 1) {
      break;
    }

    const overflow: any[] = [];
    let remainingHeight = lastHeight;
    while (lastRows.length > 1 && remainingHeight > lastCapacity) {
      overflow.unshift(lastRows.pop());
      remainingHeight = sumRowsHeight(lastRows);
    }
    if (overflow.length) {
      lineChunks.push(overflow);
    } else {
      break;
    }
  }

  return (
    <Document>
      {lineChunks.map((chunk, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === lineChunks.length - 1;
        const watermarkPositions = [mm(90), mm(155), mm(220)];

        return (
          <Page key={`page-${pageIndex}`} size="A4" style={styles.page}>
            {/* Footer muss auf jeder Seite erscheinen */}
            <View style={styles.footer} fixed wrap={false}>
              <View style={styles.footerRow}>
                <View style={styles.footerCol}>
                  <Text style={{ fontWeight: 700 }}>{company.name}</Text>
                  {company.owner ? <Text>{company.owner}</Text> : null}
                  {company.street ? <Text>{company.street}</Text> : null}
                  {zipCity ? <Text>{zipCity}</Text> : null}
                </View>
                <View style={styles.footerCol}>
                  <Text style={{ fontWeight: 700 }}>Kontakt</Text>
                  {company.website ? <Text>{company.website}</Text> : null}
                  {company.email ? <Text>{company.email}</Text> : null}
                  {company.phone ? <Text>Tel.: {company.phone}</Text> : null}
                </View>
                <View style={styles.footerCol}>
                  <Text style={{ fontWeight: 700 }}>Bankverbindung</Text>
                  {company.noticeRed ? (
                    <Text style={styles.footerRed}>{company.noticeRed}</Text>
                  ) : null}
                  {company.bankName ? <Text>{company.bankName}</Text> : null}
                  {company.iban ? <Text>{company.iban}</Text> : null}
                  {company.bic ? <Text>{company.bic}</Text> : null}
                  {company.vatId ? <Text>USt.-IdNr.: {company.vatId}</Text> : null}
                </View>
              </View>

              {lineChunks.length > 1 ? (
                <Text style={styles.pageNumber}>
                  Seite {pageIndex + 1} / {lineChunks.length}
                </Text>
              ) : null}
            </View>

            {doc.docType === "INVOICE" && qrDataUrl && isLastPage ? (
              <View style={styles.qrLastPage} fixed>
                <Text style={{ fontSize: 8 }}>Zahlen mit EPC-QR</Text>
                <Image src={qrDataUrl} style={{ width: 90, height: 90 }} />
              </View>
            ) : null}

            {!doc.isFinal &&
              watermarkPositions.map((top, idx) => (
                <Text key={`draft-${pageIndex}-${idx}`} style={[styles.watermark, { top }]} fixed>
                  ENTWURF
                </Text>
              ))}
            {doc.isFinal && doc.status === "CANCELLED" && (
              <Text style={[styles.watermark, { top: mm(150) }]} fixed>
                STORNIERT
              </Text>
            )}

            <View style={styles.header}>
              <View style={styles.logoBlock}>
                {company.logoDataUrl ? (
                  <Image src={company.logoDataUrl} style={styles.logoImage} />
                ) : (
                  <Svg width={60} height={60}>
                    <Circle cx={30} cy={30} r={27} stroke="#6d6d6d" strokeWidth={1.2} />
                    <Path
                      d="M13 33 C21 27, 39 27, 47 33"
                      stroke="#6d6d6d"
                      strokeWidth={1}
                      fill="none"
                    />
                    <Path
                      d="M15 39 C23 36, 37 36, 45 39"
                      stroke="#6d6d6d"
                      strokeWidth={1}
                      fill="none"
                    />
                  </Svg>
                )}
              </View>
              <View style={styles.companyBlock}>
                <Text style={{ fontWeight: 700 }}>{company.name}</Text>
                {company.street ? <Text>{company.street}</Text> : null}
                {zipCity ? <Text>{zipCity}</Text> : null}
                {company.phone ? <Text>Tel.: {company.phone}</Text> : null}
                {company.email ? <Text>Mail: {company.email}</Text> : null}
              </View>
            </View>

            {isFirstPage ? (
              <>
                <Text style={styles.senderLine}>
                  {company.name} {company.street ?? ""} {zipCity}
                </Text>
                <View style={styles.senderUnderline} />

                <View style={styles.addressBlock}>
                  <Text>{customerName}</Text>
                  <Text>{formatStreet(doc.customer?.street ?? null)}</Text>
                  <Text>
                    {(doc.customer?.zip ?? "")} {(doc.customer?.city ?? "")}
                  </Text>
                </View>

                {/* Fließtext-Start unterhalb DIN 5008 Anschriftenfeld */}
                <View style={styles.topGap} />
              </>
            ) : (
              <View style={styles.topGapSecondary} />
            )}

            {isFirstPage ? (
              <View style={styles.titleRow}>
                <View style={styles.titleLeft}>
                  <View style={styles.titleMark} />
                  <Text style={styles.title}>{docTitle}</Text>
                </View>
                <View style={styles.docInfo}>
                  <Text>
                    {docNumberLabel}: {doc.docNumber}
                  </Text>
                  <Text>Erstelldatum: {formatDate(doc.issueDate)}</Text>
                  {doc.docType === "INVOICE" ? (
                    <Text>Leistungsdatum: {formatDate(doc.serviceDate ?? doc.issueDate)}</Text>
                  ) : null}
                  {doc.docType === "INVOICE" ? (
                    <Text>Fällig am: {formatDate(doc.dueDate)}</Text>
                  ) : null}
                  {doc.docType === "OFFER" ? (
                    <Text>Gültig bis: {formatDate(doc.validUntil)}</Text>
                  ) : null}
                  {doc.docType === "PURCHASE_CONTRACT" ? (
                    <Text>Lieferdatum: {formatDate(doc.deliveryDate)}</Text>
                  ) : null}
                  {(doc.docType === "CREDIT_NOTE" || doc.docType === "STORNO") &&
                  doc.creditFor?.docNumber ? (
                    <Text>Bezug: Rechnung {doc.creditFor.docNumber}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {isFirstPage ? (
              <>
                <Text style={styles.paragraph}>{introText}</Text>
                {vehicleLabel.trim() ? (
                  <Text style={styles.paragraph}>
                    {doc.docType === "INVOICE"
                      ? "Die Leistung wurde an folgendem Fahrzeug erbracht: "
                      : "Fahrzeug: "}
                    {vehicleLabel.trim()}
                  </Text>
                ) : null}
              </>
            ) : null}

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.colPos}>Pos.</Text>
                <Text style={styles.colArticle}>Artikel</Text>
                <Text style={styles.colPrice}>Preis</Text>
                <Text style={styles.colQty}>Anzahl</Text>
                <Text style={styles.colTotal}>Gesamt</Text>
              </View>

              {chunk.map((l: any, idx: number) => (
                <View key={l.id ?? `row-${pageIndex}-${idx}`} style={styles.tableRow}>
                  <Text style={styles.colPos}>{l.position ?? idx + 1 + pageIndex * rowsPerPage}</Text>
                  <View style={styles.colArticle}>
                    <Text>{l.title ?? "-"}</Text>
                    {l.description && <Text style={styles.subText}>{l.description}</Text>}
                    {(() => {
                      const vatRate = Number(l.vatRate ?? 19);
                      if (l.isMarginScheme) {
                        return (
                          <Text style={styles.subText}>
                            Differenzbesteuerung gem. §25a UStG
                          </Text>
                        );
                      }
                      if (vatRate === 0) {
                        return (
                          <Text style={styles.subText}>MwSt.: 0% (Weiterberechnung)</Text>
                        );
                      }
                      return <Text style={styles.subText}>MwSt.: {vatRate}%</Text>;
                    })()}
                  </View>
                  <Text style={styles.colPrice}>{formatMoney(l.unitNetCents)}</Text>
                  <Text style={styles.colQty}>{l.qty}</Text>
                  <Text style={styles.colTotal}>{formatMoney(l.lineNetCents)}</Text>
                </View>
              ))}
            </View>

            {isLastPage ? (
              <>
                <View style={styles.totals}>
          {marginLines.length > 0 ? (
            <>
              {standardNetCents !== 0 ? (
                <View style={styles.totalsRow}>
                  <Text>Zwischensumme (netto):</Text>
                  <Text>{formatMoney(standardNetCents)}</Text>
                </View>
              ) : null}
              {marginTotalCents !== 0 ? (
                <View style={styles.totalsRow}>
                  <Text>
                    {standardNetCents !== 0
                      ? "Differenzbesteuerte Positionen:"
                      : "Zwischensumme:"}
                  </Text>
                  <Text>{formatMoney(marginTotalCents)}</Text>
                </View>
              ) : null}
              {standardVatCents !== 0 ? (
                <View style={styles.totalsRow}>
                  <Text>zzgl. MwSt.{vatLabel ? ` (${vatLabel})` : ""}:</Text>
                  <Text>{formatMoney(standardVatCents)}</Text>
                </View>
              ) : null}
              <View style={styles.totalsRow}>
                <Text style={styles.totalsStrong}>Gesamtbetrag (brutto):</Text>
                <Text style={styles.totalsStrong}>{formatMoney(grossTotalCents)}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.totalsRow}>
                <Text>Zwischensumme (netto):</Text>
                <Text>{formatMoney(standardNetCents)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text>zzgl. MwSt.{vatLabel ? ` (${vatLabel})` : ""}:</Text>
                <Text>{formatMoney(standardVatCents)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsStrong}>Gesamtbetrag (brutto):</Text>
                <Text style={styles.totalsStrong}>{formatMoney(grossTotalCents)}</Text>
              </View>
            </>
          )}
        </View>

                {marginLines.length > 0 ? (
                  <Text style={styles.taxNote}>
                    Differenzbesteuerung gem. §25a UStG (kein gesonderter Umsatzsteuerausweis).
                  </Text>
                ) : null}

                <Text style={styles.paragraph}>
                  Wir danken Ihnen für Ihr Vertrauen und die gute Zusammenarbeit. Wir freuen uns
                  über Ihre Weiterempfehlung.
                </Text>

                {company.noticeRed ? <Text style={styles.notice}>{company.noticeRed}</Text> : null}

                {doc.docType === "INVOICE" ? (
                  <>
                    <View style={styles.dividerLine} />

                    <View style={styles.bankRow}>
                      <View>
                        <Text>Bitte überweisen Sie den Rechnungsbetrag auf unser Bankkonto.</Text>
                      </View>
                    </View>
                  </>
                ) : null}
              </>
            ) : null}
          </Page>
        );
      })}
    </Document>
  );
}
