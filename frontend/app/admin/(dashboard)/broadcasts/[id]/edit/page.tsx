import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { EditBroadcastForm } from "@/modules/broadcasts/components/edit-broadcast-form";
import { BroadcastsGate } from "@/modules/broadcasts/components/broadcasts-gate";
import { findBroadcast } from "@/modules/broadcasts/lib/get-broadcasts";
import { isBroadcastEditable } from "@/types/broadcast";

export const metadata: Metadata = {
  title: "Edit broadcast",
  robots: { index: false, follow: false },
};

async function Editor({ id }: { id: string }) {
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) notFound();

  const broadcast = await findBroadcast(numeric);
  // Also 404 for a started one: it is immutable history, and the API would
  // answer 400 invalid_status anyway. Reaching an edit form that cannot save
  // is worse than not reaching it.
  if (!broadcast || !isBroadcastEditable(broadcast)) notFound();

  return <EditBroadcastForm broadcast={broadcast} />;
}

export default async function EditBroadcastPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit broadcast"
        description="Drafts only. Saving does not send."
      />
      <BroadcastsGate>
        <Editor id={id} />
      </BroadcastsGate>
    </div>
  );
}
