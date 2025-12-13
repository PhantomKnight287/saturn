export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  return <div >
    {organization}
  </div>;
}
