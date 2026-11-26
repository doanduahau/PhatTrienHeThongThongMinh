import Link from "next/link";
import Image from "next/image";
import type { Category, Product } from "@/lib/types";
import { resolveImage, money } from "@/lib/format";
import { CategoryArt } from "./category-art";
import { Container } from "./ui";

export const CATEGORY_HERO_INFO: Record<
  string,
  {
    title: string;
    headline: string;
    desc1: string;
    desc2: string;
    highlight: string;
  }
> = {
  chuot: {
    title: "Chuột Gaming",
    headline: "Chuột Gaming — Nhẹ, Chuẩn Form, Aim Tốt",
    desc1:
      "Chuột gaming hợp tay là nửa trận thắng. Form đúng thì flick gọn, tracking mượt, cầm cả buổi vẫn nhẹ nhàng. Sensor cao cấp đến đâu cũng phải đứng sau cảm giác cầm.",
    desc2:
      "Gear Shop mang về chuột gaming chính hãng từ Pulsar, Razer, Logitech, WLmouse và Lamzu. Có mẫu siêu nhẹ, form đối xứng lẫn công thái học, tần số quét 8K. Palm, claw hay fingertip đều có lựa chọn đáng thử.",
    highlight:
      "Đa dạng kích cỡ: Beast X, Superlight, DeathAdder... Sensor xịn bắt trọn từng cử động.",
  },
  "ban-phim": {
    title: "Bàn Phím Cơ",
    headline: "Bàn Phím Cơ — Rapid Trigger, Gõ Êm, Chuẩn Gu",
    desc1:
      "Bàn phím đúng layout, switch mượt mà và cảm giác gõ đầm chắc. Cho trải nghiệm gaming phản xạ tức thì và làm việc thoải mái cả ngày dài.",
    desc2:
      "Đa dạng các loại switch cơ học và switch từ tính Magnetic HE hỗ trợ Rapid Trigger, keycap PBT cao cấp, kết nối linh hoạt 3 chế độ có dây, Bluetooth và 2.4GHz.",
    highlight:
      "Layout phong phú từ 60%, 65%, 75%, TKL đến Fullsize đáp ứng mọi nhu cầu.",
  },
  "tai-nghe": {
    title: "Tai Nghe Gaming",
    headline: "Tai Nghe Gaming — Định Vị Chuẩn, Đeo Êm Ái",
    desc1:
      "Âm trường rộng, tái hiện rõ phương hướng tiếng bước chân và tiếng súng trong từng góc hẹp, giúp bạn luôn chủ động trong mọi tình huống giao tranh.",
    desc2:
      "Đệm tai thoáng khí, headband ôm khít vừa vặn không gây áp lực khi đeo lâu, micro lọc tạp âm rõ ràng cho đàm thoại đồng đội sắc nét.",
    highlight:
      "Kết nối không dây độ trễ siêu thấp 2.4GHz, hỗ trợ âm thanh vòm không gian 7.1.",
  },
  "lot-chuot": {
    title: "Lót Chuột Gaming",
    headline: "Lót Chuột Gaming — Speed & Control Cân Bằng",
    desc1:
      "Bề mặt vải dệt cao cấp mang lại cảm giác lướt êm ái, dừng chuột chuẩn xác ở từng pixel, tối ưu cho cả các tựa game FPS lẫn MOBA.",
    desc2:
      "Đế cao su Poron tự nhiên bám dính chắc chắn vào mặt bàn, bo viền tỉ mỉ chống rách sờn sau thời gian dài sử dụng cường độ cao.",
    highlight:
      "Kích thước đa dạng từ form chuẩn thi đấu đến cỡ lớn Deskmat trải rộng bàn làm việc.",
  },
  ghe: {
    title: "Ghế Gaming & Công Thái Học",
    headline: "Ghế Gaming — Ngồi Đúng Tư Thế, Chơi Đủ Dài",
    desc1:
      "Nâng đỡ toàn diện cột sống, thắt lưng và cổ, giúp bạn ngồi chơi game hoặc làm việc bền bỉ hàng giờ liền mà không bị đau mỏi.",
    desc2:
      "Piston Class 4 chứng nhận an toàn, cơ chế ngả lưng linh hoạt, đệm mút đúc nguyên khối chống xẹp lún theo thời gian.",
    highlight:
      "Tay vịn điều chỉnh 4D và đệm đỡ thắt lưng công thái học tùy chỉnh linh hoạt.",
  },
  "phu-kien-cong-thai-hoc": {
    title: "Phụ Kiện Công Thái Học",
    headline: "Phụ Kiện — Tối Ưu Từng Chi Tiết Góc Máy",
    desc1:
      "Những chi tiết nhỏ tinh tế giúp góc máy gọn gàng, bảo vệ cổ tay, khớp vai và tối ưu tư thế làm việc hàng ngày.",
    desc2:
      "Kê tay đệm êm ái, giá treo tai nghe, feet chuột PTFE cao cấp và các giải pháp đi dây âm bàn tiện lợi.",
    highlight:
      "Vật liệu cao cấp, gia công chính xác, nâng cao độ bền và thẩm mỹ góc setup.",
  },
  soundcard: {
    title: "Soundcard & DAC/AMP",
    headline: "Soundcard — Nâng Tầm Chất Lượng Âm Thanh",
    desc1:
      "Tách bạch chi tiết âm thanh và khuếch đại uy lực cho tai nghe của bạn, tái hiện rõ từng dải âm trong game và âm nhạc.",
    desc2:
      "Chip giải mã âm thanh cao cấp, hỗ trợ khử ồn micro chủ động và giả lập âm thanh vòm đa hướng.",
    highlight:
      "Cắm là chạy (Plug & Play), tương thích hoàn hảo với PC, laptop và máy chơi game console.",
  },
  ban: {
    title: "Bàn Gaming & Bàn Làm Việc",
    headline: "Bàn Gaming — Vững Chắc, Rộng Rãi, Gọn Gàng",
    desc1:
      "Mặt bàn rộng rãi chịu tải trọng lớn, khung thép sơn tĩnh điện vững chãi không rung lắc ngay cả khi thao tác mạnh tay.",
    desc2:
      "Thiết kế vát cạnh công thái học, tích hợp rãnh đi dây âm bàn và các phụ kiện gắn kèm tiện lợi.",
    highlight:
      "Mặt bàn phủ melamine chống trầy xước, chống bám nước và dễ dàng vệ sinh.",
  },
  "arm-man-hinh": {
    title: "Arm Màn Hình",
    headline: "Arm Màn Hình — Giải Phóng Không Gian Góc Máy",
    desc1:
      "Nâng hạ, xoay lật màn hình linh hoạt theo đúng tầm mắt giúp chống mỏi cổ và mở rộng tối đa diện tích mặt bàn.",
    desc2:
      "Piston trợ lực khí nén mượt mà, kẹp bàn chắc chắn, hỗ trợ chuẩn VESA 75x75 và 100x100 phổ biến.",
    highlight:
      "Chịu tải trọng ấn tượng, tích hợp khe luồn dây cáp màn hình tinh tế.",
  },
  "gaming-gear": {
    title: "Gaming Gear",
    headline: "Gaming Gear — Chuột, Bàn Phím, Lót Chuột, Tai Nghe",
    desc1:
      "Bộ bốn quyết định phản xạ trong mỗi pha giao tranh: chuột nhẹ đúng form, bàn phím switch mượt, lót chuột cân bằng speed và control, tai nghe định vị chuẩn.",
    desc2:
      "Toàn bộ hàng chính hãng từ Pulsar, Razer, Logitech, Wooting, Keychron, HyperX và nhiều hãng khác, đủ dải giá từ phổ thông đến cao cấp.",
    highlight:
      "Xem gộp theo nhóm hoặc đi sâu vào từng danh mục: Chuột, Bàn phím, Lót chuột, Tai nghe.",
  },
  "office-gear": {
    title: "Office Gear",
    headline: "Office Gear — Ghế, Bàn, Phụ Kiện Công Thái Học",
    desc1:
      "Góc làm việc bền vững: ghế nâng đỡ cột sống, bàn rộng chịu lực tốt, arm màn hình chỉnh đúng tầm mắt và phụ kiện giảm tải cho cổ tay, vai.",
    desc2:
      "Ghế công thái học, bàn gaming và bàn làm việc, arm màn hình chuẩn VESA, soundcard cùng phụ kiện kê tay, kê chân, đệm thắt lưng.",
    highlight:
      "Chọn cả nhóm hoặc lọc theo từng danh mục: Ghế, Phụ kiện, Bàn, Soundcard, Arm màn hình.",
  },
};

const DEFAULT_HERO = {
  title: "Tất cả sản phẩm",
  headline: "Gaming Gear — Gọn Gàng, Chuẩn Gu, Chuẩn Form",
  desc1:
    "Chuột, bàn phím, tai nghe, ghế và lót chuột chính hãng với đầy đủ thông số chi tiết để bạn dễ dàng lựa chọn sản phẩm phù hợp nhất.",
  desc2:
    "Lọc theo danh mục, thương hiệu yêu thích hoặc tìm kiếm bằng mô tả để chọn được món đồ ưng ý cho góc máy chơi game.",
  highlight:
    "Cam kết 100% hàng chính hãng, giao hàng toàn quốc và hỗ trợ bảo hành tận tình.",
};

export function CategoryBanner({
  category,
  recommendation,
}: {
  category?: Pick<Category, "slug" | "name"> | null;
  recommendation: { product: Product; title: string } | null;
}) {
  const info = (category?.slug ? CATEGORY_HERO_INFO[category.slug] : null) ?? {
    ...DEFAULT_HERO,
    title: category?.name ?? DEFAULT_HERO.title,
    headline: category?.name
      ? `${category.name} — Thiết Kế Chuẩn Gu, Chính Hãng`
      : DEFAULT_HERO.headline,
  };

  const imageSrc = resolveImage(recommendation?.product.imageUrl);

  return (
    <section className="relative w-full overflow-hidden bg-[#0b101b] text-white">
      {/* Ảnh nền tràn sát hai cạnh như hero trang chủ, tối dần về phía chữ */}
      {imageSrc ? (
        <div className="absolute inset-0">
          <Image
            src={imageSrc}
            alt={category?.name ?? "Gear Shop"}
            fill
            priority
            sizes="100vw"
            unoptimized={imageSrc.startsWith("http:")}
            className="object-cover object-center opacity-60 md:opacity-80"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#0b101b] via-[#0b101b]/75 to-[#0b101b]/35 md:bg-gradient-to-r md:from-[#0b101b] md:via-[#0b101b]/70 md:to-transparent"
            aria-hidden="true"
          />
        </div>
      ) : (
        <div className="absolute -right-8 -top-8 size-80 opacity-10">
          <CategoryArt slug={category?.slug} className="size-full text-white" />
        </div>
      )}

      <Container className="relative z-10 flex h-[calc(100svh-19rem)] min-h-[26rem] max-h-[46rem] flex-col justify-center py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        {/* Box giới thiệu phong cách kính mờ */}
        <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#121927]/80 p-5 backdrop-blur-md sm:p-7">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
            {info.headline}
          </h1>

          <div className="mt-4 grid gap-3 text-xs leading-relaxed text-white/80 sm:grid-cols-2 sm:text-sm">
            <p>{info.desc1}</p>
            <p>{info.desc2}</p>
          </div>

          {info.highlight ? (
            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 sm:text-base">
              {info.highlight}
            </div>
          ) : null}
        </div>

        {recommendation ? (
          <div className="shrink-0">
            <Link
              href={`/san-pham/${recommendation.product.id}`}
              className="group flex items-center gap-3.5 rounded-xl border border-white/15 bg-[#121927]/90 p-3 shadow-2xl backdrop-blur-md transition-all hover:border-white/30 hover:bg-[#1a2438]"
            >
              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-white/10">
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt=""
                    fill
                    sizes="48px"
                    unoptimized={imageSrc.startsWith("http:")}
                    className="object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <CategoryArt slug={category?.slug} className="size-6 text-white/40" />
                  </div>
                )}
              </div>
              <div className="min-w-0 pr-2">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/60">
                  {recommendation.title}
                </span>
                <span className="block max-w-[200px] truncate text-sm font-medium text-white sm:max-w-[260px]">
                  {recommendation.product.name}
                </span>
                <span className="block text-xs font-semibold text-white/60">
                  {money(recommendation.product.price)}
                </span>
              </div>
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors group-hover:bg-accent group-hover:text-accent-text">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3.5"
                  aria-hidden="true"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </Link>
          </div>
        ) : null}
        </div>
      </Container>
    </section>
  );
}
