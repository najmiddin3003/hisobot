/** Har bir sahifa almashganda kontent yumshoq paydo bo'ladi (CSS — JS kutilmaydi) */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="flex animate-page-in flex-col gap-6">{children}</div>;
}
