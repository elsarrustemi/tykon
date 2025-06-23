"use client";

import { useRouter } from "next/navigation";
import { PageContainer } from "~/components/layout/PageContainer";
import { PracticeGame } from "~/components/game/PracticeGame";

export default function PracticePage() {
  const router = useRouter();

  const handleBack = () => {
    router.push("/");
  };

  return (
    <PageContainer showFooter={false}>
      <PracticeGame onBack={handleBack} />
    </PageContainer>
  );
} 