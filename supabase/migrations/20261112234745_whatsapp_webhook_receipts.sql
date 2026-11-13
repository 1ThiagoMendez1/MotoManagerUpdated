-- Private, encrypted inbox for authenticated Meta deliveries. It does not send
-- messages or enable workshop signup; those workflows remain independently gated.
CREATE SCHEMA IF NOT EXISTS motomanager_private;

CREATE TABLE motomanager_private.whatsapp_webhook_receipts (
  app_id text NOT NULL CHECK (app_id ~ '^[0-9]{5,30}$'),
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
  payload_ciphertext text NOT NULL CHECK (
    payload_ciphertext ~ '^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]+$'
    AND octet_length(payload_ciphertext) <= 7000000
  ),
  payload_bytes integer NOT NULL CHECK (payload_bytes BETWEEN 1 AND 5242880),
  received_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  PRIMARY KEY (app_id, payload_sha256)
);
CREATE INDEX whatsapp_webhook_receipts_expiry_idx
  ON motomanager_private.whatsapp_webhook_receipts(expires_at);
ALTER TABLE motomanager_private.whatsapp_webhook_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON motomanager_private.whatsapp_webhook_receipts FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA motomanager_private TO service_role;
GRANT SELECT, INSERT, DELETE ON motomanager_private.whatsapp_webhook_receipts TO service_role;

CREATE FUNCTION public.record_whatsapp_webhook_receipt(
  p_app_id text, p_payload_sha256 text, p_payload_ciphertext text, p_payload_bytes integer
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  DELETE FROM motomanager_private.whatsapp_webhook_receipts WHERE expires_at <= now();
  INSERT INTO motomanager_private.whatsapp_webhook_receipts
    (app_id, payload_sha256, payload_ciphertext, payload_bytes)
    VALUES (p_app_id, p_payload_sha256, p_payload_ciphertext, p_payload_bytes)
    ON CONFLICT (app_id, payload_sha256) DO NOTHING;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.record_whatsapp_webhook_receipt(text, text, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_whatsapp_webhook_receipt(text, text, text, integer)
  TO service_role;
