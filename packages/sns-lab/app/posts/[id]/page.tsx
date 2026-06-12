import { PostFormContent } from "@/components/posts/PostFormContent"

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  return <PostFormContent mode="edit" paramsPromise={params} />
}
