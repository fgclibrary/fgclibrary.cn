import { IconPhoto } from "@tabler/icons-react"

type ImagePlaceholderProps = {
  title: string
  description?: string
  note?: string
}

export function ImagePlaceholder({
  title,
  description,
  note,
}: ImagePlaceholderProps) {
  return (
    <div className="my-6 overflow-hidden rounded-lg border border-dashed bg-fd-card text-fd-card-foreground">
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <span className="rounded-full border border-current px-2 py-0.5 text-xs text-fd-muted-foreground">
          图片占位
        </span>
        <div className="max-w-2xl">
          <div className="text-sm font-medium">{title}</div>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-fd-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <IconPhoto
          aria-hidden="true"
          className="size-7 text-fd-muted-foreground"
        />
      </div>
      {note ? (
        <div className="border-t px-5 py-2 text-xs leading-5 text-fd-muted-foreground">
          {note}
        </div>
      ) : null}
    </div>
  )
}
