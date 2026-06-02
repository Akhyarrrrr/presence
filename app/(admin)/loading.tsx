import { Skeleton, Surface } from '@/components/ui/presence-ui'

export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading workspace" className="space-y-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-11 w-72 max-w-full" />
        <Skeleton className="h-4 w-[32rem] max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Surface key={index} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-8 w-16" />
                <Skeleton className="mt-4 h-3 w-36 max-w-full" />
              </div>
              <Skeleton className="h-10 w-10" />
            </div>
          </Surface>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Surface className="p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-3 w-64 max-w-full" />
          <Skeleton className="mt-7 h-64 w-full" />
        </Surface>
        <Surface className="p-5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-3 h-3 w-56 max-w-full" />
          <div className="mt-7 space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        </Surface>
      </div>
    </div>
  )
}
