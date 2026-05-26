import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(pages)/news')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(pages)/news"!</div>
}
