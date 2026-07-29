import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"

export default function Page() {
  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">项目已就绪！</h1>
          <p>现在可以添加组件并开始构建。</p>
          <p>Fumadocs 文档系统已接入。</p>
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
