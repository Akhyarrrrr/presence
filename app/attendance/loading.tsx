import { Skeleton, Surface } from '@/components/ui/presence-ui'

export default function AttendanceLoading() {
  return (
    <div aria-busy="true" aria-label="Loading attendance kiosk" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-14 w-[42rem] max-w-full" />
        <Skeleton className="h-4 w-[34rem] max-w-full" />
      </div>
      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
        <Surface className="p-3">
          <Skeleton className="aspect-video w-full" />
        </Surface>
        <Surface className="p-5">
          <Skeleton className="h-5 w-36" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        </Surface>
      </div>
    </div>
  )
}
