"use client";

import { useEffect } from "react";
import { Button, EmptyState } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-shell px-5 py-16 lg:px-10">
      <EmptyState
        title="Không tải được trang này"
        text="Có lỗi khi lấy dữ liệu từ máy chủ. Kiểm tra backend đang chạy rồi thử lại."
        href="/"
        cta="Về trang chủ"
      />
      <div className="mt-4 text-center">
        <Button onClick={reset}>Thử lại</Button>
      </div>
    </div>
  );
}
