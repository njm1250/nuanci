import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/features/admin/cookie";
import { BACKEND, SCENES_TAG } from "@/features/scene/api";

// 스크립트(push-scene.sh)로 장면을 올린 뒤 부른다. 관리자 화면을 거치지 않아도 공개 화면이 바로 새 장면을 보여 준다
export async function POST() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const res = await fetch(`${BACKEND}/api/admin/session`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) return new Response(null, { status: 401 });
  revalidateTag(SCENES_TAG, { expire: 0 });
  return new Response(null, { status: 204 });
}
