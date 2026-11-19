import { EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-shell px-5 py-16 lg:px-10">
      <EmptyState
        title="Không tìm thấy sản phẩm"
        text="Sản phẩm có thể đã bị xoá hoặc đường dẫn không đúng."
        href="/san-pham"
        cta="Xem sản phẩm"
      />
    </div>
  );
}
