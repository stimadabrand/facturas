# Facturas para creadoras · Stimada

Web estática (GitHub Pages) donde cada creadora genera la factura de lo que Stimada le debe.

## Cómo funciona

- **El enlace** solo lleva lo pendiente de pago: marca e importe de cada proyecto (y el idioma, opcional), en el fragmento (`#…`) de la URL. El navegador no envía el fragmento al servidor.
- **La creadora** rellena sus datos (nombre, NIF, dirección, número y fecha de factura, datos de pago). Impuestos por defecto: en español, IVA 21 % sin retención; en inglés, IVA 0 % («No Spanish VAT, reverse charge») y retención del 24 % de no residentes (IRNR). Si su caso es otro, marca la casilla y pone su IVA, su retención y su mención.
- **Idioma:** botón ES / EN en la web. El enlace puede abrirse ya en inglés con `"i":"en"`.
- **La factura** lleva una sola línea («Servicio de creación de contenido» / «Content creation services») con el total; las marcas solo se ven en la web.
- **El PDF** se genera en su navegador con `vendor/pdf-lib.min.js` (MIT, incluida en el repositorio). Nada se guarda ni se envía: la página tiene una política de seguridad (CSP) que le impide conectarse a cualquier sitio o enviar formularios, y no carga nada de fuera (sin fuentes externas ni analítica).
- **Los datos de Stimada** (razón social, NIF y dirección fiscal, que son públicos) están en `app.js`.

## Formato del enlace

```
https://stimadabrand.github.io/facturas/#<base64url de {"l":[["marca", importe], ...], "i":"en"}>
```

Ejemplo en Node:

```js
const l = [["PLESH", 50], ["The Style Outlets", 80]];
const url = "https://stimadabrand.github.io/facturas/#" + Buffer.from(JSON.stringify({ l })).toString("base64url");
```

Importes en euros, sin IVA. Nunca se meten en el enlace ni en este repositorio datos personales de las creadoras (nombre, DNI, dirección ni IBAN).
