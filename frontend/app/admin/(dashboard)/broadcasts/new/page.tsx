import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { CreateBroadcastForm } from "@/modules/broadcasts/components/create-broadcast-form";
import { BroadcastsGate } from "@/modules/broadcasts/components/broadcasts-gate";

export const metadata: Metadata = {
  title: "New broadcast",
  robots: { index: false, follow: false },
};

export default function NewBroadcastPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New broadcast"
        description="This saves a draft. Nothing reaches anyone until you start it."
      />
      <BroadcastsGate>
        <CreateBroadcastForm />
      </BroadcastsGate>
    </div>
  );
}
