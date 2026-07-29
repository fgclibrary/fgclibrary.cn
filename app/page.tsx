import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"

export default function Page() {
  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">格言格语</h1>
          <p>欢迎访问格言格语。</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href="/docs" className={buttonVariants()}>
              浏览项目文档
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
