import type { PaymentStatus } from "@/lib/store";

const labels: Record<PaymentStatus, string> = { paid: "Paid", pending: "Pending", late: "Late" };
const styles: Record<PaymentStatus, string> = {
  paid: "status-paid",
  pending: "status-pending",
  late: "status-late",
};

export default function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
