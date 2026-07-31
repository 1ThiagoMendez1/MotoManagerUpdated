import { NewTicketForm } from './NewTicketForm';

export default async function NewTicketPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  
  return (
    <div className="container mx-auto p-4 md:p-8">
      <NewTicketForm tenantSlug={tenant} />
    </div>
  );
}
