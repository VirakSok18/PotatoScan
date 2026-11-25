import { ReaderSoundtrackProvider } from "@/components/ReaderSoundtrackContext";

export default async function ReadMangaLayout({
  params,
  children,
}: {
  params: Promise<{ mangaId: string }>;
  children: React.ReactNode;
}) {
  const { mangaId } = await params;
  const decodedMangaId = decodeURIComponent(mangaId);

  return (
    <ReaderSoundtrackProvider mangaId={decodedMangaId}>
      {children}
    </ReaderSoundtrackProvider>
  );
}
