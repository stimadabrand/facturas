# Facturas para creadoras · Stimada

Web estática (GitHub Pages) donde cada creadora genera la factura de lo que Stimada le debe.

## Cómo funciona

- **El enlace** solo lleva lo pendiente de pago: conceptos e importes, en el fragmento (`#…`) de la URL. El navegador no envía el fragmento al servidor.
- **La creadora** rellena sus datos (nombre, NIF, dirección, número y fecha de factura, datos de pago), el IVA, la retención y, si hace falta, una mención fiscal. Stimada no pone ningún valor por defecto.
- **El PDF** se genera en su navegador con `vendor/pdf-lib.min.js` (MIT, incluida en el repositorio). Nada se guarda ni se envía: la página tiene una política de seguridad (CSP) que le impide conectarse a cualquier sitio o enviar formularios, y no carga nada de fuera (sin fuentes externas ni analítica).
- **Los datos de Stimada** (razón social, NIF y dirección fiscal, que son públicos) están en `app.js`.

## Formato del enlace

```
https://stimadabrand.github.io/facturas/#<base64url de {"l":[["concepto", importe], ...]}>
```

Ejemplo en Node:

```js
const l = [["PLESH · octubre 2026", 50], ["The Style Outlets · noviembre 2026", 80]];
const url = "https://stimadabrand.github.io/facturas/#" + Buffer.from(JSON.stringify({ l })).toString("base64url");
```

Importes en euros, sin IVA. Nunca se meten en el enlace ni en este repositorio datos personales de las creadoras (nombre, DNI, dirección ni IBAN).
