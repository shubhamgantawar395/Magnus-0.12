import { redirect } from "next/navigation";

export default function OrganizationDetailsPage({ params }: { params: { id: string } }) {
    redirect(`/dashboard/platform/organizations/${params.id}`);
}
