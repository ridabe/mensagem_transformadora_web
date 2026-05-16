import { NextResponse } from "next/server";

const assetLinks = [
  {
    relation: [
      "delegate_permission/common.handle_all_urls",
      "delegate_permission/common.get_login_creds",
    ],
    target: {
      namespace: "android_app",
      package_name: "com.algoritmum.msgt",
      sha256_cert_fingerprints: [
        "BC:0F:A4:5C:C5:6B:8B:D6:73:E0:28:12:2E:2A:3F:68:52:99:32:A6:05:AF:62:30:1B:C9:CF:24:DD:73",
        "BC:0F:A4:5C:C5:6B:8B:D6:73:E0:28:12:2E:2A:3F:68:52:99:32:A6:05:AF:62:30:1B:C9:CF:24:DD:73:F3:D5",
      ],
    },
  },
];

export function GET() {
  return new NextResponse(JSON.stringify(assetLinks), {
    headers: { "Content-Type": "application/json" },
  });
}
