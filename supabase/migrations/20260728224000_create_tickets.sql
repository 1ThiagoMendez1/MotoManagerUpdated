CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, 
    customer_id UUID,          
    created_by UUID,           
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Abierto',
    priority TEXT NOT NULL DEFAULT 'Media',
    assigned_to UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    message JSONB NOT NULL,
    sender_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS handle_updated_at_tickets ON public.tickets;
CREATE TRIGGER handle_updated_at_tickets
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Basic Policies (can be refined later)
CREATE POLICY "Allow all to read tickets" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "Allow all to insert tickets" ON public.tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all to update tickets" ON public.tickets FOR UPDATE USING (true);

CREATE POLICY "Allow all to read ticket messages" ON public.ticket_messages FOR SELECT USING (true);
CREATE POLICY "Allow all to insert ticket messages" ON public.ticket_messages FOR INSERT WITH CHECK (true);
