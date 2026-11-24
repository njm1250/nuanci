// 플레이 스토어 안드로이드 앱(TWA)이 이 사이트의 주인이라는 증명. /.well-known/assetlinks.json으로 rewrite돼 나간다.
// 지문이 맞아야 앱이 주소창 없이 전체 화면으로 열린다. 업로드 키 지문과, 첫 업로드 뒤 Play Console(앱 무결성 > 앱 서명)에 나오는
// Play 앱 서명 키 지문을 둘 다 둔다. 지문은 공개 정보라 코드에 둔다
const PACKAGE = "app.nuanci";
const FINGERPRINTS = [
  // 업로드 키(~/.android-keys/nuanci-upload.jks)
  "8F:79:C7:21:C1:A1:88:F9:B0:66:62:41:37:70:3A:97:28:0F:27:B0:B7:05:C6:4D:C2:EC:2C:F9:CD:FC:84:15",
  // Play 앱 서명 키(Play Console > Google Play로 보호됨 > Play 앱 서명 > 기존 키). Play에서 받은 앱은 이 키로 서명된다
  "8E:BB:2F:0B:DD:0D:6A:36:F4:B7:7D:3D:AD:FD:64:48:73:FB:6E:6F:3A:2A:24:2A:7A:7F:78:2F:A6:71:38:03",
  // Play 앱 서명의 양자 내성 키. 최신 기기에는 이 키로 서명된 앱이 내려갈 수 있다
  "5A:FA:47:5F:23:71:47:64:BF:DD:F4:05:67:B0:CE:01:A1:A4:8A:B2:3B:D5:49:F8:53:06:BE:D1:98:12:97:C8",
  ...(process.env.ANDROID_SIGNING_SHA256 ?? "").split(",").map((s) => s.trim()).filter(Boolean),
];

export function GET() {
  return Response.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: PACKAGE, sha256_cert_fingerprints: FINGERPRINTS },
    },
  ]);
}
