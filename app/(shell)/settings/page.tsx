import PageHeader from "@/components/PageHeader";
import PasscodeForm from "./PasscodeForm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Change passcode"
        description="Update the passcode you use to sign in."
      />
      <PasscodeForm />
    </div>
  );
}
