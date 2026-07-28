import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">项目已就绪！</h1>
          <p>现在可以添加组件并开始构建。</p>
          <p>项目已预先添加按钮组件。</p>
          <Button className="mt-2">按钮</Button>
        </div>
      </div>
    </div>
  )
}
