import { EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-shell px-5 py-16 lg:px-10">
      <EmptyState
        title="Không tìm thấy trang"
        text="Đường dẫn không tồn tại hoặc đã được chuyển đi."
        href="/"
        cta="Về trang chủ"
      />
    </div>
  );
}
