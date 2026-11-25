// Web de facturas para creadoras de Stimada.
// El enlace solo lleva lo pendiente de pago (conceptos e importes) en el fragmento (#), que el navegador
// no envía al servidor. Los datos de la creadora no salen de su navegador: el PDF se genera aquí.
"use strict";

const STIMADA = ["Stimada Brand SL", "NIF B75764324", "C/ María Tubau 15C 5º 3ª", "28050 Madrid (España)"];

const $ = id => document.getElementById(id);
const r2 = n => Math.round(n * 100) / 100;
const eur = n => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const pct = n => n.toLocaleString("es-ES", { maximumFractionDigits: 2 }) + " %";

let lineas = null;
// Letras que no se descomponen solas (para la fuente del PDF y el nombre del archivo).
const mapa = { "Ł": "L", "ł": "l", "Ø": "O", "ø": "o", "ß": "ss", "Đ": "D", "đ": "d", "Æ": "AE", "æ": "ae" };

// Formato del enlace: #<base64url de {"l":[["concepto", importe], ...]}>
function leerEnlace() {
  try {
    const h = location.hash.slice(1);
    if (!h) return null;
    const b64 = h.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((h.length + 3) % 4);
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const d = JSON.parse(new TextDecoder().decode(bytes));
    if (!Array.isArray(d.l) || !d.l.length) return null;
    const ls = d.l.map(([c, i]) => ({ concepto: String(c).slice(0, 200), importe: r2(Number(i)) }));
    return ls.every(l => l.concepto && Number.isFinite(l.importe) && l.importe > 0) ? ls : null;
  } catch { return null; }
}

function leerPct(id) {
  const t = $(id).value.trim().replace(",", ".").replace("%", "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : NaN;
}

function totales() {
  const base = r2(lineas.reduce((s, l) => s + l.importe, 0));
  const iva = leerPct("iva"), ret = leerPct("ret");
  const cIva = Number.isFinite(iva) ? r2(base * iva / 100) : null;
  const cRet = Number.isFinite(ret) ? r2(base * ret / 100) : null;
  const total = cIva !== null && cRet !== null ? r2(base + cIva - cRet) : null;
  return { base, iva, ret, cIva, cRet, total };
}

function pintarTabla() {
  const t = $("tabla");
  t.textContent = "";
  const fila = (a, b, cls) => { const tr = t.insertRow(); if (cls) tr.className = cls; tr.insertCell().textContent = a; tr.insertCell().textContent = b; };
  lineas.forEach(l => fila(l.concepto, eur(l.importe)));
  const x = totales();
  fila("Base imponible", eur(x.base));
  fila("IVA" + (Number.isFinite(x.iva) ? " " + pct(x.iva) : ""), x.cIva === null ? "—" : eur(x.cIva));
  fila("Retención IRPF" + (Number.isFinite(x.ret) ? " " + pct(x.ret) : ""), x.cRet === null ? "—" : (x.cRet ? "-" : "") + eur(x.cRet));
  fila("Total a cobrar", x.total === null ? "—" : eur(x.total), "total");
}

// ---------- PDF ----------
async function generarPDF(v) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const doc = await PDFDocument.create();
  doc.setTitle("Factura " + v.numero);
  doc.setProducer("Stimada · web de facturas");
  doc.setCreator("Stimada · web de facturas");
  const page = doc.addPage([595.28, 841.89]);
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const fb = await doc.embedFont(StandardFonts.HelveticaBold);
  const negro = rgb(0.11, 0.11, 0.14), gris = rgb(0.42, 0.41, 0.47);

  // Caracteres que la fuente estándar no admite se aproximan (p. ej. letras con signos poco comunes).
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
  const txt = (s, x, y, o = {}) => {
    const font = o.bold ? fb : f, size = o.size || 10;
    const t = seguro(s, font);
    const w = font.widthOfTextAtSize(t, size);
    page.drawText(t, { x: o.right ? x - w : x, y, size, font, color: o.color || negro });
  };
  const L = 50, R = 545;
  let y = 790;

  txt("FACTURA", L, y, { bold: true, size: 22 });
  txt("Nº " + v.numero, R, y + 8, { right: true });
  txt("Fecha de expedición: " + v.fechaTxt, R, y - 6, { right: true });
  if (v.fechaOpTxt) txt("Fecha de la operación: " + v.fechaOpTxt, R, y - 20, { right: true });
  y -= 50;

  txt("Emisor", L, y, { bold: true }); txt("Destinatario", 310, y, { bold: true });
  const emisor = [v.nombre, "NIF " + v.nif, ...partir(seguro(v.direccion, f), f, 10, 235)];
  if (v.email) emisor.push(v.email);
  emisor.forEach((l, i) => txt(l, L, y - 15 - i * 13));
  STIMADA.forEach((l, i) => txt(l, 310, y - 15 - i * 13));
  y -= 30 + Math.max(emisor.length, STIMADA.length) * 13;

  txt("Concepto", L, y, { bold: true }); txt("Importe", R, y, { bold: true, right: true });
  page.drawLine({ start: { x: L, y: y - 5 }, end: { x: R, y: y - 5 }, thickness: 0.6, color: gris });
  y -= 20;
  lineas.forEach(l => {
    const ls = partir(seguro("Servicio de creación de contenido: " + l.concepto, f), f, 10, 400);
    ls.forEach((t, i) => txt(t, L, y - i * 13));
    txt(eur(l.importe), R, y, { right: true });
    y -= ls.length * 13 + 6;
  });

  y -= 12;
  page.drawLine({ start: { x: 310, y: y + 14 }, end: { x: R, y: y + 14 }, thickness: 0.6, color: gris });
  const x = v.tot;
  const fila = (a, b, bold) => { txt(a, 310, y, { bold }); txt(b, R, y, { right: true, bold }); y -= 16; };
  fila("Base imponible", eur(x.base));
  fila("IVA " + pct(x.iva), eur(x.cIva));
  if (x.ret > 0) fila("Retención IRPF " + pct(x.ret), "-" + eur(x.cRet));
  fila("TOTAL", eur(x.total), true);

  y -= 14;
  if (v.mencion) {
    partir(seguro(v.mencion, f), f, 10, R - L).forEach(t => { txt(t, L, y); y -= 13; });
    y -= 6;
  }
  partir(seguro("Forma de pago: transferencia. " + v.pago, f), f, 10, R - L).forEach(t => { txt(t, L, y, { color: gris }); y -= 13; });

  return await doc.save();
}

function descargar(bytes, nombre) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const fechaES = s => s ? s.split("-").reverse().join("/") : "";

$("form").addEventListener("submit", async ev => {
  ev.preventDefault();
  const msg = $("msg");
  const error = t => { msg.className = "msg err"; msg.textContent = t; };
  const v = {};
  ["nombre", "nif", "email", "direccion", "numero", "fecha", "pago", "mencion", "fechaOp"].forEach(id => v[id] = $(id).value.trim());
  v.fechaOpTxt = v.fechaOp;
  if (["nombre", "nif", "direccion", "numero", "fecha", "pago"].some(id => !v[id])) return error("Rellena todos los campos (el email y la mención son opcionales).");
  const x = totales();
  if (x.iva === null || x.ret === null) return error("Indica el IVA y la retención que aplicas (pon 0 si no aplicas alguno).");
  if (Number.isNaN(x.iva) || Number.isNaN(x.ret)) return error("El IVA y la retención tienen que ser un número entre 0 y 100.");
  if (x.iva === 0 && !v.mencion) return error("Si no aplicas IVA, escribe en la mención fiscal el motivo.");
  v.tot = x; v.fechaTxt = fechaES(v.fecha);
  msg.className = "msg"; msg.textContent = "Generando…";
  try {
    const bytes = await generarPDF(v);
    const limpio = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[ŁłØøßĐđÆæ]/g, c => mapa[c]).replace(/[^A-Za-z0-9 _-]+/g, "").trim() || "factura";
    descargar(bytes, `Factura ${limpio(v.numero)} ${limpio(v.nombre)} - Stimada.pdf`);
    msg.className = "msg ok"; msg.textContent = "Factura descargada. Ahora respóndenos al correo con el PDF adjunto.";
  } catch (e) {
    console.error(e);
    error("No se ha podido generar la factura. Inténtalo otra vez.");
  }
});

["iva", "ret"].forEach(id => $(id).addEventListener("input", pintarTabla));

function cargar() {
  lineas = leerEnlace();
  $("sinDatos").hidden = !!lineas;
  $("resumen").hidden = $("form").hidden = !lineas;
  if (!lineas) return;
  if (!$("fecha").value) $("fecha").value = new Date().toISOString().slice(0, 10);
  pintarTabla();
}
window.addEventListener("hashchange", cargar);
cargar();
