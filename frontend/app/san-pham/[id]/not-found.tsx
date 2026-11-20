import { NotFound } from "@/components/not-found";

export default function ProductNotFound() {
  return (
    <NotFound
      title="Không tìm thấy sản phẩm"
      lead="Sản phẩm này có thể đã ngừng bán hoặc đường dẫn không đúng. Thử tìm lại theo tên, hoặc chọn một danh mục bên dưới."
    />
  );
}
