# Meta template `diagnosticado_reparado_horarios` — actual screenshot mapping

Actual Meta WhatsApp Manager screenshot, 2026-10-24:
- **Template name:** `diagnosticado_reparado_horarios`
- **Language label:** `Spanish`, generic locale `es` (NOT `es_CO`)
- **Category shown:** `Marketing` (transactional notifications should be reviewed for Utility separately, without silently changing a currently approved template).
- **Header:** `¡Hola, {{1}}!`
- **Body:** **seven** placeholders, `{{1}}..{{7}}`, meaning separate variables from the header:
  1. Workshop name
  2. Motorcycle model/info
  3. Plate
  4. Order number
  5. Workshop address
  6. Workshop-specific business hours, whitespace sanitized
  7. Workshop name
- Footer: static `Motomanager - CRM`.
- The examples `Águilas Doradas`, `Juan`, `Gixxer 150` are just sample values in Meta, **not** server constants.

Cloud API message must include separate components:
```json
{
  "template": {
    "name": "diagnosticado_reparado_horarios",
    "language": { "code": "es" },
    "components": [
      { "type": "header", "parameters": [{ "type": "text", "text": "<verified client name>" }] },
      { "type": "body", "parameters": [
        { "type": "text", "text": "<workshop>" },
        { "type": "text", "text": "<motorcycle>" },
        { "type": "text", "text": "<plate>" },
        { "type": "text", "text": "<order number>" },
        { "type": "text", "text": "<address>" },
        { "type": "text", "text": "<workshop hours>" },
        { "type": "text", "text": "<workshop>" }
      ] }
    ]
  }
}
```

Code defaults to `es`; if Meta has an approved regional variant, use `WHATSAPP_READY_TEMPLATE_LANGUAGE=es_CO`. This override affects only the ready-for-pickup template.

**Important:** Meta error 132001 means template not found in requested locale, or not approved / wrong WABA; the header/body mismatch is a separate bug likely to cause 132000 AFTER 132001 is fixed. Screenshot shows an editor with "Submit for review", not definitive proof of the template's current approval. Confirm `APPROVED` status and phone-number ownership in WhatsApp Manager.

Do NOT run real send tests without permission and a controlled destination. Check server logs for Meta status codes without logging customer details or access tokens.
