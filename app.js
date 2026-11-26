// Web de facturas para creadoras de Stimada.
// El enlace solo lleva lo pendiente de pago (marca e importe) en el fragmento (#), que el navegador
// no envía al servidor. Los datos de la creadora no salen de su navegador: el PDF se genera aquí.
"use strict";

const STIMADA = { nombre: "Stimada Brand SL", nif: "B75764324", dir: ["C/ María Tubau 15C 5º 3ª", "28050 Madrid"], pais: { es: "España", en: "Spain" } };

// Impuestos por defecto. Si la situación de la creadora es otra, marca la casilla y los cambia.
const DEFECTO = {
  es: { iva: 21, ret: 0, mencion: "" },
  en: { iva: 0, ret: 24, mencion: "No Spanish VAT (reverse charge). Spanish non-resident income tax (IRNR) withheld by Stimada." }
};

const T = {
  es: {
    titulo: "Tu factura para Stimada",
    intro: "Rellena tus datos y descarga la factura en PDF. Después envíanos un mail a finance@stimada.com con el PDF adjunto.",
    sinDatos: "Este enlace no es válido. Usa el enlace que te enviamos por correo.",
    resumen: "Lo que vas a facturar", tusDatos: "Tus datos",
    nombre: "Nombre y apellidos (o razón social)", nif: "NIF / DNI / NIE", email: "Email (opcional)",
    direccion: "Dirección completa (calle, número, código postal y ciudad)", numero: "Nº de factura", fecha: "Fecha",
    pago: "IBAN para la transferencia",
    otro: "Mi situación es diferente (soy autónoma/o, no aplico IVA…)",
    iva: "IVA (%)", ret: "Retención IRPF (%)", mencion: "Mención fiscal (obligatoria si el IVA es 0 %)",
    boton: "Descargar mi factura en PDF",
    privacidad: "Tus datos no se guardan ni se envían a ningún sitio: el PDF se genera en tu navegador.",
    base: "Base imponible", ivaL: "IVA", retL: "Retención IRPF", total: "Total a cobrar",
    errCampos: "Rellena todos los campos (el email es opcional).",
    errPct: "El IVA y la retención tienen que ser un número entre 0 y 100 (pon 0 si no aplicas alguno).",
    errMencion: "Si no aplicas IVA, escribe el motivo en la mención fiscal.",
    generando: "Generando…", ok: "Factura descargada. Ahora respóndenos al correo con el PDF adjunto.",
    errPdf: "No se ha podido generar la factura. Inténtalo otra vez.",
    pdf: { factura: "FACTURA", num: "Nº", fecha: "Fecha", emisor: "Emisor", dest: "Destinatario", nif: "NIF",
      concepto: "Concepto", importe: "Importe", servicio: "Servicio de creación de contenido",
      base: "Base imponible", iva: "IVA", ret: "Retención IRPF", total: "TOTAL", pago: "Forma de pago: transferencia a", archivo: "Factura" }
  },
  en: {
    titulo: "Your invoice for Stimada",
    intro: "Fill in your details and download the invoice as a PDF. Then reply to our email with the PDF attached.",
    sinDatos: "This link is not valid. Please use the link we sent you by email.",
    resumen: "What you are invoicing", tusDatos: "Your details",
    nombre: "Full name (or company name)", nif: "Tax ID or passport number, with your country code first (e.g. AU123456789)", email: "Email (optional)",
    direccion: "Full address (street, number, postcode, city and country)", numero: "Invoice number", fecha: "Date",
    pago: "Bank details: account holder, IBAN or account number, bank name and SWIFT/BIC",
    otro: "My situation is different (EU resident, tax residence certificate, I charge VAT…)",
    iva: "VAT (%)", ret: "Spanish non-resident tax withheld (%)", mencion: "Tax note (required if VAT is 0 %)",
    boton: "Download my invoice as PDF",
    privacidad: "As you are not resident in Spain, Spanish law requires us to withhold 24% non-resident tax. If you send us a certificate of tax residence from your country's tax authority, we may be able to pay you the full amount. Your details are not stored or sent anywhere: the PDF is created in your browser.",
    base: "Subtotal", ivaL: "VAT", retL: "Non-resident tax withheld", total: "Total due",
    errCampos: "Please fill in all fields (email is optional).",
    errPct: "VAT and withholding must be a number between 0 and 100 (enter 0 if not applicable).",
    errMencion: "If you charge no VAT, please explain why in the tax note.",
    generando: "Creating…", ok: "Invoice downloaded. Now reply to our email with the PDF attached.",
    errPdf: "The invoice could not be created. Please try again.",
    pdf: { factura: "INVOICE", num: "No.", fecha: "Date", emisor: "From", dest: "Bill to", nif: "Tax ID",
      concepto: "Description", importe: "Amount", servicio: "Content creation services for Stimada",
      base: "Subtotal", iva: "VAT", ret: "Non-resident tax withheld (IRNR)", total: "TOTAL", pago: "Payment: bank transfer to", archivo: "Invoice" }
  }
};

const $ = id => document.getElementById(id);
const r2 = n => Math.round(n * 100) / 100;
let lang = "es";
let lineas = null;
const loc = () => (lang === "es" ? "es-ES" : "en-GB");
const eur = n => n.toLocaleString(loc(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const pct = n => n.toLocaleString(loc(), { maximumFractionDigits: 2 }) + " %";
// Letras que no se descomponen solas (para la fuente del PDF y el nombre del archivo).
const mapa = { "Ł": "L", "ł": "l", "Ø": "O", "ø": "o", "ß": "ss", "Đ": "D", "đ": "d", "Æ": "AE", "æ": "ae" };

// Formato del enlace: #<base64url de {"l":[["marca", importe], ...], "i":"en"?}>
function leerEnlace() {
  try {
    const h = location.hash.slice(1);
    if (!h) return null;
    const b64 = h.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((h.length + 3) % 4);
    const d = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0))));
    if (!Array.isArray(d.l) || !d.l.length) return null;
    const ls = d.l.map(([c, i]) => ({ marca: String(c).slice(0, 120), importe: r2(Number(i)) }));
    if (!ls.every(l => l.marca && Number.isFinite(l.importe) && l.importe > 0)) return null;
    return { lineas: ls, idioma: d.i === "en" ? "en" : "es" };
  } catch { return null; }
}

function leerPct(id) {
  const t = $(id).value.trim().replace(",", ".").replace("%", "");
  if (t === "") return NaN;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : NaN;
}

// Impuestos aplicados: los de por defecto del idioma, o los que ponga ella si marca la casilla.
function impuestos() {
  if (!$("otro").checked) return { ...DEFECTO[lang] };
  return { iva: leerPct("iva"), ret: leerPct("ret"), mencion: $("mencion").value.trim() };
}

function totales() {
  const base = r2(lineas.reduce((s, l) => s + l.importe, 0));
  const { iva, ret, mencion } = impuestos();
  const cIva = Number.isFinite(iva) ? r2(base * iva / 100) : null;
  const cRet = Number.isFinite(ret) ? r2(base * ret / 100) : null;
  const total = cIva !== null && cRet !== null ? r2(base + cIva - cRet) : null;
  return { base, iva, ret, cIva, cRet, total, mencion };
}

function pintarTabla() {
  const t = $("tabla"), tx = T[lang];
  t.textContent = "";
  const fila = (a, b, cls) => { const tr = t.insertRow(); if (cls) tr.className = cls; tr.insertCell().textContent = a; tr.insertCell().textContent = b; };
  lineas.forEach(l => fila(l.marca, eur(l.importe)));
  const x = totales();
  fila(tx.base, eur(x.base));
  fila(tx.ivaL + (Number.isFinite(x.iva) ? " " + pct(x.iva) : ""), x.cIva === null ? "—" : eur(x.cIva));
  if (x.cRet === null || x.cRet > 0) fila(tx.retL + (Number.isFinite(x.ret) ? " " + pct(x.ret) : ""), x.cRet === null ? "—" : "-" + eur(x.cRet));
  fila(tx.total, x.total === null ? "—" : eur(x.total), "total");
}

function ponerIdioma(l) {
  lang = l;
  document.documentElement.lang = l;
  document.title = T[l].titulo;
  document.querySelectorAll("[data-t]").forEach(el => el.textContent = T[l][el.dataset.t]);
  document.querySelectorAll(".idioma").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === l)));
  // Al cambiar de idioma, los campos de impuestos vuelven a los valores por defecto de ese idioma.
  rellenarImpuestos();
  $("msg").textContent = "";
  if (lineas) pintarTabla();
}

function rellenarImpuestos() {
  const d = DEFECTO[lang];
  $("iva").value = d.iva; $("ret").value = d.ret; $("mencion").value = d.mencion;
}

// ---------- PDF ----------
async function generarPDF(v, x) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const p = T[lang].pdf;
  const doc = await PDFDocument.create();
  doc.setTitle(p.factura + " " + v.numero);
  doc.setProducer("Stimada"); doc.setCreator("Stimada");
  const page = doc.addPage([595.28, 841.89]);
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const fb = await doc.embedFont(StandardFonts.HelveticaBold);
  const negro = rgb(0.11, 0.11, 0.14), gris = rgb(0.42, 0.41, 0.47);

  // Caracteres que la fuente estándar no admite se aproximan.
  const seguro = (s, font) => [...String(s)].map(ch => {
    try { font.widthOfTextAtSize(ch, 10); return ch; }
    catch { const b = mapa[ch] || ch.normalize("NFD")[0]; try { font.widthOfTextAtSize(b, 10); return b; } catch { return "?"; } }
  }).join("");
  const partir = (s, font, size, ancho) => {
    const out = [];
    String(s).split("\n").forEach(par => {
      let linea = "";
      par.split(/\s+/).forEach(w => {
        const prueba = linea ? linea + " " + w : w;
        if (font.widthOfTextAtSize(prueba, size) <= ancho) linea = prueba;
        else { if (linea) out.push(linea); linea = w; }
      });
      out.push(linea);
    });
    return out;
  };
  const txt = (s, xx, y, o = {}) => {
    const font = o.bold ? fb : f, size = o.size || 10;
    const t = seguro(s, font);
    const w = font.widthOfTextAtSize(t, size);
    page.drawText(t, { x: o.right ? xx - w : xx, y, size, font, color: o.color || negro });
  };
  const L = 50, R = 545;
  let y = 790;

  txt(p.factura, L, y, { bold: true, size: 22 });
  txt(p.num + " " + v.numero, R, y + 8, { right: true });
  txt(p.fecha + ": " + v.fechaTxt, R, y - 6, { right: true });
  y -= 50;

  txt(p.emisor, L, y, { bold: true }); txt(p.dest, 310, y, { bold: true });
  const emisor = [v.nombre, p.nif + " " + v.nif, ...partir(seguro(v.direccion, f), f, 10, 235)];
  if (v.email) emisor.push(v.email);
  const dest = [STIMADA.nombre, p.nif + " " + (lang === "en" ? "ES" : "") + STIMADA.nif, ...STIMADA.dir, STIMADA.pais[lang]];
  emisor.forEach((l, i) => txt(l, L, y - 15 - i * 13));
  dest.forEach((l, i) => txt(l, 310, y - 15 - i * 13));
  y -= 30 + Math.max(emisor.length, dest.length) * 13;

  // Una sola línea con el total, sin detallar marcas ni proyectos.
  txt(p.concepto, L, y, { bold: true }); txt(p.importe, R, y, { bold: true, right: true });
  page.drawLine({ start: { x: L, y: y - 5 }, end: { x: R, y: y - 5 }, thickness: 0.6, color: gris });
  y -= 20;
  txt(p.servicio, L, y); txt(eur(x.base), R, y, { right: true });
  y -= 30;

  page.drawLine({ start: { x: 310, y: y + 14 }, end: { x: R, y: y + 14 }, thickness: 0.6, color: gris });
  const fila = (a, b, bold) => { txt(a, 310, y, { bold }); txt(b, R, y, { right: true, bold }); y -= 16; };
  fila(p.base, eur(x.base));
  fila(p.iva + " " + pct(x.iva), eur(x.cIva));
  if (x.ret > 0) fila(p.ret + " " + pct(x.ret), "-" + eur(x.cRet));
  fila(p.total, eur(x.total), true);

  y -= 14;
  if (x.mencion) { partir(seguro(x.mencion, f), f, 10, R - L).forEach(t => { txt(t, L, y); y -= 13; }); y -= 6; }
  partir(seguro(p.pago + " " + v.pago, f), f, 10, R - L).forEach(t => { txt(t, L, y, { color: gris }); y -= 13; });

  return await doc.save();
}

function descargar(bytes, nombre) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const fechaTxt = s => {
  const [a, m, d] = s.split("-");
  return lang === "es" ? `${d}/${m}/${a}` : new Date(+a, m - 1, +d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

$("form").addEventListener("submit", async ev => {
  ev.preventDefault();
  const tx = T[lang], msg = $("msg");
  const error = t => { msg.className = "msg err"; msg.textContent = t; };
  const v = {};
  ["nombre", "nif", "email", "direccion", "numero", "fecha", "pago"].forEach(id => v[id] = $(id).value.trim());
  v.nif = v.nif.replace(/[\s.\-]/g, "").toUpperCase();
  if (["nombre", "nif", "direccion", "numero", "fecha", "pago"].some(id => !v[id])) return error(tx.errCampos);
  const x = totales();
  if (!Number.isFinite(x.iva) || !Number.isFinite(x.ret)) return error(tx.errPct);
  if (x.iva === 0 && !x.mencion) return error(tx.errMencion);
  v.fechaTxt = fechaTxt(v.fecha);
  msg.className = "msg"; msg.textContent = tx.generando;
  try {
    const bytes = await generarPDF(v, x);
    const limpio = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[ŁłØøßĐđÆæ]/g, c => mapa[c]).replace(/[^A-Za-z0-9 _-]+/g, "").trim() || "x";
    descargar(bytes, `${tx.pdf.archivo} ${limpio(v.numero)} ${limpio(v.nombre)} - Stimada.pdf`);
    msg.className = "msg ok"; msg.textContent = tx.ok;
  } catch (e) {
    console.error(e);
    error(tx.errPdf);
  }
});

$("otro").addEventListener("change", () => { $("impuestos").hidden = !$("otro").checked; rellenarImpuestos(); pintarTabla(); });
["iva", "ret", "mencion"].forEach(id => $(id).addEventListener("input", pintarTabla));
document.querySelectorAll(".idioma").forEach(b => b.addEventListener("click", () => ponerIdioma(b.dataset.lang)));

function cargar() {
  const d = leerEnlace();
  lineas = d && d.lineas;
  $("sinDatos").hidden = !!lineas;
  $("resumen").hidden = $("form").hidden = !lineas;
  if (!$("fecha").value) $("fecha").value = new Date().toISOString().slice(0, 10);
  ponerIdioma(d ? d.idioma : (navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en");
}
window.addEventListener("hashchange", cargar);
cargar();
