CREATE TABLE "ad_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "smartlinkUrl" TEXT,
    "nativeBannerCode" TEXT,
    "nativeBannerScriptSrc" TEXT,
    "nativeBannerContainerId" TEXT,
    "rewardAdsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "nativeBannerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "chapterGateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ad_settings" (
    "id",
    "smartlinkUrl",
    "nativeBannerCode",
    "nativeBannerScriptSrc",
    "nativeBannerContainerId",
    "rewardAdsEnabled",
    "nativeBannerEnabled",
    "chapterGateEnabled"
) VALUES (
    1,
    'https://www.profitablecpmratenetwork.com/ni7wuaw7?key=427193865a33189ad265257631962c82',
    '<script async="async" data-cfasync="false" src="https://pl29296888.profitablecpmratenetwork.com/fb61445035348c55835c05d9c8c6db17/invoke.js"></script>
<div id="container-fb61445035348c55835c05d9c8c6db17"></div>',
    'https://pl29296888.profitablecpmratenetwork.com/fb61445035348c55835c05d9c8c6db17/invoke.js',
    'container-fb61445035348c55835c05d9c8c6db17',
    true,
    true,
    true
)
ON CONFLICT ("id") DO NOTHING;
