-- Códigos WhatsApp del QR, aislados de los OTP existentes del portal móvil.
-- Aplicar con respaldo y antes de desplegar el nuevo formulario QR.
CREATE TABLE IF NOT EXISTS public.workshop_qr_otp_challenges (
  phone text NOT NULL CHECK (phone ~ '^57[0-9]{10}$'),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9-]{1,150}$'),
  code_hash text NOT NULL CHECK (code_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  resend_after timestamptz NOT NULL,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  consumed_at timestamptz,
  window_start timestamptz NOT NULL DEFAULT now(),
  send_count smallint NOT NULL DEFAULT 0 CHECK (send_count BETWEEN 0 AND 5),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (phone, slug)
);
ALTER TABLE public.workshop_qr_otp_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workshop_qr_otp_challenges FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.workshop_qr_otp_challenges TO service_role;

-- Reserva atómica: espera de 60 segundos y máximo cinco intentos de envío
-- por teléfono/taller en una ventana de 24 horas.
CREATE OR REPLACE FUNCTION public.issue_workshop_qr_otp(
  p_phone text, p_slug text, p_code_hash text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE old public.workshop_qr_otp_challenges%ROWTYPE;
  fresh_window boolean;
BEGIN
  IF p_phone IS NULL OR p_phone !~ '^57[0-9]{10}$'
     OR p_slug IS NULL OR p_slug !~ '^[a-z0-9-]{1,150}$'
     OR p_code_hash IS NULL OR p_code_hash !~ '^[a-f0-9]{64}$' THEN
    RETURN false;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('qr-otp:' || p_phone || ':' || p_slug, 0));
  SELECT * INTO old FROM public.workshop_qr_otp_challenges
    WHERE phone = p_phone AND slug = p_slug FOR UPDATE;
  IF FOUND AND (old.resend_after > now()
      OR (old.window_start > now() - interval '24 hours' AND old.send_count >= 5)) THEN
    RETURN false;
  END IF;
  fresh_window := NOT FOUND OR old.window_start <= now() - interval '24 hours';
  INSERT INTO public.workshop_qr_otp_challenges (
    phone, slug, code_hash, expires_at, resend_after, attempts,
    consumed_at, window_start, send_count, updated_at
  ) VALUES (p_phone, p_slug, p_code_hash, now()+interval '5 minutes',
    now()+interval '60 seconds', 0, NULL, now(), 1, now())
  ON CONFLICT (phone, slug) DO UPDATE
    SET code_hash = excluded.code_hash,
        expires_at = excluded.expires_at, resend_after = excluded.resend_after,
        attempts = 0, consumed_at = NULL,
        window_start = CASE WHEN fresh_window THEN now()
                            ELSE public.workshop_qr_otp_challenges.window_start END,
        send_count = CASE WHEN fresh_window THEN 1
                          ELSE public.workshop_qr_otp_challenges.send_count + 1 END,
        updated_at = now();
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.issue_workshop_qr_otp(text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_workshop_qr_otp(text,text,text) TO service_role;

-- Máximo 5 códigos incorrectos y consumo único, protegido por bloqueo de fila.
CREATE OR REPLACE FUNCTION public.consume_workshop_qr_otp(
  p_phone text, p_slug text, p_code_hash text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE challenge public.workshop_qr_otp_challenges%ROWTYPE;
BEGIN
  IF p_phone IS NULL OR p_phone !~ '^57[0-9]{10}$'
     OR p_slug IS NULL OR p_slug !~ '^[a-z0-9-]{1,150}$'
     OR p_code_hash IS NULL OR p_code_hash !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
  SELECT * INTO challenge FROM public.workshop_qr_otp_challenges
    WHERE phone=p_phone AND slug=p_slug FOR UPDATE;
  IF NOT FOUND OR challenge.consumed_at IS NOT NULL
     OR challenge.expires_at <= now() OR challenge.attempts >= 5 THEN RETURN false; END IF;
  UPDATE public.workshop_qr_otp_challenges
    SET attempts=attempts+1, updated_at=now()
    WHERE phone=p_phone AND slug=p_slug;
  IF challenge.code_hash <> p_code_hash THEN RETURN false; END IF;
  UPDATE public.workshop_qr_otp_challenges
    SET consumed_at=now(), updated_at=now() WHERE phone=p_phone AND slug=p_slug;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.consume_workshop_qr_otp(text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_workshop_qr_otp(text,text,text) TO service_role;

-- Una cuenta del dominio interno solo se puede encontrar por teléfono exacto;
-- no se exponen listas ni datos de usuarios a clientes anónimos.
CREATE OR REPLACE FUNCTION public.find_workshop_qr_phone_account(p_phone text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT id FROM auth.users
   WHERE p_phone ~ '^57[0-9]{10}$'
     AND lower(email) = p_phone || '@clientes.motomanager.com.co'
     AND email_confirmed_at IS NOT NULL
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.find_workshop_qr_phone_account(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_workshop_qr_phone_account(text) TO service_role;
