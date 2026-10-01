import { ExternalLink, Tv } from "lucide-react";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { youtubeEmbedUrl } from "@/shared/lib/utils";
import { EmptyState } from "@/shared/ui/States";

/** Embedded YouTube broadcast; a plain link when the URL can't be embedded. */
export function MatchBroadcast({ url, title }: { url: string; title: string }) {
  const { t } = useI18n();
  const embed = youtubeEmbedUrl(url);
  const link = (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline"
    >
      {t("match.openYoutube")}
      <ExternalLink size={13} />
    </a>
  );

  if (!embed) return <EmptyState icon={<Tv size={22} />} title={t("match.broadcast")} action={link} />;

  return (
    <div className="space-y-3 p-3 sm:p-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={embed}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <div className="flex justify-end px-1">{link}</div>
    </div>
  );
}
