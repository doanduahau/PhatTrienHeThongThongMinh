import { NAV_GROUPS } from "@/lib/nav-data";
import { Header } from "./header";

/** Server component: render Header với mega-menu tĩnh + link trang thông tin. */
export function HeaderShell() {
  return <Header nav={NAV_GROUPS} />;
}
