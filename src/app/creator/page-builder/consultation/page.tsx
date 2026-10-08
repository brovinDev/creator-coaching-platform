import { UserRound } from "lucide-react";

export default function ConsultationPagesPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">1:1 Consultation pages</h1>
      <div className="mt-8 rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
        <UserRound className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-3 font-semibold text-gray-900">Coming soon</p>
        <p className="mt-1 text-sm text-gray-500">Booking pages for 1:1 consultations will be added here.</p>
      </div>
    </div>
  );
}
