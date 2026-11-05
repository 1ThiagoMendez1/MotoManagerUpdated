-- Desafíos OTP móviles: no almacenar códigos en Auth user_metadata.
-- Requiere MOBILE_OTP_PEPPER aleatoria en el servidor web.
CREATE TABLE IF NOT EXISTS public.mobile_otp_challenges (
  phone text PRIMARY KEY CHECK (phone ~ '^57[0-9]{10}$'),
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL CHECK (code_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  resend_after timestamptz NOT NULL,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  consumed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mobile_otp_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mobile_otp_challenges FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.mobile_otp_challenges TO service_role;
-- La tabla no tiene políticas de acceso para clientes.

CREATE OR REPLACE FUNCTION public.issue_mobile_otp(
  p_phone text, p_auth_user uuid, p_code_hash text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_phone IS NULL OR p_phone !~ '^57[0-9]{10}$' OR
     p_code_hash IS NULL OR p_code_hash !~ '^[a-f0-9]{64}$' OR
     p_auth_user IS NULL THEN
    RAISE EXCEPTION 'Invalid challenge' USING ERRCODE='22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('mobile-otp:' || p_phone, 0));
  IF EXISTS (SELECT 1 FROM public.mobile_otp_challenges
     WHERE phone=p_phone AND resend_after>now()) THEN RETURN false; END IF;
  INSERT INTO public.mobile_otp_challenges
    (phone, auth_user_id, code_hash, expires_at, resend_after, attempts, consumed_at, updated_at)
  VALUES (p_phone,p_auth_user,p_code_hash,now()+interval '5 minutes',
          now()+interval '1 minute',0,NULL,now())
  ON CONFLICT (phone) DO UPDATE
    SET auth_user_id=excluded.auth_user_id, code_hash=excluded.code_hash,
        expires_at=excluded.expires_at, resend_after=excluded.resend_after,
        attempts=0, consumed_at=NULL, updated_at=now();
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.issue_mobile_otp(text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.issue_mobile_otp(text,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.consume_mobile_otp(
  p_phone text, p_code_hash text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE challenge public.mobile_otp_challenges%ROWTYPE;
BEGIN
  IF p_phone IS NULL OR p_phone !~ '^57[0-9]{10}$' OR
     p_code_hash IS NULL OR p_code_hash !~ '^[a-f0-9]{64}$' THEN
    RETURN NULL;
  END IF;
  SELECT * INTO challenge FROM public.mobile_otp_challenges
    WHERE phone=p_phone FOR UPDATE;
  IF NOT FOUND OR challenge.consumed_at IS NOT NULL OR
     challenge.expires_at <= now() OR challenge.attempts >= 5 THEN RETURN NULL; END IF;
  UPDATE public.mobile_otp_challenges
    SET attempts=attempts+1, updated_at=now()
    WHERE phone=p_phone;
  IF challenge.code_hash <> p_code_hash THEN RETURN NULL; END IF;
  UPDATE public.mobile_otp_challenges
    SET consumed_at=now(), updated_at=now() WHERE phone=p_phone;
  RETURN challenge.auth_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_mobile_otp(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_mobile_otp(text,text) TO service_role;
