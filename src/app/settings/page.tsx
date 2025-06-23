"use client";

import { useRouter } from "next/navigation";
import { PageContainer } from "~/components/layout/PageContainer";
import { SettingsForm } from "~/components/settings/SettingsForm";

export default function SettingsPage() {
  const router = useRouter();

  const handleBack = () => {
    router.push("/");
  };

  return (
    <PageContainer>
      <div className="flex justify-center items-center min-h-[80vh] py-10">
        <SettingsForm onBack={handleBack} />
      </div>
    </PageContainer>
  );
} 