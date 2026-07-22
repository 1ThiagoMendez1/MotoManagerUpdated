-- Enable Realtime for the work_orders table
-- This is necessary for the Quote Status Widget to listen to updates when a customer approves or rejects a quote.
ALTER PUBLICATION supabase_realtime ADD TABLE work_orders;
