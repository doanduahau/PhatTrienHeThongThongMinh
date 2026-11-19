import { NotFound } from "@/components/not-found";

export default function NotFoundPage() {
  return (
    <NotFound
      title="Ối! Trang này không tồn tại"
      lead="Chắc tại lỗi kỹ thuật, không phải tại bạn đâu. Bạn có thể về trang chủ, xem danh mục hoặc tìm sản phẩm mình cần."
    />
  );
}
